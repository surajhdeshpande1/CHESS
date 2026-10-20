import {
  BoardPairing,
  ByeAllocation,
  Color,
  Player,
  Round,
  Tournament,
  TournamentSettings,
} from '../types/chess';
import { allocateColors } from './colorAllocation';
import { updatePlayerDynamicStats } from './colorEngine';
import {
  evaluatePairColorQuality,
  hasAbsoluteColorClash,
  hasPlayedOTB,
  isEligibleForPAB,
  validatePair,
} from './fideCriteria';
import { Edge, maxWeightMatching } from './matching';
import { comparePlayersDynamicRank, sortPlayersDynamicRank } from './ranking';

/**
 * Module 8: Board Number Sorting (FIDE C.04.2.D.9)
 * Sorts all paired boards in descending priority:
 * Key 1 — Highest Score in the pair: max(Score(W), Score(B)) Descending
 * Key 2 — Combined Score in the pair: Score(W) + Score(B) Descending
 * Key 3 — Best Initial Rank in the pair: higher-ranked player's TPN Ascending
 */
export function sortBoards(
  pairings: { white: Player; black: Player }[]
): { white: Player; black: Player }[] {
  return [...pairings].sort((a, b) => {
    const maxScoreA = Math.max(a.white.score, a.black.score);
    const maxScoreB = Math.max(b.white.score, b.black.score);
    if (maxScoreB !== maxScoreA) {
      return maxScoreB - maxScoreA;
    }

    const sumScoreA = a.white.score + a.black.score;
    const sumScoreB = b.white.score + b.black.score;
    if (sumScoreB !== sumScoreA) {
      return sumScoreB - sumScoreA;
    }

    const bestTpnA = Math.min(a.white.tpn, a.black.tpn);
    const bestTpnB = Math.min(b.white.tpn, b.black.tpn);
    return bestTpnA - bestTpnB;
  });
}

/**
 * Applies Baku Acceleration (FIDE C.04.7) virtual points for rounds 1-3.
 */
export function applyBakuAcceleration(
  players: Player[],
  round: number,
  enable: boolean
): Player[] {
  if (!enable || round > 3) {
    return players.map((p) => ({ ...p, virtualScore: undefined }));
  }

  const N = players.length;
  const halfN = Math.floor(N / 2);

  // Virtual point schedule: Round 1: +1.0, Round 2: +0.5, Round 3: +0.5
  const virtualPoint = round === 1 ? 1.0 : 0.5;

  return players.map((p) => {
    const isTopHalf = p.tpn <= halfN;
    return {
      ...p,
      virtualScore: isTopHalf ? p.score + virtualPoint : p.score,
    };
  });
}

/**
 * Selects the optimal PAB recipient for an odd-sized field (C2 & C9).
 * Player must be eligible (no previous PAB or forfeit win).
 * Prefers lowest dynamic rank (lowest score, highest TPN) and minimum unplayed games.
 */
export function selectPabRecipient(
  candidates: Player[]
): Player | null {
  const eligible = candidates.filter(isEligibleForPAB);
  if (eligible.length === 0) {
    // Fallback if all have had PAB (extreme theoretical case)
    return candidates[candidates.length - 1] || null;
  }

  // Sort eligible players: lowest score first, then highest TPN (FIDE C.04.3 Article 3.3.4)
  eligible.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score; // Lowest score first
    }
    const unplayedA = a.history.filter((h) => !h.isPlayedOTB).length;
    const unplayedB = b.history.filter((h) => !h.isPlayedOTB).length;
    if (unplayedA !== unplayedB) {
      return unplayedA - unplayedB; // Minimum unplayed games
    }
    return b.tpn - a.tpn; // Highest TPN (lowest initial rank)
  });

  return eligible[0];
}

/**
 * Main FIDE Dutch Pairing Engine
 * Implements FIDE C.04.1, C.04.2, C.04.3
 */
export function generateRoundPairings(
  tournament: Tournament,
  targetRound: number
): Round {
  const { settings } = tournament;
  let players = tournament.players.map((p) =>
    updatePlayerDynamicStats(p, targetRound - 1, settings.totalRounds)
  );

  // Apply Baku acceleration if enabled
  players = applyBakuAcceleration(
    players,
    targetRound,
    settings.enableBakuAcceleration
  );

  // 1. Filter active and present players
  const requestedByes: ByeAllocation[] = [];
  const activePresentPlayers: Player[] = [];

  for (const p of players) {
    if (p.isWithdrawn || !p.isActive) {
      continue;
    }

    // Check requested bye for this round
    if (p.requestedByeRound === targetRound && p.requestedByeType) {
      requestedByes.push({
        playerTpn: p.tpn,
        type: p.requestedByeType,
        points: p.requestedByeType === 'HPB' ? 0.5 : 0.0,
      });
      continue;
    }

    activePresentPlayers.push(p);
  }

  // 2. Handle odd player count -> allocate PAB
  let pabRecipient: Player | null = null;
  let playersToPair = [...activePresentPlayers];

  if (playersToPair.length % 2 !== 0) {
    pabRecipient = selectPabRecipient(playersToPair);
    if (pabRecipient) {
      requestedByes.push({
        playerTpn: pabRecipient.tpn,
        type: 'PAB',
        points: 1.0,
      });
      playersToPair = playersToPair.filter((p) => p.tpn !== pabRecipient!.tpn);
    }
  }

  // 3. Pairing Computation
  const pairedPlayerList: { white: Player; black: Player }[] = [];

  // Round 1 Special Case: Pure Top-Half vs Bottom-Half FIDE Dutch pairing
  if (targetRound === 1 && !settings.enableBakuAcceleration) {
    const sorted = sortPlayersDynamicRank(playersToPair);
    const half = sorted.length / 2;
    const S1 = sorted.slice(0, half);
    const S2 = sorted.slice(half);

    for (let i = 0; i < half; i++) {
      const p1 = S1[i];
      const p2 = S2[i];
      const { whitePlayer, blackPlayer } = allocateColors(
        p1,
        p2,
        settings.initialColor
      );
      pairedPlayerList.push({ white: whitePlayer, black: blackPlayer });
    }
  } else {
    // General Rounds (or Accelerated Round 1): Graph Matching with Blossom & FIDE Quality Criteria
    const sorted = sortPlayersDynamicRank(playersToPair);
    const n = sorted.length;
    const playerIndexMap = new Map<number, number>();
    sorted.forEach((p, idx) => playerIndexMap.set(p.tpn, idx));

    const edges: Edge[] = [];
    const BASE_WEIGHT = 10_000_000;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u = sorted[i];
        const v = sorted[j];

        // Hard Absolute Criteria Checks
        if (hasPlayedOTB(u, v)) continue; // C1: No rematches
        if (hasAbsoluteColorClash(u, v)) continue; // C3: Non-topscorer color clash

        // Calculate Quality Penalty Vector
        const scoreU = u.virtualScore !== undefined ? u.virtualScore : u.score;
        const scoreV = v.virtualScore !== undefined ? v.virtualScore : v.score;
        const scoreDiff = Math.abs(scoreU - scoreV);

        // Huge penalty for score differences (forces players inside scoregroups)
        const scorePenalty = Math.round(scoreDiff * 500_000);

        // Temporary color evaluation
        const { whitePlayer, blackPlayer } = allocateColors(
          u,
          v,
          settings.initialColor
        );
        const { c10, c11, c12, c13 } = evaluatePairColorQuality(
          whitePlayer,
          blackPlayer
        );
        const colorPenalty = c10 * 50_000 + c11 * 30_000 + c13 * 5_000 + c12 * 1_000;

        // Rank spread preference inside scoregroup (prefer pairing top half with bottom half)
        const rankDiff = Math.abs(i - j);
        const rankBonus = rankDiff * 10;

        const weight = Math.max(1, BASE_WEIGHT - scorePenalty - colorPenalty + rankBonus);

        edges.push({ u: i, v: j, weight });
      }
    }

    const matches = maxWeightMatching(n, edges);
    const matchedIndices = new Set<number>();

    for (const [uIdx, vIdx] of matches) {
      matchedIndices.add(uIdx);
      matchedIndices.add(vIdx);
      const u = sorted[uIdx];
      const v = sorted[vIdx];
      const { whitePlayer, blackPlayer } = allocateColors(
        u,
        v,
        settings.initialColor
      );
      pairedPlayerList.push({ white: whitePlayer, black: blackPlayer });
    }

    // Safety check: ensure only strictly legal pairs are added
    const unmatched = sorted.filter((_, idx) => !matchedIndices.has(idx));
    if (unmatched.length > 0) {
      for (let i = 0; i < unmatched.length - 1; i++) {
        const u = unmatched[i];
        if (matchedIndices.has(sorted.indexOf(u))) continue;
        for (let j = i + 1; j < unmatched.length; j++) {
          const v = unmatched[j];
          if (matchedIndices.has(sorted.indexOf(v))) continue;
          if (!hasPlayedOTB(u, v)) {
            matchedIndices.add(sorted.indexOf(u));
            matchedIndices.add(sorted.indexOf(v));
            const { whitePlayer, blackPlayer } = allocateColors(
              u,
              v,
              settings.initialColor
            );
            pairedPlayerList.push({ white: whitePlayer, black: blackPlayer });
            break;
          }
        }
      }
    }
  }

  // 4. Board Number Sorting (Module 8: FIDE C.04.2.D.9)
  const sortedPairs = sortBoards(pairedPlayerList);

  const finalPairings: BoardPairing[] = sortedPairs.map((pair, index) => {
    const validation = validatePair(pair.white, pair.black, targetRound);
    return {
      boardNumber: index + 1,
      whiteTpn: pair.white.tpn,
      blackTpn: pair.black.tpn,
      result: '*',
      violationBadges: validation.violations,
    };
  });

  return {
    roundNumber: targetRound,
    isPaired: true,
    isCompleted: false,
    pairings: finalPairings,
    byes: requestedByes,
    pairedAt: new Date().toISOString(),
  };
}
