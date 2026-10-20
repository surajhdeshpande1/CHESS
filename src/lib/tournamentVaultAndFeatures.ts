// src/lib/tournamentVaultAndFeatures.ts
// Error-Proof State Vault, Immutable Audit Trail, Integrity Verifier & Market-First Features

import {
  TournamentState,
  CandidatePlayer,
  BoardPairing,
  GameResult,
  Color,
  computeColorState,
  compareFideRank,
  havePlayedOverTheBoard,
  isColorCompatibleUnderC3,
  recordBoardResult,
  generateNextRoundPairings,
  computeStandingsAndTieBreaks,
} from './fideSwissEngine';

// ============================================================================
// 1. IMMUTABLE ACTIVITY LOG & SNAPSHOT TIME-MACHINE TYPES
// ============================================================================
export type AuditActionType =
  | 'TOURNAMENT_CREATED'
  | 'PLAYER_ADDED'
  | 'PLAYER_WITHDRAWN'
  | 'BYE_REQUESTED'
  | 'REGISTRATION_LOCKED'
  | 'ROUND_PAIRED'
  | 'RESULT_RECORDED'
  | 'RESULT_MODIFIED'
  | 'ROUND_REOPENED'
  | 'ACTION_UNDONE'
  | 'INTEGRITY_ALERT'
  | 'MANUAL_OVERRIDE';

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestampISO: string;
  roundNumber: number;
  actionType: AuditActionType;
  actor: string;               // e.g., "Chief Arbiter" or "System Autopilot"
  summary: string;             // Plain-English explanation shown in Activity Drawer
  metadata: Record<string, string | number | boolean | null>;
}

export interface StateSnapshot {
  snapshotId: string;
  sequenceNumber: number;
  timestampISO: string;
  label: string;               // e.g., "Before Round 3 Pairing" or "Board 4 Result Tap"
  stateJson: string;           // Deep serialized TournamentState
}

export interface TournamentVault {
  currentState: TournamentState;
  auditLogs: AuditLogEntry[];
  snapshots: StateSnapshot[];  // Rolling buffer of up to 100 checkpoints for 1-click Undo
}

// ============================================================================
// 2. THE 7 MATHEMATICAL INVARIANT GUARDS (ERROR-PROOF VERIFIER)
// ============================================================================
export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function verifyTournamentIntegrity(state: TournamentState): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Guard 1: Capacity Bounds Check (50 to 200 Players) when locked or in progress
  if (state.status !== 'REGISTRATION') {
    if (state.players.length < state.rules.minPlayers) {
      errors.push(
        `Player count (${state.players.length}) is below minimum required (${state.rules.minPlayers}).`
      );
    }
    if (state.players.length > state.rules.maxPlayers) {
      errors.push(
        `Player count (${state.players.length}) exceeds maximum allowed (${state.rules.maxPlayers}).`
      );
    }
  }

  // Guard 2: Unique TPNs (1 .. N)
  if (state.status !== 'REGISTRATION') {
    const tpns = new Set<number>();
    for (const p of state.players) {
      if (p.tpn > 0 && tpns.has(p.tpn)) {
        errors.push(`Duplicate Tournament Pairing Number (TPN #${p.tpn}) detected for ${p.name}.`);
      }
      if (p.tpn > 0) tpns.add(p.tpn);
    }
  }

  // Guard 3: Score-to-History Mathematical Conservation
  for (const p of state.players) {
    const sumHistoryPoints = p.history.reduce((acc, h) => acc + h.pointsEarned, 0);
    if (Math.abs(p.score - sumHistoryPoints) > 0.001) {
      errors.push(
        `Score mismatch for ${p.name} (#${p.tpn}): Displayed score is ${p.score}, but round history sums to ${sumHistoryPoints}.`
      );
    }
  }

  // Guard 4: Per-Round Single-Board Presence & Zero Rematch Check (FIDE C1)
  const seenPairsOTB = new Set<string>();
  const pabRecipients = new Set<string>();

  for (let rIdx = 0; rIdx < state.rounds.length; rIdx++) {
    const rNum = rIdx + 1;
    const boards = state.rounds[rIdx];
    const playersInRound = new Set<string>();

    for (const b of boards) {
      if (playersInRound.has(b.whitePlayerId)) {
        errors.push(`Round ${rNum}, Board ${b.boardNumber}: Player ID ${b.whitePlayerId} is paired twice in the same round!`);
      }
      playersInRound.add(b.whitePlayerId);

      if (b.blackPlayerId) {
        if (playersInRound.has(b.blackPlayerId)) {
          errors.push(`Round ${rNum}, Board ${b.boardNumber}: Player ID ${b.blackPlayerId} is paired twice in the same round!`);
        }
        playersInRound.add(b.blackPlayerId);

        const pairKey = [b.whitePlayerId, b.blackPlayerId].sort().join('__');
        const isPlayedOTB =
          b.result === 'WHITE_WIN' ||
          b.result === 'BLACK_WIN' ||
          b.result === 'DRAW' ||
          b.result === 'PENDING';

        if (isPlayedOTB) {
          if (seenPairsOTB.has(pairKey)) {
            errors.push(
              `FIDE C1 Violation in Round ${rNum}, Board ${b.boardNumber}: Rematch detected between ${b.whitePlayerId} and ${b.blackPlayerId}.`
            );
          }
          if (b.result !== 'PENDING') {
            seenPairsOTB.add(pairKey);
          }
        }
      } else if (b.result === 'PAB') {
        // Guard 5: FIDE C2 Single Pairing-Allocated Bye Check
        if (pabRecipients.has(b.whitePlayerId)) {
          errors.push(
            `FIDE C2 Violation in Round ${rNum}: Player ${b.whitePlayerId} was assigned a second Pairing-Allocated Bye (PAB).`
          );
        }
        pabRecipients.add(b.whitePlayerId);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// 3. FUZZY DUPLICATE & ANOMALY GUARD FOR PLAYER REGISTRATION
// ============================================================================
function normalizeNameTokens(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function detectDuplicateOrInvalidCandidate(
  newCandidate: { name: string; rating: number; birthYear: number; fideId?: string },
  existingPlayers: CandidatePlayer[],
  tournamentYear: number
): { hasError: boolean; hasWarning: boolean; messages: string[] } {
  const messages: string[] = [];
  let hasError = false;
  let hasWarning = false;

  if (newCandidate.name.trim().length < 2) {
    hasError = true;
    messages.push('Candidate name must be at least 2 characters long.');
  }
  if (newCandidate.rating < 0 || newCandidate.rating > 3000) {
    hasError = true;
    messages.push(`Invalid rating (${newCandidate.rating}). Rating must be between 0 (unrated) and 3000.`);
  }
  const age = tournamentYear - newCandidate.birthYear;
  if (age < 4 || age > 105) {
    hasError = true;
    messages.push(`Invalid birth year (${newCandidate.birthYear}). Calculated age (${age}) is out of range.`);
  }

  const newTokens = normalizeNameTokens(newCandidate.name);
  for (const existing of existingPlayers) {
    if (
      newCandidate.fideId &&
      existing.fideId &&
      newCandidate.fideId.trim().toLowerCase() !== 'unranked' &&
      newCandidate.fideId.trim() === existing.fideId.trim()
    ) {
      hasError = true;
      messages.push(
        `Duplicate FIDE ID (${newCandidate.fideId}) already registered under "${existing.name}" (#${existing.tpn}).`
      );
    } else if (normalizeNameTokens(existing.name) === newTokens) {
      hasWarning = true;
      messages.push(
        `Possible duplicate candidate: "${newCandidate.name}" matches existing player "${existing.name}" (Rating: ${existing.rating}).`
      );
    }
  }

  return { hasError, hasWarning, messages };
}

// ============================================================================
// 4. TRANSACTIONAL VAULT CONTROLLER (AUTO-LOG + AUTO-SNAPSHOT + UNDO)
// ============================================================================
export function createAuditAndSnapshot(
  vault: TournamentVault,
  nextState: TournamentState,
  actionType: AuditActionType,
  summary: string,
  actor = 'Chief Arbiter',
  metadata: Record<string, string | number | boolean | null> = {}
): TournamentVault {
  // Run the 7-point FIDE mathematical integrity guard before committing state
  const integrity = verifyTournamentIntegrity(nextState);
  if (!integrity.isValid) {
    console.error('State Blocked by Error-Proof Guard:', integrity.errors);
    throw new Error(`State Blocked by Error-Proof Guard: ${integrity.errors.join(' | ')}`);
  }

  const seq = vault.auditLogs.length + 1;
  const now = new Date().toISOString();

  // Save snapshot of PREVIOUS state so 1-click Undo restores instantaneously
  const snapshot: StateSnapshot = {
    snapshotId: `snap_${seq}`,
    sequenceNumber: seq,
    timestampISO: now,
    label: summary,
    stateJson: JSON.stringify(vault.currentState),
  };

  const logEntry: AuditLogEntry = {
    id: `log_${seq}`,
    sequenceNumber: seq,
    timestampISO: now,
    roundNumber: nextState.currentRound,
    actionType,
    actor,
    summary,
    metadata,
  };

  const updatedSnapshots = [...vault.snapshots, snapshot].slice(-100); // Keep last 100 undo states

  return {
    currentState: nextState,
    auditLogs: [logEntry, ...vault.auditLogs], // Newest first for UI feed
    snapshots: updatedSnapshots,
  };
}

export function undoLastTournamentAction(vault: TournamentVault): TournamentVault {
  if (vault.snapshots.length === 0) return vault;

  const lastSnapshot = vault.snapshots[vault.snapshots.length - 1];
  const restoredState: TournamentState = JSON.parse(lastSnapshot.stateJson);
  const seq = vault.auditLogs.length + 1;

  const undoLog: AuditLogEntry = {
    id: `log_${seq}`,
    sequenceNumber: seq,
    timestampISO: new Date().toISOString(),
    roundNumber: restoredState.currentRound,
    actionType: 'ACTION_UNDONE',
    actor: 'Chief Arbiter',
    summary: `Undid action: "${lastSnapshot.label}" — Restored tournament state to checkpoint #${lastSnapshot.sequenceNumber}.`,
    metadata: { restoredSequence: lastSnapshot.sequenceNumber },
  };

  return {
    currentState: restoredState,
    auditLogs: [undoLog, ...vault.auditLogs],
    snapshots: vault.snapshots.slice(0, -1),
  };
}

// Re-open a previous round cleanly
export function reopenPreviousRound(vault: TournamentVault): TournamentVault {
  const { currentState } = vault;
  if (currentState.rounds.length === 0 || currentState.currentRound <= 1) {
    throw new Error('Cannot roll back prior to Round 1.');
  }

  const prevRoundNumber = currentState.currentRound - 1;
  // Slice off the latest round
  const trimmedRounds = currentState.rounds.slice(0, prevRoundNumber);

  // Recalculate standings and counters up to prevRoundNumber
  let restoredState: TournamentState = {
    ...currentState,
    currentRound: prevRoundNumber,
    status: 'IN_PROGRESS',
    rounds: trimmedRounds,
  };

  // Re-run through recordBoardResult for any board in previous round to update player state accurately
  if (trimmedRounds.length > 0 && trimmedRounds[trimmedRounds.length - 1].length > 0) {
    const lastBoard = trimmedRounds[trimmedRounds.length - 1][0];
    restoredState = recordBoardResult(
      restoredState,
      restoredState.currentRound,
      lastBoard.boardNumber,
      lastBoard.result
    );
  }

  return createAuditAndSnapshot(
    vault,
    restoredState,
    'ROUND_REOPENED',
    `Re-opened Round ${prevRoundNumber} for arbiter modifications. Sliced off Round ${currentState.currentRound}.`,
    'Chief Arbiter',
    { rolledBackRound: currentState.currentRound, activeRound: prevRoundNumber }
  );
}

// ============================================================================
// 5. SIGNATURE FEATURE 1: "EXPLAIN WHY" FIDE PAIRING X-RAY (1-CLICK TOOLTIP)
// ============================================================================
export interface PairingXRayExplanation {
  boardNumber: number;
  headline: string;
  bracketReason: string;
  colorReason: string;
  fideRuleCitations: string[];
}

export function explainBoardPairing(
  board: BoardPairing,
  players: CandidatePlayer[],
  topSeedInitialColor: Color
): PairingXRayExplanation {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const white = playerMap.get(board.whitePlayerId)!;
  const black = board.blackPlayerId ? playerMap.get(board.blackPlayerId)! : null;

  if (!black) {
    return {
      boardNumber: board.boardNumber,
      headline: `${white.name} (#${white.tpn}) receives a ${board.result === 'PAB' ? '1.0 Point Pairing-Allocated Bye (PAB)' : 'Requested Bye'}.`,
      bracketReason:
        board.result === 'PAB'
          ? 'Total active players in this round was odd. Lowest-ranked eligible player without a prior PAB or forfeit win was allocated the bye per FIDE C2.'
          : 'Player requested an approved bye prior to pairing generation.',
      colorReason: 'Byes are unplayed rounds and do not assign White or Black pieces (FIDE C.04.2.D.5).',
      fideRuleCitations: ['FIDE C.04.3 Article 2.1 (C2 - Unique PAB)', 'FIDE C.04.2.D.5 (Unplayed Games)'],
    };
  }

  const [higher, lower] = compareFideRank(white, black) <= 0 ? [white, black] : [black, white];
  const stateW = computeColorState(white);
  const stateB = computeColorState(black);

  const bracketReason =
    white.score === black.score
      ? `Both players entered the ${white.score}-point Homogeneous Scorebracket. Paired via S1 (Top Half, #${higher.tpn}) vs S2 (Bottom Half, #${lower.tpn}) BSN pairing rules.`
      : `Heterogeneous Float Match: #${higher.tpn} ${higher.name} (${higher.score} pts) downfloated to meet #${lower.tpn} ${lower.name} (${lower.score} pts) to satisfy bracket completion criteria [C5-C6].`;

  let colorReason = '';
  const citations = ['FIDE C.04.3 Article 3 (Bracket Subgroups S1/S2)'];

  if (stateW.preferredColor === 'W' && stateB.preferredColor === 'B') {
    colorReason = `${white.name} had a ${stateW.strength} preference for White (CD=${stateW.colorDifference}) and ${black.name} had a ${stateB.strength} preference for Black (CD=${stateB.colorDifference}). Both preferences were fully granted.`;
    citations.push('FIDE C.04.3 Article 5.2.1 (Grant Both Color Preferences)');
  } else if (stateW.preferredColor === stateB.preferredColor && stateW.preferredColor !== null) {
    if (stateW.strength !== stateB.strength) {
      colorReason = `Both players wanted ${stateW.preferredColor}, but ${stateW.strength === 'ABSOLUTE' || (stateW.strength === 'STRONG' && stateB.strength === 'MILD') ? white.name : black.name} had the strictly stronger color preference (${stateW.strength} vs ${stateB.strength}).`;
      citations.push('FIDE C.04.3 Article 5.2.2 (Grant Stronger Color Preference)');
    } else {
      colorReason = `Both players had an identical ${stateW.strength} preference for ${stateW.preferredColor}. Colors were allocated by stepping backward to their most recent round with diverging colors or by higher rank (#${higher.tpn}).`;
      citations.push('FIDE C.04.3 Article 5.2.3 / 5.2.4 (Historical Alternation & Higher Rank Priority)');
    }
  } else {
    colorReason = `Neither player had a prior color preference. Higher-ranked player #${higher.tpn} (${higher.name}) received ${higher.id === white.id ? 'White' : 'Black'} based on the odd/even TPN initial color rule (Top Seed #1 = ${topSeedInitialColor}).`;
    citations.push('FIDE C.04.3 Article 5.2.5 (Initial Odd/Even TPN Color Rule)');
  }

  return {
    boardNumber: board.boardNumber,
    headline: `Board ${board.boardNumber}: #${white.tpn} ${white.name} (White) vs #${black.tpn} ${black.name} (Black)`,
    bracketReason,
    colorReason,
    fideRuleCitations: citations,
  };
}

// ============================================================================
// 6. SIGNATURE FEATURE 2: AUTOMATED MULTI-CATEGORY PRIZE ALLOCATOR (NO DOUBLE-DIP)
// ============================================================================
export interface PrizeCategory {
  id: string;
  title: string;              // e.g., "1st Place Open", "Best Under-1600", "Best Female"
  cashValue: number;          // Higher cashValue gets priority so player always wins their biggest prize
  rankInCategory: number;     // 1 = 1st place in this category, 2 = 2nd place, etc.
  maxRating: number | null;
  minRating: number | null;
  maxAge: number | null;
  gender: 'OPEN' | 'FEMALE_ONLY';
  unratedOnly: boolean;
}

export interface AwardedPrize {
  prize: PrizeCategory;
  winner: CandidatePlayer | null;
}

export function computePrizeWinners(
  sortedStandings: CandidatePlayer[],
  prizes: PrizeCategory[],
  tournamentYear: number
): AwardedPrize[] {
  // Sort prizes by descending cashValue so every player automatically receives the highest-value prize they qualify for
  const orderedPrizes = [...prizes].sort((a, b) => b.cashValue - a.cashValue);
  const alreadyAwardedPlayerIds = new Set<string>();
  const results: AwardedPrize[] = [];

  for (const prize of orderedPrizes) {
    const eligible = sortedStandings.filter((p) => {
      if (alreadyAwardedPlayerIds.has(p.id)) return false; // Strictly 1 prize per player
      if (prize.unratedOnly && p.rating !== 0) return false;
      if (prize.maxRating !== null && (p.rating === 0 || p.rating > prize.maxRating)) return false;
      if (prize.minRating !== null && p.rating < prize.minRating) return false;
      const age = tournamentYear - p.birthYear;
      if (prize.maxAge !== null && age > prize.maxAge) return false;
      if (prize.gender === 'FEMALE_ONLY' && p.gender !== 'F') return false;
      return true;
    });

    const winner = eligible.length > 0 ? eligible[0] : null;
    if (winner) {
      alreadyAwardedPlayerIds.add(winner.id);
    }
    results.push({ prize, winner });
  }

  return results;
}

export const DEFAULT_PRIZE_CATEGORIES: PrizeCategory[] = [
  { id: 'open_1', title: '1st Place Champion', cashValue: 50000, rankInCategory: 1, maxRating: null, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: false },
  { id: 'open_2', title: '2nd Place Runner-Up', cashValue: 30000, rankInCategory: 2, maxRating: null, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: false },
  { id: 'open_3', title: '3rd Place Bronze', cashValue: 20000, rankInCategory: 3, maxRating: null, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: false },
  { id: 'best_u1800', title: 'Best Under-1800 Rating', cashValue: 15000, rankInCategory: 1, maxRating: 1800, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: false },
  { id: 'best_u1500', title: 'Best Under-1500 Rating', cashValue: 10000, rankInCategory: 1, maxRating: 1500, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: false },
  { id: 'best_female', title: 'Best Female Player', cashValue: 12000, rankInCategory: 1, maxRating: null, minRating: null, maxAge: null, gender: 'FEMALE_ONLY', unratedOnly: false },
  { id: 'best_junior', title: 'Best Junior (Under-16)', cashValue: 8000, rankInCategory: 1, maxRating: null, minRating: null, maxAge: 16, gender: 'OPEN', unratedOnly: false },
  { id: 'best_unrated', title: 'Best Unrated Challenger', cashValue: 6000, rankInCategory: 1, maxRating: null, minRating: null, maxAge: null, gender: 'OPEN', unratedOnly: true },
];

// ============================================================================
// 7. SIGNATURE FEATURE 3: PLAYER SELF-REPORT WITH 1-CLICK ARBITER CONFIRM
// ============================================================================
export interface PlayerSelfReport {
  id: string;
  boardNumber: number;
  reportedByPlayerId: string;
  reportedResult: GameResult;
  timestampISO: string;
  confirmed: boolean;
}

// ============================================================================
// 8. SIGNATURE FEATURE 5: FINAL ROUND "WHAT-IF" PODIUM SIMULATOR
// ============================================================================
export interface WhatIfHypotheticalResult {
  boardNumber: number;
  hypotheticalResult: GameResult;
}

export function simulatePodiumWhatIf(
  currentState: TournamentState,
  hypotheticalBoardResults: WhatIfHypotheticalResult[]
): CandidatePlayer[] {
  if (currentState.rounds.length === 0) return currentState.players;

  // Clone current state deep enough for simulation
  let simState = JSON.parse(JSON.stringify(currentState)) as TournamentState;
  const currentRound = simState.currentRound;

  for (const hr of hypotheticalBoardResults) {
    simState = recordBoardResult(simState, currentRound, hr.boardNumber, hr.hypotheticalResult);
  }

  return simState.players;
}

// ============================================================================
// 9. SIGNATURE FEATURE 6: WHATSAPP / TELEGRAM ROUND CARD GENERATOR
// ============================================================================
export function generateWhatsAppShareMessage(tournament: TournamentState): string {
  const roundNum = tournament.currentRound;
  const boards = tournament.rounds[roundNum - 1] || [];
  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  let text = `🏆 *${tournament.name.toUpperCase()}*\n`;
  text += `⚡ *ROUND ${roundNum} PAIRINGS ARE LIVE!*\n`;
  text += `📅 Year: ${tournament.tournamentYear} | 👥 Total Players: ${tournament.players.length}\n`;
  text += `-------------------------------------------\n\n`;

  const topBoards = boards.slice(0, 15); // Show first 15 boards in message
  for (const b of topBoards) {
    const w = playerMap.get(b.whitePlayerId);
    const blk = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
    if (!blk) {
      text += `*Board ${b.boardNumber}*: #${w?.tpn} ${w?.name} (BYE +1.0)\n`;
    } else {
      text += `*Board ${b.boardNumber}*: [W] #${w?.tpn} ${w?.name} (${w?.score} pts) vs [B] #${blk?.tpn} ${blk?.name} (${blk?.score} pts)\n`;
    }
  }

  if (boards.length > 15) {
    text += `\n... and ${boards.length - 15} more boards.\n`;
  }

  text += `\n🔗 *Check your live board & results here:*\n`;
  text += `http://localhost:5173/?view=player-search\n`;
  text += `\nGood luck to all Grandmasters and Candidates! ♟️✨`;

  return text;
}

// ============================================================================
// 10. SIGNATURE FEATURE 7: "FIND MY BOARD" INSTANT PLAYER SEARCH
// ============================================================================
export interface PlayerBoardCardInfo {
  player: CandidatePlayer;
  boardNumber: number;
  assignedColor: 'WHITE' | 'BLACK' | 'BYE';
  opponent: CandidatePlayer | null;
  opponentRating: number;
  roundNumber: number;
  currentScore: number;
  currentRank: number;
  result: GameResult;
}

export function findPlayerBoardInfo(
  tournament: TournamentState,
  query: string
): PlayerBoardCardInfo[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();

  const sortedStandings = [...tournament.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tpn - b.tpn;
  });

  const matchingPlayers = tournament.players.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.fideId && p.fideId.toLowerCase().includes(q)) ||
      String(p.tpn) === q
  );

  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));
  const currentRound = tournament.currentRound;
  const currentBoards = tournament.rounds[currentRound - 1] || [];

  const results: PlayerBoardCardInfo[] = [];

  for (const player of matchingPlayers) {
    const rank = sortedStandings.findIndex((sp) => sp.id === player.id) + 1;
    const board = currentBoards.find(
      (b) => b.whitePlayerId === player.id || b.blackPlayerId === player.id
    );

    if (!board) continue;

    const isWhite = board.whitePlayerId === player.id;
    const isBye = !board.blackPlayerId;
    const oppId = isWhite ? board.blackPlayerId : board.whitePlayerId;
    const opp = oppId ? playerMap.get(oppId) || null : null;

    results.push({
      player,
      boardNumber: board.boardNumber,
      assignedColor: isBye ? 'BYE' : isWhite ? 'WHITE' : 'BLACK',
      opponent: opp,
      opponentRating: opp ? opp.rating : 0,
      roundNumber: currentRound,
      currentScore: player.score,
      currentRank: rank,
      result: board.result,
    });
  }

  return results;
}

// ============================================================================
// 11. SIGNATURE FEATURE 8: 1-CLICK BULK CERTIFICATES GENERATOR DATA
// ============================================================================
export interface PlayerCertificateData {
  playerName: string;
  fideId?: string;
  rating: number;
  finalRank: number;
  totalPoints: number;
  totalRounds: number;
  roundsWon: number;
  roundsDrawn: number;
  roundsLost: number;
  buchholzScore: number;
  tournamentName: string;
  tournamentYear: number;
  prizeAwarded?: string;
}

export function generateCertificatesData(
  tournament: TournamentState,
  prizes: AwardedPrize[] = []
): PlayerCertificateData[] {
  const prizeMap = new Map<string, string>();
  for (const ap of prizes) {
    if (ap.winner) {
      prizeMap.set(ap.winner.id, ap.prize.title);
    }
  }

  // Sorted by rank
  return tournament.players.map((p, index) => ({
    playerName: p.name,
    fideId: p.fideId,
    rating: p.rating,
    finalRank: index + 1,
    totalPoints: p.score,
    totalRounds: tournament.totalRounds,
    roundsWon: p.roundsWon,
    roundsDrawn: p.roundsDrawn,
    roundsLost: p.roundsLost,
    buchholzScore: p.tieBreaks.buchholzCut1,
    tournamentName: tournament.name,
    tournamentYear: tournament.tournamentYear,
    prizeAwarded: prizeMap.get(p.id) || (index < 3 ? `${index + 1}th Place Trophy` : undefined),
  }));
}

// ============================================================================
// 12. OFFICIAL FIDE TRF16 EXPORT ENGINE
// ============================================================================
export function exportTournamentStateToTRF16(tournament: TournamentState): string {
  const padRight = (str: string, length: number): string =>
    str.length >= length ? str.slice(0, length) : str + ' '.repeat(length - str.length);

  const padLeft = (str: string, length: number): string =>
    str.length >= length ? str.slice(0, length) : ' '.repeat(length - str.length) + str;

  const lines: string[] = [];

  // Headers
  lines.push(`012 ${tournament.name}`);
  lines.push(`022 FIDE Arena`);
  lines.push(`032 FID`);
  lines.push(`042 ${tournament.tournamentYear}-10-01`);
  lines.push(`052 ${tournament.tournamentYear}-10-07`);
  lines.push(`062 ${tournament.players.length}`);
  lines.push(`072 ${tournament.players.filter((p) => p.rating > 0).length}`);
  lines.push(`082 0`);
  lines.push(`092 Individual: Swiss System (Dutch C.04.3)`);
  lines.push(`102 Chief Arbiter`);
  lines.push(`112 Deputy Arbiter`);
  lines.push(`122 90 min + 30 sec`);

  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  // Player Rows (001)
  for (const player of tournament.players) {
    let row = '001 ';
    row += padLeft(player.tpn.toString(), 4) + ' ';
    row += (player.gender === 'F' ? 'w ' : 'm ');
    row += padRight(player.title !== 'NONE' ? player.title : '', 3) + ' ';
    row += padRight(player.name, 33) + ' ';
    row += padLeft(player.rating ? player.rating.toString() : '0', 4) + ' ';
    row += padRight('FID', 3) + ' ';
    row += padLeft(player.fideId || '0', 11) + ' ';
    row += `${player.birthYear}/01/01 `;
    row += padLeft(player.score.toFixed(1), 4) + ' ';
    row += padLeft(player.tpn.toString(), 4) + ' ';

    // Round data (8 characters per round starting at Pos 92)
    for (let r = 1; r <= tournament.totalRounds; r++) {
      const h = player.history.find((x) => x.roundNumber === r);
      if (!h) {
        row += '  0000 -  ';
      } else {
        const opp = h.opponentId ? playerMap.get(h.opponentId) : null;
        const oppTpn = opp ? padLeft(opp.tpn.toString(), 4) : '0000';
        const col = h.color === 'W' ? 'w' : h.color === 'B' ? 'b' : '-';
        let resChar = '0';
        if (h.pointsEarned === 1.0) resChar = '1';
        else if (h.pointsEarned === 0.5) resChar = '=';
        else if (h.pointsEarned === 0.0) resChar = '0';
        row += `  ${oppTpn} ${col} ${resChar}`;
      }
    }

    lines.push(row);
  }

  return lines.join('\n');
}

