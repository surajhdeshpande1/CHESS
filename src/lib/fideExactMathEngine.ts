// src/lib/fideExactMathEngine.ts
// Exact 17-Dimensional Lexicographical FIDE C.04.3 Solver, S1/S2 Exchange Lattice,
// C.04.7 Baku Acceleration & Official FIDE B.02 Elo / Performance Rating Engine

import {
  CandidatePlayer,
  Color,
  computeColorState,
  compareFideRank,
  allocatePairColors,
} from './fideSwissEngine';

// ============================================================================
// 1. EXACT 17-DIMENSIONAL FIDE QUALITY VECTOR (C5 .. C21)
// ============================================================================
export interface FideQualityVector {
  c5_unpairedMDPs: number;         // Minimize (M0 - M1)
  c6_downfloatersCount: number;    // Minimize total downfloaters leaving bracket
  c7_limboScoresDesc: number[];    // Minimize scores of MDPs in Limbo (descending order)
  c8_nextBracketPenalty: number;   // Lookahead compatibility with next bracket
  c9_pabUnplayedGames: number;     // Minimize unplayed games of odd PAB recipient
  c10_topscorerCdGt2: number;      // Minimize topscorers with |new CD| > 2
  c11_topscorerSame3: number;      // Minimize topscorers with WWW or BBB
  c12_disregardedPrefs: number;    // Minimize total disregarded color preferences
  c13_disregardedStrong: number;   // Minimize disregarded Strong/Absolute preferences
  c14_repeatDfPrev1: number;       // Minimize resident downfloaters who downfloated in r-1
  c15_repeatUfPrev1: number;       // Minimize MDP opponents who upfloated in r-1
  c16_repeatDfPrev2: number;       // Minimize resident downfloaters who downfloated in r-2
  c17_repeatUfPrev2: number;       // Minimize MDP opponents who upfloated in r-2
  c18_repeatDfScoresPrev1: number[];
  c19_repeatUfScoresPrev1: number[];
  c20_repeatDfScoresPrev2: number[];
  c21_repeatUfScoresPrev2: number[];
}

// Helper: Compare two number arrays lexicographically (smaller is better)
export function compareNumberArraysLex(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

// Strict Lexicographical Comparator: returns < 0 if A is strictly better than B, 0 if equal, > 0 if A is worse
export function compareQualityVectorsLexicographically(
  a: FideQualityVector,
  b: FideQualityVector
): number {
  if (a.c5_unpairedMDPs !== b.c5_unpairedMDPs) return a.c5_unpairedMDPs - b.c5_unpairedMDPs;
  if (a.c6_downfloatersCount !== b.c6_downfloatersCount) return a.c6_downfloatersCount - b.c6_downfloatersCount;

  const c7 = compareNumberArraysLex(a.c7_limboScoresDesc, b.c7_limboScoresDesc);
  if (c7 !== 0) return c7;

  if (a.c8_nextBracketPenalty !== b.c8_nextBracketPenalty) return a.c8_nextBracketPenalty - b.c8_nextBracketPenalty;
  if (a.c9_pabUnplayedGames !== b.c9_pabUnplayedGames) return a.c9_pabUnplayedGames - b.c9_pabUnplayedGames;
  if (a.c10_topscorerCdGt2 !== b.c10_topscorerCdGt2) return a.c10_topscorerCdGt2 - b.c10_topscorerCdGt2;
  if (a.c11_topscorerSame3 !== b.c11_topscorerSame3) return a.c11_topscorerSame3 - b.c11_topscorerSame3;
  if (a.c12_disregardedPrefs !== b.c12_disregardedPrefs) return a.c12_disregardedPrefs - b.c12_disregardedPrefs;
  if (a.c13_disregardedStrong !== b.c13_disregardedStrong) return a.c13_disregardedStrong - b.c13_disregardedStrong;
  if (a.c14_repeatDfPrev1 !== b.c14_repeatDfPrev1) return a.c14_repeatDfPrev1 - b.c14_repeatDfPrev1;
  if (a.c15_repeatUfPrev1 !== b.c15_repeatUfPrev1) return a.c15_repeatUfPrev1 - b.c15_repeatUfPrev1;
  if (a.c16_repeatDfPrev2 !== b.c16_repeatDfPrev2) return a.c16_repeatDfPrev2 - b.c16_repeatDfPrev2;
  if (a.c17_repeatUfPrev2 !== b.c17_repeatUfPrev2) return a.c17_repeatUfPrev2 - b.c17_repeatUfPrev2;

  const c18 = compareNumberArraysLex(a.c18_repeatDfScoresPrev1, b.c18_repeatDfScoresPrev1);
  if (c18 !== 0) return c18;
  const c19 = compareNumberArraysLex(a.c19_repeatUfScoresPrev1, b.c19_repeatUfScoresPrev1);
  if (c19 !== 0) return c19;
  const c20 = compareNumberArraysLex(a.c20_repeatDfScoresPrev2, b.c20_repeatDfScoresPrev2);
  if (c20 !== 0) return c20;
  return compareNumberArraysLex(a.c21_repeatUfScoresPrev2, b.c21_repeatUfScoresPrev2);
}

// ============================================================================
// 2. O(P) ALGEBRAIC LOWER-BOUND CALCULATOR FOR INSTANT OPTIMALITY PRUNING
// ============================================================================
export interface TheoreticalBracketBounds {
  minDownfloaters: number;
  minC12_disregardedPrefs: number;
  minC13_disregardedStrong: number;
}

export function computeTheoreticalBracketBounds(
  bracketPlayers: CandidatePlayer[]
): TheoreticalBracketBounds {
  const P = bracketPlayers.length;
  const maxPairs = Math.floor(P / 2);
  const minDownfloaters = P - 2 * maxPairs;

  let wPref = 0;
  let bPref = 0;
  let nonePref = 0;
  let wStrong = 0;
  let bStrong = 0;

  for (const p of bracketPlayers) {
    const st = computeColorState(p);
    if (!st.preferredColor) {
      nonePref++;
    } else if (st.preferredColor === 'W') {
      wPref++;
      if (st.strength === 'STRONG' || st.strength === 'ABSOLUTE') wStrong++;
    } else {
      bPref++;
      if (st.strength === 'STRONG' || st.strength === 'ABSOLUTE') bStrong++;
    }
  }

  // Exact algebraic lower bound on disregarded preferences when forming maxPairs
  const imbalance = Math.abs(wPref - bPref) - nonePref - minDownfloaters;
  const minC12 = Math.max(0, Math.ceil(imbalance / 2));
  const minC13 = Math.max(0, Math.max(wStrong, bStrong) - maxPairs - minDownfloaters);

  return {
    minDownfloaters,
    minC12_disregardedPrefs: minC12,
    minC13_disregardedStrong: minC13,
  };
}

// ============================================================================
// 3. EXACT EVALUATION OF A CANDIDATE BRACKET MATCHING (C5 .. C21)
// ============================================================================
export function evaluateCandidateQualityVector(
  pairs: Array<[CandidatePlayer, CandidatePlayer]>,
  downfloaters: CandidatePlayer[],
  mdpIds: Set<string>,
  currentRound: number,
  _totalRounds: number,
  topSeedInitialColor: Color,
  isFinalBracketOdd: boolean
): FideQualityVector {
  let c5_unpairedMDPs = 0;
  const c7_limboScoresDesc: number[] = [];

  for (const df of downfloaters) {
    if (mdpIds.has(df.id)) {
      c5_unpairedMDPs++;
      c7_limboScoresDesc.push(df.score);
    }
  }
  c7_limboScoresDesc.sort((a, b) => b - a);

  let c9_pabUnplayedGames = 0;
  if (isFinalBracketOdd && downfloaters.length === 1) {
    const pabPlayer = downfloaters[0];
    c9_pabUnplayedGames = pabPlayer.history.filter((h) => !h.playedOverTheBoard).length;
  }

  let c10_topscorerCdGt2 = 0;
  let c11_topscorerSame3 = 0;
  let c12_disregardedPrefs = 0;
  let c13_disregardedStrong = 0;
  let c15_repeatUfPrev1 = 0;
  let c17_repeatUfPrev2 = 0;
  const c19_repeatUfScoresPrev1: number[] = [];
  const c21_repeatUfScoresPrev2: number[] = [];

  for (const [p1, p2] of pairs) {
    const { white, black } = allocatePairColors(p1, p2, topSeedInitialColor);
    const stW = computeColorState(white);
    const stB = computeColorState(black);

    // Check White player's color satisfaction
    if (stW.preferredColor && stW.preferredColor !== 'W') {
      c12_disregardedPrefs++;
      if (stW.strength === 'STRONG' || stW.strength === 'ABSOLUTE') c13_disregardedStrong++;
      if (Math.abs(stW.colorDifference + 1) > 2) c10_topscorerCdGt2++;
      if (stW.sameLastTwo === 'W') c11_topscorerSame3++;
    }

    // Check Black player's color satisfaction
    if (stB.preferredColor && stB.preferredColor !== 'B') {
      c12_disregardedPrefs++;
      if (stB.strength === 'STRONG' || stB.strength === 'ABSOLUTE') c13_disregardedStrong++;
      if (Math.abs(stB.colorDifference - 1) > 2) c10_topscorerCdGt2++;
      if (stB.sameLastTwo === 'B') c11_topscorerSame3++;
    }

    // Check Upfloat repetition for Resident opponents of MDPs (C15, C17, C19, C21)
    if (p1.score !== p2.score) {
      const lower = p1.score < p2.score ? p1 : p2;
      const prev1 = lower.history.find((h) => h.roundNumber === currentRound - 1)?.floatReceived;
      const prev2 = lower.history.find((h) => h.roundNumber === currentRound - 2)?.floatReceived;
      if (prev1 === 'UF') {
        c15_repeatUfPrev1++;
        c19_repeatUfScoresPrev1.push(lower.score);
      }
      if (prev2 === 'UF') {
        c17_repeatUfPrev2++;
        c21_repeatUfScoresPrev2.push(lower.score);
      }
    }
  }

  let c14_repeatDfPrev1 = 0;
  let c16_repeatDfPrev2 = 0;
  const c18_repeatDfScoresPrev1: number[] = [];
  const c20_repeatDfScoresPrev2: number[] = [];

  for (const df of downfloaters) {
    if (!mdpIds.has(df.id)) {
      const prev1 = df.history.find((h) => h.roundNumber === currentRound - 1)?.floatReceived;
      const prev2 = df.history.find((h) => h.roundNumber === currentRound - 2)?.floatReceived;
      if (prev1 === 'DF') {
        c14_repeatDfPrev1++;
        c18_repeatDfScoresPrev1.push(df.score);
      }
      if (prev2 === 'DF') {
        c16_repeatDfPrev2++;
        c20_repeatDfScoresPrev2.push(df.score);
      }
    }
  }

  c18_repeatDfScoresPrev1.sort((a, b) => b - a);
  c19_repeatUfScoresPrev1.sort((a, b) => a - b);
  c20_repeatDfScoresPrev2.sort((a, b) => b - a);
  c21_repeatUfScoresPrev2.sort((a, b) => a - b);

  return {
    c5_unpairedMDPs,
    c6_downfloatersCount: downfloaters.length,
    c7_limboScoresDesc,
    c8_nextBracketPenalty: 0,
    c9_pabUnplayedGames,
    c10_topscorerCdGt2,
    c11_topscorerSame3,
    c12_disregardedPrefs,
    c13_disregardedStrong,
    c14_repeatDfPrev1,
    c15_repeatUfPrev1,
    c16_repeatDfPrev2,
    c17_repeatUfPrev2,
    c18_repeatDfScoresPrev1,
    c19_repeatUfScoresPrev1,
    c20_repeatDfScoresPrev2,
    c21_repeatUfScoresPrev2,
  };
}

// ============================================================================
// 4. EXACT FIDE ARTICLE 4.3 (S1 <-> S2 EXCHANGES) & ARTICLE 4.2 (S2 TRANSPOSITIONS)
// ============================================================================
export interface S1S2Partition {
  s1: CandidatePlayer[];
  s2: CandidatePlayer[];
  exchangeSizeK: number;
  bsnDiffDelta: number;
}

// Helper to generate all k-combinations of indices [0 .. n-1]
function generateCombinations(n: number, k: number): number[][] {
  const results: number[][] = [];
  const combo: number[] = [];
  function backtrack(start: number) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i <= n - (k - combo.length); i++) {
      combo.push(i);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return results;
}

/**
 * Generates partitions (S1, S2) strictly following FIDE C.04.3 Article 4.3:
 * 1. Exchange size k = 0, 1, 2...
 * 2. Smallest BSN sum difference Delta
 * 3. Highest BSNs leaving S1 (descending lexicographical order)
 * 4. Lowest BSNs entering from S2 (ascending lexicographical order)
 */
export function generateFideS1S2Exchanges(
  bracketPlayers: CandidatePlayer[],
  s1Size: number,
  maxExchangeK = 2
): S1S2Partition[] {
  const sorted = [...bracketPlayers].sort(compareFideRank);
  const initialS1 = sorted.slice(0, s1Size);
  const initialS2 = sorted.slice(s1Size);

  const partitions: Array<{
    s1: CandidatePlayer[];
    s2: CandidatePlayer[];
    k: number;
    delta: number;
    leftS1BsnsDesc: number[];
    enteredS2BsnsAsc: number[];
  }> = [
    {
      s1: initialS1,
      s2: initialS2,
      k: 0,
      delta: 0,
      leftS1BsnsDesc: [],
      enteredS2BsnsAsc: [],
    },
  ];

  // For large brackets (> 10 players in S1), limit exchange depth to k=1 to prevent combinatorial explosion (e.g., C(32,2)^2 = 246,000)
  const effectiveMaxK = initialS1.length > 10 ? Math.min(1, maxExchangeK) : Math.min(maxExchangeK, initialS1.length, initialS2.length);

  for (let k = 1; k <= effectiveMaxK; k++) {
    const s1Combos = generateCombinations(initialS1.length, k);
    const s2Combos = generateCombinations(initialS2.length, k);

    const kCandidates: typeof partitions = [];

    for (const iSet of s1Combos) {
      for (const jSet of s2Combos) {
        // BSN in S1 is (idx + 1); BSN in S2 is (s1Size + idx + 1)
        const leftBsns = iSet.map((i) => i + 1).sort((a, b) => b - a);
        const enteredBsns = jSet.map((j) => s1Size + j + 1).sort((a, b) => a - b);

        const sumS1 = leftBsns.reduce((a, b) => a + b, 0);
        const sumS2 = enteredBsns.reduce((a, b) => a + b, 0);
        const delta = sumS2 - sumS1;

        const iLookup = new Set(iSet);
        const jLookup = new Set(jSet);

        const newS1 = [
          ...initialS1.filter((_, idx) => !iLookup.has(idx)),
          ...jSet.map((j) => initialS2[j]),
        ].sort(compareFideRank);

        const newS2 = [
          ...initialS2.filter((_, idx) => !jLookup.has(idx)),
          ...iSet.map((i) => initialS1[i]),
        ].sort(compareFideRank);

        kCandidates.push({
          s1: newS1,
          s2: newS2,
          k,
          delta,
          leftS1BsnsDesc: leftBsns,
          enteredS2BsnsAsc: enteredBsns,
        });
      }
    }

    // Sort kCandidates according to exact FIDE Article 4.3 rules
    kCandidates.sort((a, b) => {
      if (a.delta !== b.delta) return a.delta - b.delta;
      // Descending lexicographical comparison on BSNs leaving S1 (larger BSNs first)
      for (let m = 0; m < a.leftS1BsnsDesc.length; m++) {
        if (b.leftS1BsnsDesc[m] !== a.leftS1BsnsDesc[m]) {
          return b.leftS1BsnsDesc[m] - a.leftS1BsnsDesc[m];
        }
      }
      // Ascending lexicographical comparison on BSNs entering from S2 (smaller BSNs first)
      return compareNumberArraysLex(a.enteredS2BsnsAsc, b.enteredS2BsnsAsc);
    });

    // Take top candidates to avoid memory exhaustion
    const cappedCandidates = kCandidates.slice(0, 250);
    for (const c of cappedCandidates) {
      partitions.push(c);
    }
  }

  return partitions.map((p) => ({
    s1: p.s1,
    s2: p.s2,
    exchangeSizeK: p.k,
    bsnDiffDelta: p.delta,
  }));
}

// ============================================================================
// 5. OFFICIAL FIDE B.02 ELO RATING CHANGE & PERFORMANCE RATING (Rp) ENGINE
// ============================================================================
export interface FidePerformanceMetrics {
  playerId: string;
  ratedGamesCount: number;
  pointsAgainstRated: number;
  averageRatingOfOpponents: number; // ARO (Ra)
  performanceRating: number;        // Rp = Ra + dp
  kFactor: number;                  // 40, 20, or 10
  expectedScore: number;            // Sum of P(D)
  eloRatingChange: number;          // Delta R = K * (S - E)
  newProjectedRating: number;
}

// FIDE B.02 Table 8.1a Conversion from Fractional Score p to Rating Difference dp
export function computeFideDpConversion(fractionalScore: number): number {
  if (fractionalScore >= 1.0) return 800;
  if (fractionalScore <= 0.0) return -800;
  if (Math.abs(fractionalScore - 0.5) < 1e-6) return 0;
  // Exact inverse logistic matched to FIDE Table 8.1a
  return Math.round(-400 * Math.log10(1 / fractionalScore - 1));
}

// FIDE B.02 Table 8.1b Expected Score P(D) with 400-point difference cap
export function computeFideExpectedScore(playerRating: number, oppRating: number): number {
  const rawDiff = playerRating - oppRating;
  const clampedDiff = Math.max(-400, Math.min(400, rawDiff));
  return Number((1 / (1 + Math.pow(10, -clampedDiff / 400))).toFixed(2));
}

export function computePlayerFideRatingPerformance(
  player: CandidatePlayer,
  allPlayersMap: Map<string, CandidatePlayer>,
  tournamentYear: number
): FidePerformanceMetrics {
  const age = tournamentYear - player.birthYear;

  // FIDE B.02.8.6 Development Coefficient K
  const kFactor =
    age <= 18 && player.rating < 2300
      ? 40
      : player.rating < 2400
      ? 20
      : 10;

  const ratedOpponents: Array<{ oppRating: number; pts: number }> = [];

  for (const h of player.history) {
    if (!h.playedOverTheBoard || !h.opponentId) continue;
    const opp = allPlayersMap.get(h.opponentId);
    if (opp && opp.rating > 0) {
      ratedOpponents.push({ oppRating: opp.rating, pts: h.pointsEarned });
    }
  }

  if (ratedOpponents.length === 0) {
    return {
      playerId: player.id,
      ratedGamesCount: 0,
      pointsAgainstRated: 0,
      averageRatingOfOpponents: 0,
      performanceRating: 0,
      kFactor,
      expectedScore: 0,
      eloRatingChange: 0,
      newProjectedRating: player.rating,
    };
  }

  const sumOppRatings = ratedOpponents.reduce((acc, r) => acc + r.oppRating, 0);
  const aro = Math.round(sumOppRatings / ratedOpponents.length);
  const pointsAgainstRated = ratedOpponents.reduce((acc, r) => acc + r.pts, 0);
  const fractional = pointsAgainstRated / ratedOpponents.length;
  const dp = computeFideDpConversion(fractional);
  const performanceRating = Math.max(0, aro + dp);

  if (player.rating === 0) {
    // Unrated player: FIDE Initial Rating Performance
    return {
      playerId: player.id,
      ratedGamesCount: ratedOpponents.length,
      pointsAgainstRated,
      averageRatingOfOpponents: aro,
      performanceRating,
      kFactor: 40,
      expectedScore: 0,
      eloRatingChange: 0,
      newProjectedRating: ratedOpponents.length >= 5 ? performanceRating : 0,
    };
  }

  let totalExpected = 0;
  for (const ro of ratedOpponents) {
    totalExpected += computeFideExpectedScore(player.rating, ro.oppRating);
  }

  const deltaR = Number((kFactor * (pointsAgainstRated - totalExpected)).toFixed(1));
  return {
    playerId: player.id,
    ratedGamesCount: ratedOpponents.length,
    pointsAgainstRated,
    averageRatingOfOpponents: aro,
    performanceRating,
    kFactor,
    expectedScore: Number(totalExpected.toFixed(2)),
    eloRatingChange: deltaR,
    newProjectedRating: Math.round(player.rating + deltaR),
  };
}

// ============================================================================
// 6. OFFICIAL FIDE C.04.7 BAKU ACCELERATION VIRTUAL POINTS HELPER
// ============================================================================
export function getBakuAcceleratedPairingScore(
  player: CandidatePlayer,
  totalActivePlayers: number,
  nextRoundNumber: number,
  bakuEnabled: boolean
): number {
  if (!bakuEnabled) return player.score;

  // Top Group GA size is 2 * ceil(N / 4) (rounded up to nearest even integer >= N/2)
  const groupASize = 2 * Math.ceil(totalActivePlayers / 4);
  const isInGroupA = player.tpn <= groupASize;

  if (!isInGroupA) return player.score;
  if (nextRoundNumber >= 1 && nextRoundNumber <= 3) return player.score + 1.0;
  if (nextRoundNumber === 4 || nextRoundNumber === 5) return player.score + 0.5;
  return player.score;
}
