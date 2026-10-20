import { Color, ColorPreferenceType, Player } from '../types/chess';
import { comparePlayersDynamicRank } from './ranking';

export interface AllocatedColorPair {
  whitePlayer: Player;
  blackPlayer: Player;
  stepUsed: number;
  reason: string;
}

const PREFERENCE_WEIGHTS: Record<ColorPreferenceType, number> = {
  ABS_W: 3,
  ABS_B: 3,
  STR_W: 2,
  STR_B: 2,
  MLD_W: 1,
  MLD_B: 1,
  NONE: 0,
};

function getPreferredColor(pref: ColorPreferenceType): Color | null {
  if (pref === 'ABS_W' || pref === 'STR_W' || pref === 'MLD_W') return 'W';
  if (pref === 'ABS_B' || pref === 'STR_B' || pref === 'MLD_B') return 'B';
  return null;
}

/**
 * Module 7: Color Allocation Engine (FIDE C.04.3 Article 5)
 * Returns { whitePlayer, blackPlayer, stepUsed, reason }
 */
export function allocateColors(
  player1: Player,
  player2: Player,
  initialColor: Color = 'W'
): AllocatedColorPair {
  // Determine higher-ranked player A and lower-ranked player B
  let A: Player;
  let B: Player;

  if (comparePlayersDynamicRank(player1, player2) < 0) {
    A = player1;
    B = player2;
  } else {
    A = player2;
    B = player1;
  }

  const prefA = A.colorPreference;
  const prefB = B.colorPreference;
  const colorA = getPreferredColor(prefA);
  const colorB = getPreferredColor(prefB);

  // Step 1 — Grant Both Preferences (Article 5.2.1)
  // If A prefers White and B prefers Black (or vice versa, or one has preference and other NONE)
  if (colorA && colorB && colorA !== colorB) {
    return colorA === 'W'
      ? { whitePlayer: A, blackPlayer: B, stepUsed: 1, reason: 'Step 1: Granted both mutual preferences' }
      : { whitePlayer: B, blackPlayer: A, stepUsed: 1, reason: 'Step 1: Granted both mutual preferences' };
  }
  if (colorA && !colorB) {
    return colorA === 'W'
      ? { whitePlayer: A, blackPlayer: B, stepUsed: 1, reason: 'Step 1: Granted A preference (B has no preference)' }
      : { whitePlayer: B, blackPlayer: A, stepUsed: 1, reason: 'Step 1: Granted A preference (B has no preference)' };
  }
  if (!colorA && colorB) {
    return colorB === 'W'
      ? { whitePlayer: B, blackPlayer: A, stepUsed: 1, reason: 'Step 1: Granted B preference (A has no preference)' }
      : { whitePlayer: A, blackPlayer: B, stepUsed: 1, reason: 'Step 1: Granted B preference (A has no preference)' };
  }

  // Step 2 — Grant the Stronger Preference (Article 5.2.2)
  // Both prefer the same color
  if (colorA && colorB && colorA === colorB) {
    const weightA = PREFERENCE_WEIGHTS[prefA];
    const weightB = PREFERENCE_WEIGHTS[prefB];

    if (weightA > weightB) {
      return colorA === 'W'
        ? { whitePlayer: A, blackPlayer: B, stepUsed: 2, reason: 'Step 2: A has strictly stronger preference' }
        : { whitePlayer: B, blackPlayer: A, stepUsed: 2, reason: 'Step 2: A has strictly stronger preference' };
    }
    if (weightB > weightA) {
      return colorB === 'W'
        ? { whitePlayer: B, blackPlayer: A, stepUsed: 2, reason: 'Step 2: B has strictly stronger preference' }
        : { whitePlayer: A, blackPlayer: B, stepUsed: 2, reason: 'Step 2: B has strictly stronger preference' };
    }

    // Topscorer Tie-Breaker: If both have Absolute preference for the same color,
    // grant to the player with wider absolute Color Difference (|CD_A| > |CD_B|)
    if (weightA === 3) {
      const absCdA = Math.abs(A.colorDifference);
      const absCdB = Math.abs(B.colorDifference);
      if (absCdA > absCdB) {
        return colorA === 'W'
          ? { whitePlayer: A, blackPlayer: B, stepUsed: 2, reason: 'Step 2: A has wider absolute Color Difference' }
          : { whitePlayer: B, blackPlayer: A, stepUsed: 2, reason: 'Step 2: A has wider absolute Color Difference' };
      }
      if (absCdB > absCdA) {
        return colorB === 'W'
          ? { whitePlayer: B, blackPlayer: A, stepUsed: 2, reason: 'Step 2: B has wider absolute Color Difference' }
          : { whitePlayer: A, blackPlayer: B, stepUsed: 2, reason: 'Step 2: B has wider absolute Color Difference' };
      }
    }

    // Step 3 — Historical Alternation From Most Recent Divergence (Article 5.2.3)
    // Align played color histories from most recent backward
    const histA = A.colorHistory;
    const histB = B.colorHistory;
    const lenA = histA.length;
    const lenB = histB.length;
    const minLen = Math.min(lenA, lenB);

    for (let i = 1; i <= minLen; i++) {
      const colorAtRoundA = histA[lenA - i];
      const colorAtRoundB = histB[lenB - i];
      if (colorAtRoundA !== colorAtRoundB) {
        // Stop at first divergence round. Give opposite color of what each had in that round.
        return colorAtRoundA === 'B'
          ? { whitePlayer: A, blackPlayer: B, stepUsed: 3, reason: `Step 3: Alternation from divergence ${i} round(s) ago` }
          : { whitePlayer: B, blackPlayer: A, stepUsed: 3, reason: `Step 3: Alternation from divergence ${i} round(s) ago` };
      }
    }

    // Step 4 — Grant Higher-Ranked Player's Preference (Article 5.2.4)
    // Histories were identical all the way back
    return colorA === 'W'
      ? { whitePlayer: A, blackPlayer: B, stepUsed: 4, reason: "Step 4: Identical histories; granted higher-ranked A's preference" }
      : { whitePlayer: B, blackPlayer: A, stepUsed: 4, reason: "Step 4: Identical histories; granted higher-ranked A's preference" };
  }

  // Step 5 — Initial-Color Odd/Even TPN Rule (Article 5.2.5 / Round 1)
  // Reached when neither player has a color preference
  const oppositeInitial: Color = initialColor === 'W' ? 'B' : 'W';
  const aColor: Color = A.tpn % 2 !== 0 ? initialColor : oppositeInitial;

  return aColor === 'W'
    ? { whitePlayer: A, blackPlayer: B, stepUsed: 5, reason: `Step 5: Seed 1 color (${initialColor}) odd/even TPN rule` }
    : { whitePlayer: B, blackPlayer: A, stepUsed: 5, reason: `Step 5: Seed 1 color (${initialColor}) odd/even TPN rule` };
}
