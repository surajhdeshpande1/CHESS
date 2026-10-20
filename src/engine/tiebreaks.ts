import { GameResult, Player, PlayerStanding, TieBreakType, TournamentSettings } from '../types/chess';

/**
 * Calculates running score for player P prior to round r.
 */
export function getScorePriorToRound(player: Player, round: number): number {
  return player.history
    .filter((h) => h.round < round)
    .reduce((sum, h) => sum + h.pointsAwarded, 0);
}

/**
 * Baku 2023 / FIDE C.07 Rule for real opponents who had unplayed games:
 * Any round where O did NOT play over the board is counted as 0.5 points for O.
 */
export function calculateAdjustedOpponentScore(
  opponent: Player,
  totalRounds: number
): number {
  let adjustedScore = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const roundData = opponent.history.find((h) => h.round === r);
    if (!roundData || !roundData.isPlayedOTB) {
      adjustedScore += 0.5;
    } else {
      adjustedScore += roundData.pointsAwarded;
    }
  }
  return adjustedScore;
}

/**
 * FIDE C.07 Article 16 Virtual Opponent Score calculation:
 * Score(V_r) = S_{P, r-1} + (1 - PointsAwarded(P, r)) + 0.5 * (R - r)
 */
export function calculateVirtualOpponentScore(
  player: Player,
  round: number,
  pointsAwarded: number,
  totalRounds: number
): number {
  const scorePrior = getScorePriorToRound(player, round);
  const resultVsPlayer = 1.0 - pointsAwarded;
  const remainingRoundsDraws = 0.5 * (totalRounds - round);
  return scorePrior + resultVsPlayer + remainingRoundsDraws;
}

export interface OpponentScoreEntry {
  round: number;
  score: number;
  pointsScoredByPlayer: number;
  isVirtual: boolean;
  opponentRating: number;
}

/**
 * Computes all opponent score contributions for a player across all tournament rounds.
 */
export function getPlayerOpponentEntries(
  player: Player,
  allPlayers: Map<number, Player>,
  totalRounds: number
): OpponentScoreEntry[] {
  const entries: OpponentScoreEntry[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const roundData = player.history.find((h) => h.round === r);
    if (!roundData) {
      // Unplayed round in future or unassigned
      continue;
    }

    if (roundData.isPlayedOTB && roundData.opponentTpn !== null) {
      const opp = allPlayers.get(roundData.opponentTpn);
      if (opp) {
        const adjScore = calculateAdjustedOpponentScore(opp, totalRounds);
        entries.push({
          round: r,
          score: adjScore,
          pointsScoredByPlayer: roundData.pointsAwarded,
          isVirtual: false,
          opponentRating: opp.rating || 0,
        });
      }
    } else {
      // Unplayed round (PAB, HPB, ZPB, forfeit win/loss)
      const virtualScore = calculateVirtualOpponentScore(
        player,
        r,
        roundData.pointsAwarded,
        totalRounds
      );
      entries.push({
        round: r,
        score: virtualScore,
        pointsScoredByPlayer: roundData.pointsAwarded,
        isVirtual: true,
        opponentRating: 0,
      });
    }
  }

  return entries;
}

export function computeTieBreaksForPlayer(
  player: Player,
  allPlayers: Map<number, Player>,
  totalRounds: number,
  tiedGroup?: Player[]
): Record<TieBreakType, number> {
  const entries = getPlayerOpponentEntries(player, allPlayers, totalRounds);
  const oppScores = entries.map((e) => e.score);

  // Buchholz Total (BH)
  const bhTotal = oppScores.reduce((sum, s) => sum + s, 0);

  // Buchholz Cut 1 (BH_C1)
  let bhC1 = bhTotal;
  if (oppScores.length > 0) {
    const minScore = Math.min(...oppScores);
    bhC1 = bhTotal - minScore;
  }

  // Buchholz Cut 2 (BH_C2)
  let bhC2 = bhTotal;
  if (oppScores.length >= 2) {
    const sorted = [...oppScores].sort((a, b) => a - b);
    bhC2 = bhTotal - sorted[0] - sorted[1];
  }

  // Median Buchholz (BH_M1)
  let bhM1 = bhTotal;
  if (oppScores.length >= 2) {
    const minScore = Math.min(...oppScores);
    const maxScore = Math.max(...oppScores);
    bhM1 = bhTotal - minScore - maxScore;
  }

  // Sonneborn-Berger (SB)
  const sb = entries.reduce(
    (sum, e) => sum + e.pointsScoredByPlayer * e.score,
    0
  );

  // Progressive Score (PS)
  let runningScore = 0;
  let ps = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const h = player.history.find((x) => x.round === r);
    if (h) {
      runningScore += h.pointsAwarded;
      ps += runningScore;
    }
  }

  // Most Wins (OTB only)
  const wins = player.history.filter(
    (h) => h.isPlayedOTB && h.pointsAwarded === 1.0
  ).length;

  // Most Wins with Black (OTB only)
  const bwg = player.history.filter(
    (h) => h.isPlayedOTB && h.color === 'B' && h.pointsAwarded === 1.0
  ).length;

  // Average Rating of Opponents (ARO) (OTB only)
  const realOppRatings = entries
    .filter((e) => !e.isVirtual && e.opponentRating > 0)
    .map((e) => e.opponentRating);
  const aro =
    realOppRatings.length > 0
      ? Math.round(
          realOppRatings.reduce((sum, r) => sum + r, 0) / realOppRatings.length
        )
      : 0;

  // Direct Encounter (DE)
  let de = 0;
  if (tiedGroup && tiedGroup.length > 1) {
    const tiedTpns = new Set(tiedGroup.map((p) => p.tpn));
    // Check if player has played against members of tied group
    for (const h of player.history) {
      if (h.isPlayedOTB && h.opponentTpn && tiedTpns.has(h.opponentTpn)) {
        de += h.pointsAwarded;
      }
    }
  }

  return {
    BH_C1: Number(bhC1.toFixed(2)),
    BH: Number(bhTotal.toFixed(2)),
    BH_C2: Number(bhC2.toFixed(2)),
    BH_M1: Number(bhM1.toFixed(2)),
    SB: Number(sb.toFixed(2)),
    PS: Number(ps.toFixed(2)),
    DE: Number(de.toFixed(2)),
    WIN: wins,
    BWG: bwg,
    ARO: aro,
  };
}

/**
 * Computes full tournament standings with sorted ranks and tie-breaks.
 */
export function calculateTournamentStandings(
  players: Player[],
  settings: TournamentSettings
): PlayerStanding[] {
  const playerMap = new Map<number, Player>();
  for (const p of players) {
    playerMap.set(p.tpn, p);
  }

  // Pre-calculate tie-breaks for all players
  const rawStandings = players.map((p) => {
    const tieBreaks = computeTieBreaksForPlayer(p, playerMap, settings.totalRounds);
    return {
      rank: 0,
      tpn: p.tpn,
      name: p.name,
      title: p.title,
      federation: p.federation,
      rating: p.rating,
      score: p.score,
      tieBreaks,
      colorBalance: p.colorDifference,
      roundsPlayed: p.colorHistory.length,
    };
  });

  // Sort standings according to score descending, then configured tie-breaks in order
  rawStandings.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    for (const tb of settings.tieBreaks) {
      const valA = a.tieBreaks[tb] ?? 0;
      const valB = b.tieBreaks[tb] ?? 0;
      if (Math.abs(valB - valA) > 0.001) {
        return valB - valA;
      }
    }

    // Default fallback: Initial TPN ascending
    return a.tpn - b.tpn;
  });

  // Assign ranks (handling ties)
  return rawStandings.map((s, idx) => ({
    ...s,
    rank: idx + 1,
  }));
}
