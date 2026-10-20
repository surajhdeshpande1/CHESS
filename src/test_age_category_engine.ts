import {
  computeOpenAndAgeCategoryWinners,
  DEFAULT_AGE_PRIZE_SETTINGS,
  buildAgeCategoriesFromCaps,
  AgePrizeSettings,
} from './lib/ageCategoryEngine';
import { createInitialTournamentState, get64DemoCandidates } from './data/quickDemoData';
import { CandidatePlayer, TournamentState } from './lib/fideSwissEngine';

console.log('====================================================');
console.log('   FIDE OPEN AGE CATEGORY ENGINE VERIFICATION       ');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------
// 1. Unified Open Pairing, Separate Live Age Podiums
// ------------------------------------------------------------------
console.log('--- TEST 1: Unified Open Pairing with Separate Age Podiums ---');
const tournament = createInitialTournamentState();
tournament.tournamentYear = 2026;
const players = get64DemoCandidates();
tournament.players = players;

// Give some distinct scores
players[0].score = 5.0; // Carlsen (adult)
players[1].score = 4.5;
players[2].score = 4.5;
players[3].score = 4.0;
players[4].score = 4.0; // Kid #5
players[5].score = 3.5;
players[6].score = 3.5;
players[7].score = 3.0;

const defaultResults = computeOpenAndAgeCategoryWinners(tournament, DEFAULT_AGE_PRIZE_SETTINGS);

assert(defaultResults.openMainWinners.length === 5, 'Top 5 Open Main Winners identified');
assert(defaultResults.ageCategoryBoards.length === 5, 'All 5 default age category boards (U9..U19) generated');
assert(
  defaultResults.ageCategoryBoards.every((b) => b.totalEligiblePlayers > 0),
  'Every age category board has eligible players populated from 64-player demo pool'
);

// ------------------------------------------------------------------
// 2. FIDE Birth-Year Rule Calculation (Y_tourney - Y_birth <= X)
// ------------------------------------------------------------------
console.log('\n--- TEST 2: FIDE Birth-Year Rule Verification ---');
const u13Board = defaultResults.ageCategoryBoards.find((b) => b.category.id === 'u13_open');
assert(u13Board !== undefined, 'Under-13 board found');
if (u13Board) {
  const allU13Valid = u13Board.fullLeaderboard.every((row) => {
    const age = 2026 - row.player.birthYear;
    return age <= 13;
  });
  assert(allU13Valid, 'All players in Under-13 board satisfy age <= 13 (born >= 2013)');
}

const u9Board = defaultResults.ageCategoryBoards.find((b) => b.category.id === 'u9_open');
assert(u9Board !== undefined, 'Under-9 board found');
if (u9Board) {
  const allU9Valid = u9Board.fullLeaderboard.every((row) => {
    const age = 2026 - row.player.birthYear;
    return age <= 9;
  });
  assert(allU9Valid, 'All players in Under-9 board satisfy age <= 9 (born >= 2017)');
}

// ------------------------------------------------------------------
// 3. Open Main Prize Upgrade Cascade Rule (No Double-Dipping)
// ------------------------------------------------------------------
console.log('\n--- TEST 3: Open Main Prize Upgrade & Trophy Cascade ---');
// Create a 12-year-old prodigy who places 2nd Overall in Open
const prodigy: CandidatePlayer = {
  ...players[0],
  id: 'prodigy_12yo',
  name: 'Wonder Kid Prodigy',
  birthYear: 2014, // 12 years old in 2026
  score: 6.0,      // Finishes 2nd in Open
  gender: 'M',
  isActive: true,
};
const testTourney: TournamentState = {
  ...tournament,
  players: [players[0], prodigy, ...players.slice(2)],
};

const cascadeResults = computeOpenAndAgeCategoryWinners(testTourney, {
  ...DEFAULT_AGE_PRIZE_SETTINGS,
  openMainPrizesCount: 3,
  excludeOpenMainWinnersFromAgePrizes: true,
});

// Prodigy should be in Open Main Winners
const wonOpenMain = cascadeResults.openMainWinners.some((w) => w.player.id === 'prodigy_12yo');
assert(wonOpenMain, '12-year-old prodigy wins Top Open Main prize');

// In Under-13 board, prodigy should be marked PROMOTED_TO_OPEN_MAIN and NOT receive an age trophy
const u13Result = cascadeResults.ageCategoryBoards.find((b) => b.category.id === 'u13_open');
const prodigyU13Row = u13Result?.fullLeaderboard.find((r) => r.player.id === 'prodigy_12yo');
assert(
  prodigyU13Row?.status === 'PROMOTED_TO_OPEN_MAIN',
  'Prodigy correctly marked as ⬆️ PROMOTED_TO_OPEN_MAIN on Under-13 board'
);
assert(
  prodigyU13Row?.prizeMedalNumber === null,
  'Prodigy receives no duplicate trophy in age category (prizeMedalNumber === null)'
);

// The 1st place trophy in U-13 must cascade down to the next kid
const u13Trophy1 = u13Result?.winners.find((w) => w.prizeMedalNumber === 1);
assert(
  u13Trophy1 !== undefined && u13Trophy1.player.id !== 'prodigy_12yo',
  'Under-13 1st place trophy cleanly cascades to next eligible junior player'
);

// ------------------------------------------------------------------
// 4. Overlap Protection: Natural Band vs Cumulative Under-X
// ------------------------------------------------------------------
console.log('\n--- TEST 4: Natural Band vs Cumulative Overlap Protection ---');
// In NATURAL_BAND mode: U-9 (<=9), U-11 (10-11), U-13 (12-13), U-15 (14-15)
const naturalBandBoard = cascadeResults.ageCategoryBoards.find((b) => b.category.id === 'u13_open');
assert(naturalBandBoard?.effectiveMinAge === 12, 'Natural band for U-13 sets min age to 12 (10-11 covered by U-11)');
assert(naturalBandBoard?.effectiveMaxAge === 13, 'Natural band for U-13 sets max age to 13');

// In CUMULATIVE_UNDER_X mode
const cumulativeResults = computeOpenAndAgeCategoryWinners(testTourney, {
  ...DEFAULT_AGE_PRIZE_SETTINGS,
  overlapMode: 'CUMULATIVE_UNDER_X',
});
const cumulativeU13 = cumulativeResults.ageCategoryBoards.find((b) => b.category.id === 'u13_open');
assert(cumulativeU13?.effectiveMinAge === null, 'Cumulative mode has null min age (all <= 13 eligible)');

// ------------------------------------------------------------------
// 5. 1-Click Boys & Girls Split Helper
// ------------------------------------------------------------------
console.log('\n--- TEST 5: Boys & Girls Split Presets ---');
const splitCategories = buildAgeCategoriesFromCaps([11, 13, 15], true, 3);
assert(splitCategories.length === 6, 'Generated 6 categories (3 boys + 3 girls)');
assert(
  splitCategories.filter((c) => c.genderDivision === 'BOYS_ONLY').length === 3,
  '3 Boys/Open categories created'
);
assert(
  splitCategories.filter((c) => c.genderDivision === 'GIRLS_ONLY').length === 3,
  '3 Girls categories created'
);

console.log('\n====================================================');
console.log(`   TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('====================================================\n');
if (passed === total) {
  console.log('ALL AGE CATEGORY ENGINE TESTS PASSED PERFECTLY!');
} else {
  process.exit(1);
}
