import { Color, Player } from '../types/chess';
import { getFloatInRound } from './colorEngine';

export interface QualityVector {
  c5_unpairedMDPs: number;      // 0 is best (maximize M1)
  c6_downfloaters: number;      // minimize downfloaters
  c7_limboScores: number[];     // minimize limbo scores descending
  c9_pabUnplayedGames: number;  // minimize unplayed games of PAB
  c10_topscorerCdViolations: number;
  c11_topscorerStreakViolations: number;
  c12_allColorPrefViolations: number;
  c13_strongColorPrefViolations: number;
  c14_dfRoundMinus1: number;
  c15_ufRoundMinus1: number;
  c16_dfRoundMinus2: number;
  c17_ufRoundMinus2: number;
}

/**
 * Checks [C1] No Rematches
 * Two players who have already played an over-the-board game cannot be paired.
 */
export function hasPlayedOTB(player1: Player, player2: Player): boolean {
  return player1.history.some(
    (h) => h.isPlayedOTB && h.opponentTpn === player2.tpn
  );
}

/**
 * Checks [C2] Unique PAB Eligibility
 * Player must not have previously received a PAB or forfeit win (+ - / - +).
 */
export function isEligibleForPAB(player: Player): boolean {
  return !player.receivedPAB && !player.receivedForfeitWin;
}

/**
 * Checks [C3] Non-Topscorer Absolute Color Compatibility
 * Two players who are not Topscorers cannot be paired if both have same Absolute Color Preference.
 */
export function hasAbsoluteColorClash(player1: Player, player2: Player): boolean {
  if (player1.isTopscorer || player2.isTopscorer) {
    return false; // Exempt per FIDE C.04.3 Article 1.8
  }

  const pref1 = player1.colorPreference;
  const pref2 = player2.colorPreference;

  if (pref1 === 'ABS_W' && pref2 === 'ABS_W') return true;
  if (pref1 === 'ABS_B' && pref2 === 'ABS_B') return true;
  return false;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validates a proposed pair (manual override or candidate check)
 * against FIDE Absolute Criteria C1-C3 and color quality criteria.
 */
export function validatePair(
  whitePlayer: Player,
  blackPlayer: Player,
  roundNumber: number
): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // C1: No Rematches
  if (hasPlayedOTB(whitePlayer, blackPlayer)) {
    violations.push(`[C1 Violation] Players have already played an OTB game in a prior round`);
  }

  // C3: Absolute Color Clashes
  if (hasAbsoluteColorClash(whitePlayer, blackPlayer)) {
    violations.push(
      `[C3 Violation] Both players have absolute preference for ${
        whitePlayer.colorPreference === 'ABS_W' ? 'White' : 'Black'
      }`
    );
  }

  // White Player Color Compatibility Warning
  if (whitePlayer.colorPreference === 'ABS_B' && !whitePlayer.isTopscorer) {
    violations.push(`[C3 Violation] White player has Absolute Preference for Black`);
  } else if (whitePlayer.colorPreference === 'STR_B' || whitePlayer.colorPreference === 'MLD_B') {
    warnings.push(`[C12 Warning] White player preferred Black (${whitePlayer.colorPreference})`);
  }

  // Black Player Color Compatibility Warning
  if (blackPlayer.colorPreference === 'ABS_W' && !blackPlayer.isTopscorer) {
    violations.push(`[C3 Violation] Black player has Absolute Preference for White`);
  } else if (blackPlayer.colorPreference === 'STR_W' || blackPlayer.colorPreference === 'MLD_W') {
    warnings.push(`[C12 Warning] Black player preferred White (${blackPlayer.colorPreference})`);
  }

  // Float warnings
  const scoreDiff = Math.abs(whitePlayer.score - blackPlayer.score);
  if (scoreDiff >= 1.0) {
    warnings.push(`Score difference of ${scoreDiff} pts (Float pairing)`);
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Evaluates candidate pair against C10-C13 (Color Quality)
 */
export function evaluatePairColorQuality(
  white: Player,
  black: Player
): { c10: number; c11: number; c12: number; c13: number } {
  let c10 = 0;
  let c11 = 0;
  let c12 = 0;
  let c13 = 0;

  // New CD for White
  const whiteNewCD = white.colorDifference + 1;
  const whitePlayed = white.colorHistory;
  const whiteStreakWWW =
    whitePlayed.length >= 2 &&
    whitePlayed[whitePlayed.length - 1] === 'W' &&
    whitePlayed[whitePlayed.length - 2] === 'W';

  if (white.isTopscorer) {
    if (Math.abs(whiteNewCD) > 2) c10++;
    if (whiteStreakWWW) c11++;
  }

  // New CD for Black
  const blackNewCD = black.colorDifference - 1;
  const blackPlayed = black.colorHistory;
  const blackStreakBBB =
    blackPlayed.length >= 2 &&
    blackPlayed[blackPlayed.length - 1] === 'B' &&
    blackPlayed[blackPlayed.length - 2] === 'B';

  if (black.isTopscorer) {
    if (Math.abs(blackNewCD) > 2) c10++;
    if (blackStreakBBB) c11++;
  }

  // C12: Preferences not met
  if (white.colorPreference === 'ABS_B' || white.colorPreference === 'STR_B' || white.colorPreference === 'MLD_B') {
    c12++;
    if (white.colorPreference === 'ABS_B' || white.colorPreference === 'STR_B') c13++;
  }
  if (black.colorPreference === 'ABS_W' || black.colorPreference === 'STR_W' || black.colorPreference === 'MLD_W') {
    c12++;
    if (black.colorPreference === 'ABS_W' || black.colorPreference === 'STR_W') c13++;
  }

  return { c10, c11, c12, c13 };
}

/**
 * Evaluates Tier 5: Repetitive Float Criteria (C14-C17)
 */
export function evaluateFloatHistoryCriteria(
  residentFloater: Player,
  roundNumber: number
): { c14: number; c16: number } {
  const df1 = getFloatInRound(residentFloater, roundNumber - 1) === 'DF' ? 1 : 0;
  const df2 = getFloatInRound(residentFloater, roundNumber - 2) === 'DF' ? 1 : 0;
  return { c14: df1, c16: df2 };
}
