// src/lib/fideSwissEngine.ts
// Complete FIDE C.04.3 Dutch Swiss & C.07 Tie-Break Engine (50 to 200 Players)

import {
  FideQualityVector,
  compareQualityVectorsLexicographically,
  computeTheoreticalBracketBounds,
  evaluateCandidateQualityVector,
  generateFideS1S2Exchanges,
  getBakuAcceleratedPairingScore,
  computePlayerFideRatingPerformance,
} from './fideExactMathEngine';

export type FideTitle = 'GM' | 'IM' | 'WGM' | 'FM' | 'WIM' | 'CM' | 'WFM' | 'WCM' | 'NONE';
export type Color = 'W' | 'B';
export type ColorPrefStrength = 'ABSOLUTE' | 'STRONG' | 'MILD' | 'NONE';
export type FloatType = 'DF' | 'UF' | 'NONE';

export type GameResult =
  | 'PENDING'
  | 'WHITE_WIN'        // 1 - 0 (Over the board)
  | 'BLACK_WIN'        // 0 - 1 (Over the board)
  | 'DRAW'             // 1/2 - 1/2 (Over the board)
  | 'WHITE_FORFEIT_WIN'// + - (Unplayed forfeit win for White)
  | 'BLACK_FORFEIT_WIN'// - + (Unplayed forfeit win for Black)
  | 'DOUBLE_FORFEIT'   // 0 - 0 (Unplayed)
  | 'PAB'              // Pairing-Allocated Bye (+1.0 point, no opponent)
  | 'HALF_POINT_BYE'   // Requested Half-Point Bye (+0.5 point)
  | 'ZERO_POINT_BYE';  // Requested Zero-Point Bye (+0.0 point)

export interface EligibilityRules {
  minPlayers: number;          // Default: 50
  maxPlayers: number;          // Default: 200
  minRating: number | null;    // e.g., 1400 or null for Open
  maxRating: number | null;    // e.g., 1600 for U-1600 tournament
  allowUnrated: boolean;       // Can rating === 0 enter?
  minAge: number | null;       // Based on tournamentYear - birthYear
  maxAge: number | null;       // e.g., 15 for Under-15
  allowedGender: 'OPEN' | 'FEMALE_ONLY';
  allowedOrganizations: string[]; // Empty array = open to all clubs/colleges
}

export interface PlayerRoundHistory {
  roundNumber: number;
  boardNumber: number;
  opponentId: string | null;   // null if PAB or Requested Bye
  color: Color | null;         // null if unplayed/bye
  playedOverTheBoard: boolean; // Crucial for FIDE C.04.2.D.5
  pointsEarned: number;        // 1.0, 0.5, or 0.0
  resultCode: GameResult;
  floatReceived: FloatType;
  scoreBeforeRound: number;
}

export interface CandidatePlayer {
  id: string;
  name: string;
  rating: number;              // 0 if unrated
  title: FideTitle;
  birthYear: number;
  gender: 'M' | 'F' | 'OTHER';
  organization: string;        // Club, College, or State
  fideId?: string;
  isActive: boolean;           // False if withdrawn
  requestedByes: Record<number, 'HALF' | 'ZERO'>; // roundNumber -> bye type

  // Assigned at Tournament Lock
  tpn: number;                 // Tournament Pairing Number (1 .. N)

  // Live Automatically Tracked Counters
  score: number;
  roundsWon: number;           // Strictly over-the-board wins + PAB/forfeit wins shown in UI
  otbWins: number;             // Strictly over-the-board wins (for FIDE Tie-break)
  otbBlackWins: number;        // Strictly over-the-board wins with Black
  roundsDrawn: number;
  roundsLost: number;
  receivedPABOrForfeitWin: boolean; // FIDE C2 constraint: max 1 PAB per tournament
  history: PlayerRoundHistory[];

  // Live Calculated Tie-Breaks
  tieBreaks: {
    buchholzCut1: number;
    buchholzTotal: number;
    sonnebornBerger: number;
    progressiveScore: number;
    directEncounter: number;
    mostWins: number;
  };

  // Live FIDE Rating Analytics (Superior to Swiss-Manager)
  fideRatingChange?: number;       // Live Delta R (e.g. +12.4 or -4.2)
  performanceRating?: number;      // FIDE Tournament Performance Rating (Rp)
  avgOpponentRating?: number;      // Average Opponent Elo (Rc)
}

export interface BoardPairing {
  boardNumber: number;
  roundNumber: number;
  whitePlayerId: string;
  blackPlayerId: string | null; // null if PAB or Requested Bye
  result: GameResult;
  isLocked: boolean;
}

export interface TournamentState {
  id: string;
  name: string;
  city?: string;
  roundDurationMinutes?: number;
  roundIncrementSeconds?: number;
  timeControlCategory?: 'CLASSICAL' | 'RAPID' | 'BLITZ' | 'CUSTOM';
  timeControlName?: string;
  tournamentYear: number;
  totalRounds: number;
  currentRound: number;
  topSeedInitialColor: Color;  // Drawn before R1: 'W' or 'B'
  status: 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED';
  bakuAcceleration?: boolean;
  rules: EligibilityRules;
  players: CandidatePlayer[];
  rounds: BoardPairing[][];    // rounds[roundIndex] = array of BoardPairings
}

const TITLE_WEIGHTS: Record<FideTitle, number> = {
  GM: 9, IM: 8, WGM: 7, FM: 6, WIM: 5, CM: 4, WFM: 3, WCM: 2, NONE: 0,
};

// ============================================================================
// 1. ELIGIBILITY GATEKEEPER ("WHO CAN ENTER WHICH TOURNAMENT")
// ============================================================================
export function validateCandidateEligibility(
  candidate: {
    name: string;
    rating: number;
    title: FideTitle;
    birthYear: number;
    gender: 'M' | 'F' | 'OTHER';
    organization: string;
  },
  tournament: TournamentState
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { rules, players, tournamentYear } = tournament;

  if (players.length >= rules.maxPlayers) {
    reasons.push(`Tournament has reached its maximum limit of ${rules.maxPlayers} players.`);
  }
  if (candidate.rating === 0 && !rules.allowUnrated) {
    reasons.push(`Unrated players are not permitted in this tournament section.`);
  }
  if (candidate.rating > 0 && rules.maxRating !== null && candidate.rating > rules.maxRating) {
    reasons.push(`Candidate rating (${candidate.rating}) exceeds maximum allowed (${rules.maxRating}).`);
  }
  if (candidate.rating > 0 && rules.minRating !== null && candidate.rating < rules.minRating) {
    reasons.push(`Candidate rating (${candidate.rating}) is below minimum required (${rules.minRating}).`);
  }

  const fideAge = tournamentYear - candidate.birthYear;
  if (rules.maxAge !== null && fideAge > rules.maxAge) {
    reasons.push(`Candidate age (${fideAge}) exceeds the Under-${rules.maxAge} limit.`);
  }
  if (rules.minAge !== null && fideAge < rules.minAge) {
    reasons.push(`Candidate age (${fideAge}) is below the minimum age (${rules.minAge}).`);
  }

  if (rules.allowedGender === 'FEMALE_ONLY' && candidate.gender !== 'F') {
    reasons.push(`This tournament section is restricted to female players.`);
  }

  if (
    rules.allowedOrganizations.length > 0 &&
    !rules.allowedOrganizations.some(
      (org) => org.trim().toLowerCase() === candidate.organization.trim().toLowerCase()
    )
  ) {
    reasons.push(`Organization "${candidate.organization}" is not in the permitted list for this event.`);
  }

  return { eligible: reasons.length === 0, reasons };
}

// ============================================================================
// 2. INITIAL RANKING & TPN ASSIGNMENT (FIDE C.04.2.B)
// ============================================================================
export function seedPlayersAndAssignTPN(players: CandidatePlayer[]): CandidatePlayer[] {
  const sorted = [...players].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    const titleDiff = TITLE_WEIGHTS[b.title] - TITLE_WEIGHTS[a.title];
    if (titleDiff !== 0) return titleDiff;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });

  return sorted.map((p, idx) => ({
    ...p,
    tpn: idx + 1,
  }));
}

// ============================================================================
// 3. COLOR DIFFERENCE & PREFERENCE ENGINE (FIDE C.04.3 Art. 1.6 - 1.7)
// ============================================================================
export interface PlayerColorState {
  playedColors: Color[];
  colorDifference: number; // W - B
  preferredColor: Color | null;
  strength: ColorPrefStrength;
  sameLastTwo: Color | null;
}

export function computeColorState(player: CandidatePlayer): PlayerColorState {
  const playedColors: Color[] = player.history
    .filter((h) => h.playedOverTheBoard && (h.color === 'W' || h.color === 'B'))
    .map((h) => h.color as Color);

  if (playedColors.length === 0) {
    return {
      playedColors: [],
      colorDifference: 0,
      preferredColor: null,
      strength: 'NONE',
      sameLastTwo: null,
    };
  }

  const whites = playedColors.filter((c) => c === 'W').length;
  const blacks = playedColors.length - whites;
  const cd = whites - blacks;

  const len = playedColors.length;
  const lastColor = playedColors[len - 1];
  const sameLastTwo =
    len >= 2 && playedColors[len - 1] === playedColors[len - 2] ? lastColor : null;

  // Absolute Preference: CD <= -2 or last two were 'B' -> ABS White; CD >= +2 or last two were 'W' -> ABS Black
  if (cd <= -2 || sameLastTwo === 'B') {
    return { playedColors, colorDifference: cd, preferredColor: 'W', strength: 'ABSOLUTE', sameLastTwo };
  }
  if (cd >= 2 || sameLastTwo === 'W') {
    return { playedColors, colorDifference: cd, preferredColor: 'B', strength: 'ABSOLUTE', sameLastTwo };
  }

  // Strong Preference: CD == -1 -> STR White; CD == +1 -> STR Black
  if (cd === -1) {
    return { playedColors, colorDifference: cd, preferredColor: 'W', strength: 'STRONG', sameLastTwo };
  }
  if (cd === 1) {
    return { playedColors, colorDifference: cd, preferredColor: 'B', strength: 'STRONG', sameLastTwo };
  }

  // Mild Preference: CD == 0 -> opposite of last played color
  const mildPref: Color = lastColor === 'W' ? 'B' : 'W';
  return { playedColors, colorDifference: 0, preferredColor: mildPref, strength: 'MILD', sameLastTwo };
}

// Compare two players according to FIDE Article 1.2 (Higher Score, then smaller TPN)
export function compareFideRank(a: CandidatePlayer, b: CandidatePlayer): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.tpn - b.tpn;
}

// ============================================================================
// 4. COLOR ALLOCATION FOR A PAIR (FIDE C.04.3 Article 5.2)
// ============================================================================
export function allocatePairColors(
  p1: CandidatePlayer,
  p2: CandidatePlayer,
  topSeedInitialColor: Color
): { white: CandidatePlayer; black: CandidatePlayer } {
  // Ensure A is the higher-ranked player under Article 1.2
  const [A, B] = compareFideRank(p1, p2) <= 0 ? [p1, p2] : [p2, p1];
  const stateA = computeColorState(A);
  const stateB = computeColorState(B);

  const assignWhiteToA = (aIsWhite: boolean) =>
    aIsWhite ? { white: A, black: B } : { white: B, black: A };

  // 5.2.1 Grant both color preferences if compatible
  if (stateA.preferredColor && stateB.preferredColor && stateA.preferredColor !== stateB.preferredColor) {
    return assignWhiteToA(stateA.preferredColor === 'W');
  }
  if (stateA.preferredColor && !stateB.preferredColor) {
    return assignWhiteToA(stateA.preferredColor === 'W');
  }
  if (!stateA.preferredColor && stateB.preferredColor) {
    return assignWhiteToA(stateB.preferredColor === 'B');
  }

  // If both have preferences (which must now be identical):
  if (stateA.preferredColor && stateB.preferredColor) {
    const rankMap: Record<ColorPrefStrength, number> = {
      ABSOLUTE: 3, STRONG: 2, MILD: 1, NONE: 0,
    };
    const strA = rankMap[stateA.strength];
    const strB = rankMap[stateB.strength];

    // 5.2.2 Grant the stronger preference
    if (strA !== strB) {
      return assignWhiteToA(strA > strB ? stateA.preferredColor === 'W' : stateB.preferredColor === 'B');
    }

    // Topscorer rule when both are ABSOLUTE: wider |CD| wins
    if (stateA.strength === 'ABSOLUTE' && Math.abs(stateA.colorDifference) !== Math.abs(stateB.colorDifference)) {
      const aWider = Math.abs(stateA.colorDifference) > Math.abs(stateB.colorDifference);
      return assignWhiteToA(aWider ? stateA.preferredColor === 'W' : stateB.preferredColor === 'B');
    }

    // 5.2.3 Alternate from the most recent round in which played colors differed
    const histA = stateA.playedColors;
    const histB = stateB.playedColors;
    const minLen = Math.min(histA.length, histB.length);
    for (let i = 1; i <= minLen; i++) {
      const colA = histA[histA.length - i];
      const colB = histB[histB.length - i];
      if (colA !== colB) {
        // Give opposite of what they had in that diverging round
        return assignWhiteToA(colA === 'B');
      }
    }

    // 5.2.4 Grant preference of the higher-ranked player A
    return assignWhiteToA(stateA.preferredColor === 'W');
  }

  // 5.2.5 Neither player has a color preference: use Higher Ranked Player A's odd/even TPN
  const aIsOddTPN = A.tpn % 2 === 1;
  const aGetsWhite = topSeedInitialColor === 'W' ? aIsOddTPN : !aIsOddTPN;
  return assignWhiteToA(aGetsWhite);
}

// ============================================================================
// 5. PAIR VALIDITY & COST EVALUATION (FIDE C1 - C21)
// ============================================================================
export function havePlayedOverTheBoard(a: CandidatePlayer, b: CandidatePlayer): boolean {
  return a.history.some((h) => h.playedOverTheBoard && h.opponentId === b.id);
}

export function isColorCompatibleUnderC3(
  a: CandidatePlayer,
  b: CandidatePlayer,
  isLastRound: boolean,
  maxPossibleBeforeRound: number
): boolean {
  const isTopA = isLastRound && a.score > maxPossibleBeforeRound / 2;
  const isTopB = isLastRound && b.score > maxPossibleBeforeRound / 2;
  if (isTopA || isTopB) return true; // C3 relaxed for topscorers in final round

  const stateA = computeColorState(a);
  const stateB = computeColorState(b);
  if (
    stateA.strength === 'ABSOLUTE' &&
    stateB.strength === 'ABSOLUTE' &&
    stateA.preferredColor === stateB.preferredColor
  ) {
    return false; // Violates Absolute Criterion C3
  }
  return true;
}

// Evaluates penalty of pairing (a, b) across C10-C21 so exact lexicographical search picks optimal
export function computePairPenalty(
  a: CandidatePlayer,
  b: CandidatePlayer,
  currentRound: number,
  totalRounds: number,
  topSeedInitialColor: Color
): number {
  const stateA = computeColorState(a);
  const stateB = computeColorState(b);
  const { white, black } = allocatePairColors(a, b, topSeedInitialColor);

  let penalty = 0;

  // Check if preferences are satisfied (C12 & C13)
  const checkDisregarded = (p: CandidatePlayer, st: PlayerColorState, assigned: Color) => {
    if (st.preferredColor && st.preferredColor !== assigned) {
      penalty += 10_000; // C12: Disregarded preference
      if (st.strength === 'STRONG' || st.strength === 'ABSOLUTE') {
        penalty += 100_000; // C13: Disregarded Strong/Absolute preference
      }
      const newCd = st.colorDifference + (assigned === 'W' ? 1 : -1);
      if (Math.abs(newCd) > 2) penalty += 5_000_000; // C10
      if (st.sameLastTwo === assigned) penalty += 1_000_000; // C11
    }
  };

  checkDisregarded(a, stateA, white.id === a.id ? 'W' : 'B');
  checkDisregarded(b, stateB, white.id === b.id ? 'W' : 'B');

  // Float repetition penalties (C14 - C21) when pairing players of unequal score
  if (a.score !== b.score) {
    const higher = a.score > b.score ? a : b;
    const lower = a.score > b.score ? b : a;

    const higherPrev1 = higher.history.find((h) => h.roundNumber === currentRound - 1)?.floatReceived;
    const lowerPrev1 = lower.history.find((h) => h.roundNumber === currentRound - 1)?.floatReceived;
    const higherPrev2 = higher.history.find((h) => h.roundNumber === currentRound - 2)?.floatReceived;
    const lowerPrev2 = lower.history.find((h) => h.roundNumber === currentRound - 2)?.floatReceived;

    if (higherPrev1 === 'DF') penalty += 2_000; // C14
    if (lowerPrev1 === 'UF') penalty += 1_000;  // C15
    if (higherPrev2 === 'DF') penalty += 200;   // C16
    if (lowerPrev2 === 'UF') penalty += 100;    // C17
  }

  return penalty;
}

// ============================================================================
// 6. EXACT 17-DIMENSIONAL LEXICOGRAPHICAL BRACKET SOLVER (FIDE C.04.3)
// ============================================================================
export interface BracketSolution {
  pairs: Array<[CandidatePlayer, CandidatePlayer]>;
  downfloaters: CandidatePlayer[];
  totalPenalty: number;
  qualityVector?: FideQualityVector;
}

export function solveBracketOrderPreserving(
  bracketPlayers: CandidatePlayer[],
  currentRound: number,
  totalRounds: number,
  topSeedInitialColor: Color,
  forbiddenDownfloaterIds: Set<string>,
  mdpIds: Set<string> = new Set<string>(),
  isFinalBracketOdd = false
): BracketSolution | null {
  const sorted = [...bracketPlayers].sort(compareFideRank);
  const P = sorted.length;
  if (P <= 1) {
    if (P === 1 && forbiddenDownfloaterIds.has(sorted[0].id)) return null;
    return { pairs: [], downfloaters: sorted, totalPenalty: 0 };
  }

  const isLastRound = currentRound === totalRounds;
  const maxPossibleBeforeRound = currentRound - 1;
  const bounds = computeTheoreticalBracketBounds(sorted);
  const maxPairs = Math.floor(P / 2);

  let bestSolution: BracketSolution | null = null;
  let bestVector: FideQualityVector | null = null;

  // Zero-violation lower bound check
  const isTheoreticalMinimum = (v: FideQualityVector, dfCount: number) => {
    return (
      v.c5_unpairedMDPs === 0 &&
      dfCount === bounds.minDownfloaters &&
      v.c12_disregardedPrefs <= bounds.minC12_disregardedPrefs &&
      v.c13_disregardedStrong <= bounds.minC13_disregardedStrong &&
      v.c10_topscorerCdGt2 === 0 &&
      v.c11_topscorerSame3 === 0
    );
  };

  // Stage 1: Exact FIDE Article 4.3 (S1 <-> S2 exchanges) & Article 4.2 (S2 transpositions)
  const partitions = generateFideS1S2Exchanges(sorted, maxPairs, 2);

  for (const part of partitions) {
    const s1 = part.s1;
    const s2 = part.s2;
    const downfloaterCandidate = s2.length > s1.length ? s2[s2.length - 1] : null;
    if (downfloaterCandidate && forbiddenDownfloaterIds.has(downfloaterCandidate.id)) {
      continue;
    }

    // Try canonical Dutch pairing s1[i] vs s2[i]
    let canonicalValid = true;
    const directPairs: Array<[CandidatePlayer, CandidatePlayer]> = [];
    for (let i = 0; i < s1.length; i++) {
      const u = s1[i];
      const v = s2[i];
      if (havePlayedOverTheBoard(u, v) || !isColorCompatibleUnderC3(u, v, isLastRound, maxPossibleBeforeRound)) {
        canonicalValid = false;
        break;
      }
      directPairs.push([u, v]);
    }

    if (canonicalValid) {
      const dfs = downfloaterCandidate ? [downfloaterCandidate] : [];
      const vector = evaluateCandidateQualityVector(
        directPairs,
        dfs,
        mdpIds,
        currentRound,
        totalRounds,
        topSeedInitialColor,
        isFinalBracketOdd
      );

      if (!bestVector || compareQualityVectorsLexicographically(vector, bestVector) < 0) {
        bestVector = vector;
        bestSolution = {
          pairs: directPairs,
          downfloaters: dfs,
          totalPenalty: vector.c12_disregardedPrefs * 1000 + vector.c13_disregardedStrong * 10000,
          qualityVector: vector,
        };

        if (isTheoreticalMinimum(vector, dfs.length)) {
          return bestSolution; // Instant O(P) Zero-Violation Pruning!
        }
      }
    }

    // Try transpositions in S2 for this partition if S2 size is <= 8
    if (s2.length <= 8) {
      const candidateS2 = s2.slice(0, s1.length);
      const usedS2 = new Array(candidateS2.length).fill(false);
      const currentPairs: Array<[CandidatePlayer, CandidatePlayer]> = [];
      let foundOptimalForPartition = false;

      function matchS2(idx: number): boolean {
        if (idx === s1.length) {
          const dfs = downfloaterCandidate ? [downfloaterCandidate] : [];
          const vector = evaluateCandidateQualityVector(
            currentPairs,
            dfs,
            mdpIds,
            currentRound,
            totalRounds,
            topSeedInitialColor,
            isFinalBracketOdd
          );

          if (!bestVector || compareQualityVectorsLexicographically(vector, bestVector) < 0) {
            bestVector = vector;
            bestSolution = {
              pairs: [...currentPairs],
              downfloaters: dfs,
              totalPenalty: vector.c12_disregardedPrefs * 1000 + vector.c13_disregardedStrong * 10000,
              qualityVector: vector,
            };

            if (isTheoreticalMinimum(vector, dfs.length)) {
              foundOptimalForPartition = true;
              return true;
            }
          }
          return false;
        }

        const u = s1[idx];
        for (let j = 0; j < candidateS2.length; j++) {
          if (usedS2[j]) continue;
          const v = candidateS2[j];
          if (havePlayedOverTheBoard(u, v) || !isColorCompatibleUnderC3(u, v, isLastRound, maxPossibleBeforeRound)) {
            continue;
          }
          usedS2[j] = true;
          currentPairs.push([u, v]);
          const stop = matchS2(idx + 1);
          currentPairs.pop();
          usedS2[j] = false;
          if (stop) return true;
        }
        return false;
      }

      matchS2(0);
      if (foundOptimalForPartition && bestSolution) {
        return bestSolution;
      }
    }
  }

  // If a solution with max pairs was already found, return it
  if (bestSolution && bestSolution.pairs.length === maxPairs) {
    return bestSolution;
  }

  // Stage 2: Heterogeneous General MRV Backtracking with Strict Lexicographical Dominance
  interface LocalEdge { u: number; v: number; }
  const edges: LocalEdge[] = [];
  for (let i = 0; i < P; i++) {
    for (let j = i + 1; j < P; j++) {
      const u = sorted[i];
      const v = sorted[j];
      if (havePlayedOverTheBoard(u, v)) continue;
      if (!isColorCompatibleUnderC3(u, v, isLastRound, maxPossibleBeforeRound)) continue;
      edges.push({ u: i, v: j });
    }
  }

  const adj: number[][] = Array.from({ length: P }, () => []);
  for (const e of edges) {
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  }

  const matched = new Int32Array(P).fill(-1);
  let steps = 0;

  function generalSolve(unmatchedCount: number) {
    steps++;
    if (steps > 5000) return;

    if (unmatchedCount <= 1 || steps % 40 === 0) {
      const currentPairs: Array<[CandidatePlayer, CandidatePlayer]> = [];
      const currentDfs: CandidatePlayer[] = [];
      for (let i = 0; i < P; i++) {
        if (matched[i] !== -1) {
          if (i < matched[i]) currentPairs.push([sorted[i], sorted[matched[i]]]);
        } else {
          currentDfs.push(sorted[i]);
        }
      }

      if (!currentDfs.some((df) => forbiddenDownfloaterIds.has(df.id))) {
        const vector = evaluateCandidateQualityVector(
          currentPairs,
          currentDfs,
          mdpIds,
          currentRound,
          totalRounds,
          topSeedInitialColor,
          isFinalBracketOdd
        );

        if (!bestVector || compareQualityVectorsLexicographically(vector, bestVector) < 0) {
          bestVector = vector;
          bestSolution = {
            pairs: currentPairs,
            downfloaters: currentDfs,
            totalPenalty: vector.c12_disregardedPrefs * 1000 + vector.c13_disregardedStrong * 10000,
            qualityVector: vector,
          };
          if (isTheoreticalMinimum(vector, currentDfs.length)) {
            return;
          }
        }
      }

      if (unmatchedCount <= 1) return;
    }

    let bestU = -1;
    let minDeg = Infinity;
    for (let i = 0; i < P; i++) {
      if (matched[i] !== -1) continue;
      let deg = 0;
      for (const target of adj[i]) {
        if (matched[target] === -1) deg++;
      }
      if (deg < minDeg) {
        minDeg = deg;
        bestU = i;
        if (deg <= 1) break;
      }
    }

    if (bestU === -1 || minDeg === 0) return;

    for (const v of adj[bestU]) {
      if (matched[v] !== -1) continue;
      matched[bestU] = v;
      matched[v] = bestU;

      generalSolve(unmatchedCount - 2);

      matched[bestU] = -1;
      matched[v] = -1;

      if (bestVector && isTheoreticalMinimum(bestVector, bestSolution?.downfloaters.length ?? 0)) {
        return;
      }
    }
  }

  generalSolve(P);

  return bestSolution;
}

// ============================================================================
// 7. FULL ROUND PAIRING GENERATOR (WITH C2 PAB & BACKTRACKING COLLAPSE)
// ============================================================================
export function generateNextRoundPairings(tournament: TournamentState): BoardPairing[] {
  const nextRoundNum = tournament.currentRound + 1;

  // Separate active present players vs players with requested byes for this round
  const activePresent = tournament.players.filter(
    (p) => p.isActive && !p.requestedByes[nextRoundNum]
  );
  const byePlayers = tournament.players.filter(
    (p) => p.isActive && Boolean(p.requestedByes[nextRoundNum])
  );

  // Group active present players into descending Scoregroups (with Baku acceleration if enabled)
  const bakuEnabled = Boolean(tournament.bakuAcceleration);
  const getPairingScore = (p: CandidatePlayer) =>
    getBakuAcceleratedPairingScore(p, activePresent.length, nextRoundNum, bakuEnabled);

  const scoreSet = Array.from(new Set(activePresent.map(getPairingScore))).sort((a, b) => b - a);
  const scoreGroups: CandidatePlayer[][] = scoreSet.map((sc) =>
    activePresent.filter((p) => getPairingScore(p) === sc).sort(compareFideRank)
  );

  const isOddTotal = activePresent.length % 2 === 1;

  const ineligibleForPAB = new Set(
    activePresent.filter((p) => p.receivedPABOrForfeitWin).map((p) => p.id)
  );

  let workingGroups = scoreGroups.map((g) => [...g]);
  let allPairs: Array<[CandidatePlayer, CandidatePlayer]> = [];
  let pabRecipient: CandidatePlayer | null = null;

  let groupIdx = 0;
  let carryOverMDPs: CandidatePlayer[] = [];

  while (groupIdx < workingGroups.length) {
    const isLastBracket = groupIdx === workingGroups.length - 1;
    const currentBracket = [...carryOverMDPs, ...workingGroups[groupIdx]];
    const forbiddenDownfloaters = isLastBracket && isOddTotal ? ineligibleForPAB : new Set<string>();

    const solution = solveBracketOrderPreserving(
      currentBracket,
      nextRoundNum,
      tournament.totalRounds,
      tournament.topSeedInitialColor,
      forbiddenDownfloaters,
      new Set(carryOverMDPs.map((m) => m.id)),
      isLastBracket && isOddTotal
    );

    const expectedMaxDownfloaters = isLastBracket ? (isOddTotal ? 1 : 0) : currentBracket.length;

    if (!solution || (isLastBracket && solution.downfloaters.length !== expectedMaxDownfloaters)) {
      if (workingGroups.length <= 1) {
        throw new Error('Impossible pairing configuration under FIDE Absolute Criteria C1-C3.');
      }
      const mergeIndex = Math.max(0, groupIdx - 1);
      const merged = [...workingGroups[mergeIndex], ...workingGroups[mergeIndex + 1]];
      workingGroups.splice(mergeIndex, 2, merged);
      groupIdx = 0;
      carryOverMDPs = [];
      allPairs = [];
      continue;
    }

    allPairs.push(...solution.pairs);
    carryOverMDPs = solution.downfloaters;

    if (isLastBracket && isOddTotal && carryOverMDPs.length === 1) {
      pabRecipient = carryOverMDPs[0];
    }
    groupIdx++;
  }

  // Allocate colors and sort boards per FIDE C.04.2.D.9
  const coloredPairs = allPairs.map(([p1, p2]) => {
    const { white, black } = allocatePairColors(p1, p2, tournament.topSeedInitialColor);
    const maxScore = Math.max(white.score, black.score);
    const sumScore = white.score + black.score;
    const higherRanked = compareFideRank(white, black) <= 0 ? white : black;
    return { white, black, maxScore, sumScore, bestTPN: higherRanked.tpn };
  });

  coloredPairs.sort((a, b) => {
    if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
    if (b.sumScore !== a.sumScore) return b.sumScore - a.sumScore;
    return a.bestTPN - b.bestTPN;
  });

  const roundPairings: BoardPairing[] = coloredPairs.map((cp, index) => ({
    boardNumber: index + 1,
    roundNumber: nextRoundNum,
    whitePlayerId: cp.white.id,
    blackPlayerId: cp.black.id,
    result: 'PENDING',
    isLocked: false,
  }));

  // Auto-award PAB
  if (pabRecipient) {
    roundPairings.push({
      boardNumber: roundPairings.length + 1,
      roundNumber: nextRoundNum,
      whitePlayerId: pabRecipient.id,
      blackPlayerId: null,
      result: 'PAB',
      isLocked: true,
    });
  }

  // Requested Byes
  for (const bp of byePlayers) {
    const byeType = bp.requestedByes[nextRoundNum];
    roundPairings.push({
      boardNumber: roundPairings.length + 1,
      roundNumber: nextRoundNum,
      whitePlayerId: bp.id,
      blackPlayerId: null,
      result: byeType === 'HALF' ? 'HALF_POINT_BYE' : 'ZERO_POINT_BYE',
      isLocked: true,
    });
  }

  return roundPairings;
}

// ============================================================================
// 8. ONE-CLICK WINNER SELECTION & REVERSIBLE SCORE/HISTORY ENGINE
// ============================================================================
export function recordBoardResult(
  tournament: TournamentState,
  roundNumber: number,
  boardNumber: number,
  newResult: GameResult
): TournamentState {
  const roundIdx = roundNumber - 1;
  if (!tournament.rounds[roundIdx]) return tournament;

  const boards = [...tournament.rounds[roundIdx]];
  const boardIdx = boards.findIndex((b) => b.boardNumber === boardNumber);
  if (boardIdx === -1) return tournament;

  // Toggle if clicked again
  const currentResult = boards[boardIdx].result;
  const appliedResult = currentResult === newResult ? 'PENDING' : newResult;

  boards[boardIdx] = { ...boards[boardIdx], result: appliedResult };

  const nextRounds = [...tournament.rounds];
  nextRounds[roundIdx] = boards;

  // Recompute all player histories deterministically from fresh baseline
  const playerMap = new Map<string, CandidatePlayer>();
  for (const p of tournament.players) {
    playerMap.set(p.id, {
      ...p,
      score: 0,
      roundsWon: 0,
      otbWins: 0,
      otbBlackWins: 0,
      roundsDrawn: 0,
      roundsLost: 0,
      receivedPABOrForfeitWin: false,
      history: [],
    });
  }

  for (let r = 0; r < nextRounds.length; r++) {
    const rNum = r + 1;
    const rBoards = nextRounds[r];

    for (const b of rBoards) {
      if (b.result === 'PENDING') continue;

      const white = playerMap.get(b.whitePlayerId);
      if (!white) continue;
      const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;

      const wScoreBefore = white.score;
      const bScoreBefore = black ? black.score : 0;

      if (!black) {
        const pts = b.result === 'PAB' ? 1.0 : b.result === 'HALF_POINT_BYE' ? 0.5 : 0.0;
        white.score += pts;
        if (b.result === 'PAB') {
          white.roundsWon += 1;
          white.receivedPABOrForfeitWin = true;
        }
        white.history.push({
          roundNumber: rNum,
          boardNumber: b.boardNumber,
          opponentId: null,
          color: null,
          playedOverTheBoard: false,
          pointsEarned: pts,
          resultCode: b.result,
          floatReceived: b.result === 'PAB' ? 'DF' : 'NONE',
          scoreBeforeRound: wScoreBefore,
        });
        continue;
      }

      const playedOTB =
        b.result === 'WHITE_WIN' || b.result === 'BLACK_WIN' || b.result === 'DRAW';

      let wPts = 0;
      let bPts = 0;
      if (b.result === 'WHITE_WIN' || b.result === 'WHITE_FORFEIT_WIN') {
        wPts = 1.0; bPts = 0.0;
        white.roundsWon += 1;
        black.roundsLost += 1;
        if (playedOTB) white.otbWins += 1;
        else white.receivedPABOrForfeitWin = true;
      } else if (b.result === 'BLACK_WIN' || b.result === 'BLACK_FORFEIT_WIN') {
        wPts = 0.0; bPts = 1.0;
        black.roundsWon += 1;
        white.roundsLost += 1;
        if (playedOTB) {
          black.otbWins += 1;
          black.otbBlackWins += 1;
        } else {
          black.receivedPABOrForfeitWin = true;
        }
      } else if (b.result === 'DRAW') {
        wPts = 0.5; bPts = 0.5;
        white.roundsDrawn += 1;
        black.roundsDrawn += 1;
      } else if (b.result === 'DOUBLE_FORFEIT') {
        wPts = 0.0; bPts = 0.0;
        white.roundsLost += 1;
        black.roundsLost += 1;
      }

      white.score += wPts;
      black.score += bPts;

      const wFloat: FloatType =
        wScoreBefore > bScoreBefore ? 'DF' : wScoreBefore < bScoreBefore ? 'UF' : 'NONE';
      const bFloat: FloatType =
        bScoreBefore > wScoreBefore ? 'DF' : bScoreBefore < wScoreBefore ? 'UF' : 'NONE';

      white.history.push({
        roundNumber: rNum,
        boardNumber: b.boardNumber,
        opponentId: black.id,
        color: playedOTB ? 'W' : null,
        playedOverTheBoard: playedOTB,
        pointsEarned: wPts,
        resultCode: b.result,
        floatReceived: wFloat,
        scoreBeforeRound: wScoreBefore,
      });

      black.history.push({
        roundNumber: rNum,
        boardNumber: b.boardNumber,
        opponentId: white.id,
        color: playedOTB ? 'B' : null,
        playedOverTheBoard: playedOTB,
        pointsEarned: bPts,
        resultCode: b.result,
        floatReceived: bFloat,
        scoreBeforeRound: bScoreBefore,
      });
    }
  }

  const updatedPlayers = computeStandingsAndTieBreaks(
    Array.from(playerMap.values()),
    nextRounds.length
  );

  return {
    ...tournament,
    players: updatedPlayers,
    rounds: nextRounds,
  };
}

// ============================================================================
// 9. FIDE C.07 TIE-BREAK CALCULATOR (WITH VIRTUAL OPPONENTS)
// ============================================================================
export function computeStandingsAndTieBreaks(
  players: CandidatePlayer[],
  completedRounds: number
): CandidatePlayer[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const getAdjustedOpponentScore = (opp: CandidatePlayer): number => {
    let adj = 0;
    for (let r = 1; r <= completedRounds; r++) {
      const rec = opp.history.find((h) => h.roundNumber === r);
      if (!rec || !rec.playedOverTheBoard) {
        adj += 0.5;
      } else {
        adj += rec.pointsEarned;
      }
    }
    return adj;
  };

  for (const p of players) {
    const oppScores: number[] = [];
    let sb = 0;
    let progressive = 0;
    let running = 0;

    for (let r = 1; r <= completedRounds; r++) {
      const rec = p.history.find((h) => h.roundNumber === r);
      const pts = rec ? rec.pointsEarned : 0;
      running += pts;
      progressive += running;

      if (rec && rec.playedOverTheBoard && rec.opponentId) {
        const opp = playerMap.get(rec.opponentId);
        if (opp) {
          const adjOppScore = getAdjustedOpponentScore(opp);
          oppScores.push(adjOppScore);
          sb += pts * adjOppScore;
        }
      } else {
        const sBefore = rec ? rec.scoreBeforeRound : running;
        const vScore = sBefore + (1 - pts) + 0.5 * (completedRounds - r);
        oppScores.push(vScore);
        sb += pts * vScore;
      }
    }

    const sortedOpp = [...oppScores].sort((a, b) => a - b);
    const bhTotal = sortedOpp.reduce((acc, v) => acc + v, 0);
    const bhCut1 = sortedOpp.length > 0 ? bhTotal - sortedOpp[0] : 0;

    p.tieBreaks = {
      buchholzCut1: Number(bhCut1.toFixed(2)),
      buchholzTotal: Number(bhTotal.toFixed(2)),
      sonnebornBerger: Number(sb.toFixed(2)),
      progressiveScore: Number(progressive.toFixed(2)),
      directEncounter: 0,
      mostWins: p.otbWins,
    };

    // Live Official FIDE B.02 Rating Analytics (ARO, Performance Rp, Live Delta R)
    const perf = computePlayerFideRatingPerformance(p, playerMap, new Date().getFullYear());
    p.avgOpponentRating = perf.averageRatingOfOpponents > 0 ? perf.averageRatingOfOpponents : undefined;
    p.fideRatingChange = perf.eloRatingChange;
    p.performanceRating = perf.performanceRating > 0 ? perf.performanceRating : undefined;
  }

  const byScore = new Map<number, CandidatePlayer[]>();
  for (const p of players) {
    const group = byScore.get(p.score) || [];
    group.push(p);
    byScore.set(p.score, group);
  }
  for (const [, tiedGroup] of byScore) {
    if (tiedGroup.length > 1) {
      const tiedIds = new Set(tiedGroup.map((tp) => tp.id));
      for (const p of tiedGroup) {
        let dePoints = 0;
        for (const h of p.history) {
          if (h.playedOverTheBoard && h.opponentId && tiedIds.has(h.opponentId)) {
            dePoints += h.pointsEarned;
          }
        }
        p.tieBreaks.directEncounter = dePoints;
      }
    }
  }

  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.tieBreaks.directEncounter !== a.tieBreaks.directEncounter)
      return b.tieBreaks.directEncounter - a.tieBreaks.directEncounter;
    if (b.tieBreaks.buchholzCut1 !== a.tieBreaks.buchholzCut1)
      return b.tieBreaks.buchholzCut1 - a.tieBreaks.buchholzCut1;
    if (b.tieBreaks.buchholzTotal !== a.tieBreaks.buchholzTotal)
      return b.tieBreaks.buchholzTotal - a.tieBreaks.buchholzTotal;
    if (b.tieBreaks.sonnebornBerger !== a.tieBreaks.sonnebornBerger)
      return b.tieBreaks.sonnebornBerger - a.tieBreaks.sonnebornBerger;
    if (b.tieBreaks.mostWins !== a.tieBreaks.mostWins)
      return b.tieBreaks.mostWins - a.tieBreaks.mostWins;
    return a.tpn - b.tpn;
  });
}
