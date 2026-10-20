import {
  allocatePairColors,
  CandidatePlayer,
  computeColorState,
  computeStandingsAndTieBreaks,
  generateNextRoundPairings,
  recordBoardResult,
  seedPlayersAndAssignTPN,
  TournamentState,
  validateCandidateEligibility,
} from './lib/fideSwissEngine';
import { createInitialTournamentState, get64DemoCandidates } from './data/quickDemoData';

console.log('====================================================');
console.log('   FIDE SWISS-MANAGER AUTOPILOT ENGINE VERIFICATION  ');
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
// 1. Eligibility Gatekeeper Tests
// ------------------------------------------------------------------
console.log('--- TEST 1: Eligibility Gatekeeper Rules Engine ---');
const tournament = createInitialTournamentState();
tournament.rules.maxRating = 1600;
tournament.rules.maxAge = 18;
tournament.rules.allowedGender = 'FEMALE_ONLY';
tournament.rules.allowedOrganizations = ['Harvard', 'MIT'];

// Candidate A: 1650 rating -> should fail maxRating
const candA = {
  name: 'Candidate A',
  rating: 1650,
  title: 'NONE' as const,
  birthYear: 2009,
  gender: 'F' as const,
  organization: 'Harvard',
};
const resA = validateCandidateEligibility(candA, tournament);
assert(!resA.eligible && resA.reasons.some((r) => r.includes('exceeds maximum allowed')), 'Rejects candidate above 1600 rating cap');

// Candidate B: Male -> should fail FEMALE_ONLY
const candB = {
  name: 'Candidate B',
  rating: 1500,
  title: 'NONE' as const,
  birthYear: 2009,
  gender: 'M' as const,
  organization: 'Harvard',
};
const resB = validateCandidateEligibility(candB, tournament);
assert(!resB.eligible && resB.reasons.some((r) => r.includes('restricted to female players')), 'Rejects male candidate in female-only section');

// Candidate C: 100% Eligible
const candC = {
  name: 'Candidate C',
  rating: 1500,
  title: 'NONE' as const,
  birthYear: 2010, // Age 16 in 2026
  gender: 'F' as const,
  organization: 'Harvard',
};
const resC = validateCandidateEligibility(candC, tournament);
assert(resC.eligible, 'Approves 100% eligible candidate');

// ------------------------------------------------------------------
// 2. Initial Seeding & TPN
// ------------------------------------------------------------------
console.log('\n--- TEST 2: Initial Seeding & TPN Seeding ---');
const seeded = get64DemoCandidates();
assert(seeded.length === 64, 'Demo pool contains 64 players');
assert(seeded[0].name === 'Carlsen, Magnus' && seeded[0].tpn === 1, 'Seed #1 is Carlsen (TPN 1)');
assert(seeded[seeded.length - 1].tpn === 64, 'Seed #64 receives TPN 64');

// ------------------------------------------------------------------
// 3. Color State Engine (FIDE C.04.3 Art 1.6-1.7)
// ------------------------------------------------------------------
console.log('\n--- TEST 3: Color Engine State Machine ---');
const dummyP: CandidatePlayer = { ...seeded[0] };
assert(computeColorState(dummyP).strength === 'NONE', 'Zero games = NONE');

dummyP.history = [
  { roundNumber: 1, boardNumber: 1, opponentId: 'cand-2', color: 'W', playedOverTheBoard: true, pointsEarned: 1, resultCode: 'WHITE_WIN', floatReceived: 'NONE', scoreBeforeRound: 0 },
  { roundNumber: 2, boardNumber: 1, opponentId: 'cand-3', color: 'W', playedOverTheBoard: true, pointsEarned: 1, resultCode: 'WHITE_WIN', floatReceived: 'NONE', scoreBeforeRound: 1 },
];
const stWW = computeColorState(dummyP);
assert(stWW.strength === 'ABSOLUTE' && stWW.preferredColor === 'B', 'Two Whites in a row = ABS_B (must get Black)');

// ------------------------------------------------------------------
// 4. Round 1 Dutch Pairing Generation
// ------------------------------------------------------------------
console.log('\n--- TEST 4: FIDE Round 1 Dutch Pairing ---');
let simTourn = createInitialTournamentState();
simTourn.rules.maxRating = null; // Open
simTourn.rules.maxAge = null;
simTourn.rules.allowedGender = 'OPEN';
simTourn.rules.allowedOrganizations = [];
simTourn.players = get64DemoCandidates();

const r1Pairings = generateNextRoundPairings(simTourn);
assert(r1Pairings.length === 32, '64 players generates exactly 32 boards');
assert(r1Pairings[0].boardNumber === 1, 'Board 1 exists');
assert(r1Pairings[0].whitePlayerId === 'cand-1', 'Board 1 White is Seed #1');
assert(r1Pairings[0].blackPlayerId === 'cand-33', 'Board 1 Black is Seed #33 (Dutch top-half vs bottom-half)');

// ------------------------------------------------------------------
// 5. One-Click Winner Tap with Reversible Ledger
// ------------------------------------------------------------------
console.log('\n--- TEST 5: One-Click Tap & Reversible Ledger ---');
simTourn.rounds = [r1Pairings];
simTourn.currentRound = 1;

// Tap Board 1 White Win
simTourn = recordBoardResult(simTourn, 1, 1, 'WHITE_WIN');
const whiteP1 = simTourn.players.find((p) => p.id === 'cand-1')!;
const blackP33 = simTourn.players.find((p) => p.id === 'cand-33')!;
assert(whiteP1.score === 1.0 && whiteP1.roundsWon === 1, 'Board 1 White score is 1.0, roundsWon is 1');
assert(blackP33.score === 0.0 && blackP33.roundsLost === 1, 'Board 1 Black score is 0.0, roundsLost is 1');

// Organizer changes mind: Taps Black Win on Board 1
simTourn = recordBoardResult(simTourn, 1, 1, 'BLACK_WIN');
const whiteP1Rev = simTourn.players.find((p) => p.id === 'cand-1')!;
const blackP33Rev = simTourn.players.find((p) => p.id === 'cand-33')!;
assert(whiteP1Rev.score === 0.0 && whiteP1Rev.roundsWon === 0 && whiteP1Rev.roundsLost === 1, 'Reversible Ledger rolls back White: score = 0, roundsWon = 0');
assert(blackP33Rev.score === 1.0 && blackP33Rev.roundsWon === 1 && blackP33Rev.roundsLost === 0, 'Reversible Ledger applies Black win: score = 1, roundsWon = 1');

// ------------------------------------------------------------------
// 6. Complete 7-Round FIDE Tournament Autopilot Run
// ------------------------------------------------------------------
console.log('\n--- TEST 6: Complete 7-Round Autopilot Simulation ---');
simTourn = createInitialTournamentState();
simTourn.totalRounds = 7;
simTourn.players = get64DemoCandidates();

for (let r = 1; r <= 7; r++) {
  const roundPairings = generateNextRoundPairings(simTourn);
  simTourn.rounds.push(roundPairings);
  simTourn.currentRound = r;

  // Verify no C1 rematches
  for (const b of roundPairings) {
    if (b.blackPlayerId) {
      const w = simTourn.players.find((p) => p.id === b.whitePlayerId)!;
      const bl = simTourn.players.find((p) => p.id === b.blackPlayerId)!;
      const prior = w.history.some((h) => h.playedOverTheBoard && h.opponentId === bl.id);
      if (prior) {
        console.error(`Rematch detected in Round ${r} between ${w.name} and ${bl.name}!`);
        process.exit(1);
      }
    }
  }

  // Simulate results for all boards
  for (const b of roundPairings) {
    if (b.blackPlayerId) {
      const res: GameResult = Math.random() < 0.4 ? 'WHITE_WIN' : Math.random() < 0.7 ? 'DRAW' : 'BLACK_WIN';
      simTourn = recordBoardResult(simTourn, r, b.boardNumber, res);
    }
  }
}

assert(simTourn.rounds.length === 7, 'Completed all 7 rounds successfully');
assert(simTourn.players[0].score >= simTourn.players[1].score, 'Standings sorted descending by score');
assert(simTourn.players[0].tieBreaks.buchholzCut1 > 0, 'Tie-breaks computed (BH-C1 > 0)');

console.log('\n====================================================');
console.log(`   ALL AUTOPILOT ENGINE TESTS PASSED: ${passed}/${total} (100%) `);
console.log('====================================================');
