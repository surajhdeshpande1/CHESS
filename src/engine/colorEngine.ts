import { Color, ColorPreferenceType, FloatType, GameResult, Player, PlayerRoundData } from '../types/chess';

export interface ResultEvaluation {
  whitePoints: number;
  blackPoints: number;
  isPlayedOTB: boolean;
  canPlayAgain: boolean;
  countsInColorHistory: boolean;
}

export function evaluateGameResult(result: GameResult): ResultEvaluation {
  switch (result) {
    case '1-0':
      return { whitePoints: 1.0, blackPoints: 0.0, isPlayedOTB: true, canPlayAgain: false, countsInColorHistory: true };
    case '0-1':
      return { whitePoints: 0.0, blackPoints: 1.0, isPlayedOTB: true, canPlayAgain: false, countsInColorHistory: true };
    case '1/2-1/2':
      return { whitePoints: 0.5, blackPoints: 0.5, isPlayedOTB: true, canPlayAgain: false, countsInColorHistory: true };
    case '+ -':
      return { whitePoints: 1.0, blackPoints: 0.0, isPlayedOTB: false, canPlayAgain: true, countsInColorHistory: false };
    case '- +':
      return { whitePoints: 0.0, blackPoints: 1.0, isPlayedOTB: false, canPlayAgain: true, countsInColorHistory: false };
    case '- -':
      return { whitePoints: 0.0, blackPoints: 0.0, isPlayedOTB: false, canPlayAgain: true, countsInColorHistory: false };
    default:
      return { whitePoints: 0.0, blackPoints: 0.0, isPlayedOTB: false, canPlayAgain: false, countsInColorHistory: false };
  }
}

/**
 * Extracts strictly over-the-board played colors for a player.
 * FIDE C.04.2.D.5
 */
export function extractPlayedColorHistory(history: PlayerRoundData[]): Color[] {
  return history
    .filter((h) => h.isPlayedOTB && (h.color === 'W' || h.color === 'B'))
    .map((h) => h.color as Color);
}

/**
 * Calculates Color Difference (CD): count('W') - count('B')
 */
export function calculateColorDifference(playedColors: Color[]): number {
  let wCount = 0;
  let bCount = 0;
  for (const c of playedColors) {
    if (c === 'W') wCount++;
    if (c === 'B') bCount++;
  }
  return wCount - bCount;
}

/**
 * Determines Color Preference according to FIDE C.04.3 Articles 1.6 – 1.7.
 */
export function determineColorPreference(playedColors: Color[]): ColorPreferenceType {
  const k = playedColors.length;
  if (k === 0) {
    return 'NONE';
  }

  const cd = calculateColorDifference(playedColors);
  const lastColor = playedColors[k - 1];
  const secondLastColor = k >= 2 ? playedColors[k - 2] : null;

  // Absolute Preference (ABS_W or ABS_B)
  // If CD <= -2 OR last two played games are ['B', 'B'] => ABS_W
  if (cd <= -2 || (lastColor === 'B' && secondLastColor === 'B')) {
    return 'ABS_W';
  }
  // If CD >= +2 OR last two played games are ['W', 'W'] => ABS_B
  if (cd >= 2 || (lastColor === 'W' && secondLastColor === 'W')) {
    return 'ABS_B';
  }

  // Strong Preference (STR_W or STR_B)
  if (cd === -1) {
    return 'STR_W';
  }
  if (cd === 1) {
    return 'STR_B';
  }

  // Mild Preference (MLD_W or MLD_B)
  if (cd === 0) {
    if (lastColor === 'B') return 'MLD_W';
    if (lastColor === 'W') return 'MLD_B';
  }

  return 'NONE';
}

/**
 * Determines Topscorer status (FIDE C.04.3 Article 1.8).
 * Active only when pairing the final round (round === totalRounds)
 * and player's current score > (totalRounds - 1) / 2.
 */
export function isTopscorer(currentScore: number, roundToPair: number, totalRounds: number): boolean {
  if (roundToPair !== totalRounds) {
    return false;
  }
  return currentScore > (totalRounds - 1) / 2.0;
}

/**
 * Retrieves float history of a player in a specific past round.
 */
export function getFloatInRound(player: Player, roundNumber: number): FloatType {
  const roundData = player.history.find((h) => h.round === roundNumber);
  return roundData ? roundData.float : 'NONE';
}

/**
 * Recalculates all dynamic player stats after results are entered.
 */
export function updatePlayerDynamicStats(player: Player, currentRound: number, totalRounds: number): Player {
  const playedColors = extractPlayedColorHistory(player.history);
  const cd = calculateColorDifference(playedColors);
  const pref = determineColorPreference(playedColors);
  const topscorer = isTopscorer(player.score, currentRound + 1, totalRounds);

  const receivedPAB = player.history.some((h) => h.result === 'PAB');
  const receivedForfeitWin = player.history.some((h) => 
    (h.color === 'W' && h.result === '+ -') || (h.color === 'B' && h.result === '- +')
  );

  return {
    ...player,
    colorHistory: playedColors,
    colorDifference: cd,
    colorPreference: pref,
    isTopscorer: topscorer,
    receivedPAB,
    receivedForfeitWin,
  };
}
