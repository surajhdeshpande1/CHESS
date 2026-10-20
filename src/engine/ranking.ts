import { FideTitle, Player } from '../types/chess';

export const TITLE_RANK_WEIGHTS: Record<FideTitle, number> = {
  GM: 9,
  IM: 8,
  WGM: 7,
  FM: 6,
  WIM: 5,
  CM: 4,
  WFM: 3,
  WCM: 2,
  None: 0,
};

/**
 * Module 2: Initial Ranking & Tournament Pairing Numbers (TPN)
 * FIDE C.04.2.B
 * Key 1 — Rating: Player's official rating (Descending; unrated = 0)
 * Key 2 — FIDE Title Rank: Integer weight (Descending)
 * Key 3 — Alphabetical: Full Name (LastName, FirstName) in ascending lexicographical order
 */
export function sortPlayersInitial(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    // Key 1: Rating Descending
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }

    // Key 2: Title Rank Descending
    const titleWeightA = TITLE_RANK_WEIGHTS[a.title] || 0;
    const titleWeightB = TITLE_RANK_WEIGHTS[b.title] || 0;
    if (titleWeightB !== titleWeightA) {
      return titleWeightB - titleWeightA;
    }

    // Key 3: Full Name Ascending
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * Assigns permanent TPNs (1..N) to all players based on initial seeding.
 */
export function assignInitialTPNs(players: Player[]): Player[] {
  const sorted = sortPlayersInitial(players);
  return sorted.map((player, index) => ({
    ...player,
    tpn: index + 1,
    history: player.history || [],
    colorHistory: player.colorHistory || [],
    score: player.score ?? 0,
    colorDifference: 0,
    colorPreference: 'NONE',
    isTopscorer: false,
    receivedPAB: false,
    receivedForfeitWin: false,
  }));
}

/**
 * Dynamic Rank in Any Round (FIDE C.04.3 Article 1.2)
 * Whenever players are ordered inside a bracket or compared as "higher-ranked",
 * they are sorted by:
 * 1. Current Score (Descending)
 * 2. TPN (Ascending — TPN 1 beats TPN 2)
 */
export function comparePlayersDynamicRank(a: Player, b: Player): number {
  const scoreA = a.virtualScore !== undefined ? a.virtualScore : a.score;
  const scoreB = b.virtualScore !== undefined ? b.virtualScore : b.score;

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  return a.tpn - b.tpn;
}

export function sortPlayersDynamicRank(players: Player[]): Player[] {
  return [...players].sort(comparePlayersDynamicRank);
}
