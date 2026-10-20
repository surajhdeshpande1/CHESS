// src/lib/ageCategoryEngine.ts
// Organizer-Configurable Age Category Engine for Open FIDE Swiss Tournaments

import {
  CandidatePlayer,
  TournamentState,
  computeStandingsAndTieBreaks,
} from './fideSwissEngine';

export type AgeGenderDivision = 'OPEN_ALL' | 'BOYS_ONLY' | 'GIRLS_ONLY';
export type AgeBracketOverlapMode = 'NATURAL_BAND' | 'CUMULATIVE_UNDER_X';

export interface AgeCategoryDefinition {
  id: string;
  label: string;                // e.g., "Under-13 Open/Boys", "Under-13 Girls", "Under-15"
  minAge: number | null;        // null for standard Under-X; or set automatically in NATURAL_BAND mode
  maxAge: number | null;        // e.g., 13 for Under-13 (null for Veteran 50+)
  genderDivision: AgeGenderDivision;
  winnersCount: number;         // How many winners to award in this category (e.g., Top 3 or Top 5)
  isEnabled: boolean;
}

export interface AgePrizeSettings {
  openMainPrizesCount: number;  // e.g., Top 5 or Top 10 Open Main Prize winners
  excludeOpenMainWinnersFromAgePrizes: boolean; // True = cascade age trophy if kid wins Main Open prize
  overlapMode: AgeBracketOverlapMode;
  categories: AgeCategoryDefinition[];
}

export interface AgeCategoryStandingRow {
  categoryRank: number;         // 1, 2, 3... among eligible players in this age category
  overallOpenRank: number;      // Rank in the overall 50-200 player Open tournament
  player: CandidatePlayer;
  candidateAge: number;
  status: 'WINNER' | 'PROMOTED_TO_OPEN_MAIN' | 'ALREADY_WON_OTHER_AGE' | 'PARTICIPANT';
  prizeMedalNumber: number | null; // 1 = 1st Place in Age Category, 2 = 2nd Place, etc.
  statusNote: string;
}

export interface AgeCategoryResultBoard {
  category: AgeCategoryDefinition;
  effectiveMinAge: number | null;
  effectiveMaxAge: number | null;
  cutoffBirthYearText: string;
  totalEligiblePlayers: number;
  winners: AgeCategoryStandingRow[];      // Only the awarded trophy winners (Top N)
  fullLeaderboard: AgeCategoryStandingRow[]; // All players in this age category
}

export interface OpenAndAgeResultsBundle {
  openMainWinners: Array<{ openRank: number; player: CandidatePlayer }>;
  ageCategoryBoards: AgeCategoryResultBoard[];
}

// ============================================================================
// 1. DEFAULT & 1-CLICK PRESET GENERATORS FOR THE ORGANIZER
// ============================================================================
export const DEFAULT_AGE_PRIZE_SETTINGS: AgePrizeSettings = {
  openMainPrizesCount: 5,
  excludeOpenMainWinnersFromAgePrizes: true,
  overlapMode: 'NATURAL_BAND',
  categories: [
    { id: 'u9_open', label: 'Under-9 (All)', minAge: null, maxAge: 9, genderDivision: 'OPEN_ALL', winnersCount: 3, isEnabled: true },
    { id: 'u11_open', label: 'Under-11 (All)', minAge: null, maxAge: 11, genderDivision: 'OPEN_ALL', winnersCount: 3, isEnabled: true },
    { id: 'u13_open', label: 'Under-13 (All)', minAge: null, maxAge: 13, genderDivision: 'OPEN_ALL', winnersCount: 3, isEnabled: true },
    { id: 'u15_open', label: 'Under-15 (All)', minAge: null, maxAge: 15, genderDivision: 'OPEN_ALL', winnersCount: 3, isEnabled: true },
    { id: 'u19_open', label: 'Under-19 Youth (All)', minAge: null, maxAge: 19, genderDivision: 'OPEN_ALL', winnersCount: 3, isEnabled: true },
  ],
};

// 1-Click Helper: Generate Separate Boys & Girls Categories for Given Age Caps
export function buildAgeCategoriesFromCaps(
  ageCaps: number[],
  splitBoysAndGirls: boolean,
  winnersPerCategory: number
): AgeCategoryDefinition[] {
  const sortedCaps = [...ageCaps].sort((a, b) => a - b);
  const list: AgeCategoryDefinition[] = [];

  for (const cap of sortedCaps) {
    if (splitBoysAndGirls) {
      list.push({
        id: `u${cap}_boys_${Date.now()}_${cap}`,
        label: `Under-${cap} Boys / Open`,
        minAge: null,
        maxAge: cap,
        genderDivision: 'BOYS_ONLY',
        winnersCount: winnersPerCategory,
        isEnabled: true,
      });
      list.push({
        id: `u${cap}_girls_${Date.now()}_${cap}`,
        label: `Under-${cap} Girls`,
        minAge: null,
        maxAge: cap,
        genderDivision: 'GIRLS_ONLY',
        winnersCount: winnersPerCategory,
        isEnabled: true,
      });
    } else {
      list.push({
        id: `u${cap}_all_${Date.now()}_${cap}`,
        label: `Under-${cap}`,
        minAge: null,
        maxAge: cap,
        genderDivision: 'OPEN_ALL',
        winnersCount: winnersPerCategory,
        isEnabled: true,
      });
    }
  }
  return list;
}

// ============================================================================
// 2. CORE CALCULATOR: COMPUTE OPEN MAIN WINNERS & ALL AGE CATEGORY PODIUMS
// ============================================================================
export function computeOpenAndAgeCategoryWinners(
  tournament: TournamentState,
  settings: AgePrizeSettings
): OpenAndAgeResultsBundle {
  const currentTourneyYear = tournament.tournamentYear || new Date().getFullYear();

  // 1. Get official FIDE Standings sorted by Score -> DE -> BH-C1 -> BH -> SB -> Wins -> TPN
  const sortedStandings = computeStandingsAndTieBreaks(
    tournament.players.filter((p) => p.isActive),
    tournament.rounds.length
  );

  const openRankMap = new Map<string, number>();
  sortedStandings.forEach((p, idx) => openRankMap.set(p.id, idx + 1));

  // 2. Identify Top-K Open Main Prize Winners
  const openMainWinnerIds = new Set<string>();
  const openMainWinners: Array<{ openRank: number; player: CandidatePlayer }> = [];

  for (let i = 0; i < Math.min(settings.openMainPrizesCount, sortedStandings.length); i++) {
    const p = sortedStandings[i];
    openMainWinnerIds.add(p.id);
    openMainWinners.push({ openRank: i + 1, player: p });
  }

  // 3. Determine effective age bounds if organizer selected NATURAL_BAND mode
  // Example: If U-9, U-11, U-13, U-15 are enabled, Natural Bands become:
  // U-9 (<=9), U-11 (10..11), U-13 (12..13), U-15 (14..15)
  const enabledCategories = settings.categories.filter((c) => c.isEnabled);

  const getEffectiveMinAge = (cat: AgeCategoryDefinition): number | null => {
    if (cat.minAge !== null) return cat.minAge;
    if (settings.overlapMode !== 'NATURAL_BAND' || cat.maxAge === null) return null;

    // Find the highest maxAge among enabled categories of the same gender division that is strictly less than cat.maxAge
    const lowerCaps = enabledCategories
      .filter(
        (other) =>
          other.id !== cat.id &&
          other.maxAge !== null &&
          other.maxAge < cat.maxAge! &&
          (other.genderDivision === cat.genderDivision ||
            other.genderDivision === 'OPEN_ALL' ||
            cat.genderDivision === 'OPEN_ALL')
      )
      .map((other) => other.maxAge as number);

    if (lowerCaps.length === 0) return null;
    return Math.max(...lowerCaps) + 1;
  };

  // Track players who already won an age category trophy (prevents winning two age categories in CUMULATIVE mode)
  const awardedAgeWinnerIds = new Set<string>();
  const ageCategoryBoards: AgeCategoryResultBoard[] = [];

  // Sort categories from youngest to oldest so youngest brackets are evaluated cleanly
  const orderedCategories = [...enabledCategories].sort(
    (a, b) => (a.maxAge ?? 999) - (b.maxAge ?? 999)
  );

  for (const cat of orderedCategories) {
    const effMinAge = getEffectiveMinAge(cat);
    const effMaxAge = cat.maxAge;

    // Build human-readable birth-year rule subtitle
    let cutoffBirthYearText = 'All Birth Years';
    if (effMinAge !== null && effMaxAge !== null) {
      const minBirthYear = currentTourneyYear - effMaxAge;
      const maxBirthYear = currentTourneyYear - effMinAge;
      cutoffBirthYearText = `Ages ${effMinAge}–${effMaxAge} (Born ${minBirthYear} to ${maxBirthYear})`;
    } else if (effMaxAge !== null) {
      const minBirthYear = currentTourneyYear - effMaxAge;
      cutoffBirthYearText = `Age ≤ ${effMaxAge} (Born in or after ${minBirthYear})`;
    } else if (effMinAge !== null) {
      const maxBirthYear = currentTourneyYear - effMinAge;
      cutoffBirthYearText = `Age ≥ ${effMinAge} (Born in or before ${maxBirthYear})`;
    }

    // Filter players matching this age category & gender division
    const matchingPlayers = sortedStandings.filter((p) => {
      const age = currentTourneyYear - p.birthYear;
      if (effMaxAge !== null && age > effMaxAge) return false;
      if (effMinAge !== null && age < effMinAge) return false;
      if (cat.genderDivision === 'BOYS_ONLY' && p.gender === 'F') return false;
      if (cat.genderDivision === 'GIRLS_ONLY' && p.gender !== 'F') return false;
      return true;
    });

    let currentMedal = 1;
    const fullLeaderboard: AgeCategoryStandingRow[] = [];
    const winners: AgeCategoryStandingRow[] = [];

    matchingPlayers.forEach((p, idx) => {
      const overallOpenRank = openRankMap.get(p.id) || p.tpn;
      const candidateAge = currentTourneyYear - p.birthYear;

      // Check 1: Did this player already win a Top-K Open Main Prize?
      if (
        settings.excludeOpenMainWinnersFromAgePrizes &&
        openMainWinnerIds.has(p.id)
      ) {
        fullLeaderboard.push({
          categoryRank: idx + 1,
          overallOpenRank,
          player: p,
          candidateAge,
          status: 'PROMOTED_TO_OPEN_MAIN',
          prizeMedalNumber: null,
          statusNote: `⬆️ Won Open Main Prize #${overallOpenRank} (Trophy Cascades Down)`,
        });
        return;
      }

      // Check 2: Did this player already win another Age Category trophy?
      if (awardedAgeWinnerIds.has(p.id)) {
        fullLeaderboard.push({
          categoryRank: idx + 1,
          overallOpenRank,
          player: p,
          candidateAge,
          status: 'ALREADY_WON_OTHER_AGE',
          prizeMedalNumber: null,
          statusNote: `✓ Awarded in Younger/Primary Age Category`,
        });
        return;
      }

      // Check 3: Award Age Category Medal if slots remain (1 .. cat.winnersCount)
      if (currentMedal <= cat.winnersCount) {
        const row: AgeCategoryStandingRow = {
          categoryRank: idx + 1,
          overallOpenRank,
          player: p,
          candidateAge,
          status: 'WINNER',
          prizeMedalNumber: currentMedal,
          statusNote:
            currentMedal === 1
              ? `🥇 1st Place ${cat.label}`
              : currentMedal === 2
              ? `🥈 2nd Place ${cat.label}`
              : currentMedal === 3
              ? `🥉 3rd Place ${cat.label}`
              : `🏅 #${currentMedal} Place ${cat.label}`,
        };
        awardedAgeWinnerIds.add(p.id);
        winners.push(row);
        fullLeaderboard.push(row);
        currentMedal++;
      } else {
        fullLeaderboard.push({
          categoryRank: idx + 1,
          overallOpenRank,
          player: p,
          candidateAge,
          status: 'PARTICIPANT',
          prizeMedalNumber: null,
          statusNote: `Ranked #${idx + 1} in ${cat.label}`,
        });
      }
    });

    ageCategoryBoards.push({
      category: cat,
      effectiveMinAge: effMinAge,
      effectiveMaxAge: effMaxAge,
      cutoffBirthYearText,
      totalEligiblePlayers: matchingPlayers.length,
      winners,
      fullLeaderboard,
    });
  }

  return {
    openMainWinners,
    ageCategoryBoards,
  };
}
