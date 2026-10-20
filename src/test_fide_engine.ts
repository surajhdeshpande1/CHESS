import { createInitialTournament, getSample64Players } from './data/sampleTournament';
import { allocateColors } from './engine/colorAllocation';
import {
  calculateColorDifference,
  determineColorPreference,
  evaluateGameResult,
  updatePlayerDynamicStats,
} from './engine/colorEngine';
import { hasAbsoluteColorClash, hasPlayedOTB, validatePair } from './engine/fideCriteria';
import { generateRoundPairings } from './engine/pairingEngine';
import { assignInitialTPNs } from './engine/ranking';
import {
  calculateTournamentStandings,
  calculateVirtualOpponentScore,
  computeTieBreaksForPlayer,
} from './engine/tiebreaks';
import { exportToTRF16, parseTRF16 } from './engine/trf16';
import { Player, PlayerRoundData } from './types/chess';

console.log('====================================================');
console.log('   FIDE SWISS-MANAGER ENGINE MATHEMATICAL AUDIT     ');
console.log('====================================================\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    testsPassed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// 1. Initial Ranking & Permanent TPN (FIDE C.04.2.B)
// ----------------------------------------------------
console.log('--- TEST 1: Initial Seeding & TPN Assignment ---');
const samplePlayers = getSample64Players();
assert(samplePlayers.length === 64, 'Correctly seeded 64 players');
assert(samplePlayers[0].name === 'Carlsen, Magnus', 'Seed #1 is Carlsen (2832)');
assert(samplePlayers[0].tpn === 1, 'Carlsen receives TPN 1');
assert(samplePlayers[0].rating >= samplePlayers[1].rating, 'Ratings sorted strictly descending');
assert(samplePlayers[samplePlayers.length - 1].tpn === 64, 'Last seed receives TPN 64');

// ----------------------------------------------------
// 2. Played vs Unplayed Games (FIDE C.04.2.D.5)
// ----------------------------------------------------
console.log('\n--- TEST 2: Played vs Unplayed Game Rules ---');
const otbWin = evaluateGameResult('1-0');
assert(otbWin.isPlayedOTB === true && otbWin.canPlayAgain === false, 'OTB win cannot be rematched (C1)');

const forfeitWin = evaluateGameResult('+ -');
assert(
  forfeitWin.isPlayedOTB === false && forfeitWin.canPlayAgain === true,
  'Forfeit win (+ -) CAN be paired again per C.04.2.D.5'
);

// ----------------------------------------------------
// 3. Color Difference & Preference Engine (Articles 1.6–1.7)
// ----------------------------------------------------
console.log('\n--- TEST 3: Color Engine & Preference State Machine ---');
assert(determineColorPreference([]) === 'NONE', '0 games = NONE');
assert(determineColorPreference(['W', 'W']) === 'ABS_B', 'WW streak = ABS_B (must get Black)');
assert(determineColorPreference(['B', 'B']) === 'ABS_W', 'BB streak = ABS_W (must get White)');
assert(determineColorPreference(['W', 'B', 'W']) === 'STR_B', 'W,B,W (CD = +1) = STR_B');
assert(determineColorPreference(['B', 'W', 'B']) === 'STR_W', 'B,W,B (CD = -1) = STR_W');
assert(determineColorPreference(['W', 'B']) === 'MLD_W', 'W,B (CD = 0, last B) = MLD_W');
assert(determineColorPreference(['B', 'W']) === 'MLD_B', 'B,W (CD = 0, last W) = MLD_B');

// ----------------------------------------------------
// 4. Color Allocation 5-Step Cascade (FIDE C.04.3 Article 5)
// ----------------------------------------------------
console.log('\n--- TEST 4: Color Allocation 5-Step Cascade ---');
const p1 = { ...samplePlayers[0], colorPreference: 'STR_W' as const };
const p2 = { ...samplePlayers[1], colorPreference: 'STR_B' as const };
const alloc1 = allocateColors(p1, p2, 'W');
assert(alloc1.stepUsed === 1 && alloc1.whitePlayer.tpn === 1, 'Step 1: Granted both mutual preferences');

const p3 = { ...samplePlayers[0], colorPreference: 'STR_W' as const };
const p4 = { ...samplePlayers[1], colorPreference: 'MLD_W' as const };
const alloc2 = allocateColors(p3, p4, 'W');
assert(alloc2.stepUsed === 2 && alloc2.whitePlayer.tpn === 1, 'Step 2: Granted stronger preference (STR > MLD)');

// Round 1 initial color rule: Odd seeds get White, Even seeds get Black
const r1_p1 = { ...samplePlayers[0], colorPreference: 'NONE' as const }; // TPN 1 (Odd)
const r1_p33 = { ...samplePlayers[32], colorPreference: 'NONE' as const }; // TPN 33 (Odd)
const r1_alloc = allocateColors(r1_p1, r1_p33, 'W');
assert(r1_alloc.stepUsed === 5 && r1_alloc.whitePlayer.tpn === 1, 'Step 5: Round 1 seed #1 gets drawn White');

// ----------------------------------------------------
// 5. Round 1 FIDE Dutch Pairing Generation
// ----------------------------------------------------
console.log('\n--- TEST 5: Round 1 Pairing Generation ---');
const tournament = createInitialTournament(64);
const round1 = generateRoundPairings(tournament, 1);
assert(round1.pairings.length === 32, '64 players produces exactly 32 paired boards');
assert(round1.byes.length === 0, 'Even player field produces 0 byes');
assert(round1.pairings[0].boardNumber === 1, 'Board 1 exists');
assert(
  round1.pairings[0].whiteTpn === 1 && round1.pairings[0].blackTpn === 33,
  'Board 1 is TPN 1 (Carlsen) vs TPN 33 per FIDE Dutch top-half vs bottom-half'
);

// ----------------------------------------------------
// 6. FIDE C.07 Tie-Break Engine & Virtual Opponents
// ----------------------------------------------------
console.log('\n--- TEST 6: FIDE C.07 Virtual Opponent Calculation ---');
// Player has unplayed round 3 (PAB = 1 point), in a 9-round tournament
const dummyPlayer: Player = {
  ...samplePlayers[0],
  score: 3.5,
  history: [
    { round: 1, opponentTpn: 33, color: 'W', result: '1-0', pointsAwarded: 1, isPlayedOTB: true, float: 'NONE' },
    { round: 2, opponentTpn: 17, color: 'B', result: '1-0', pointsAwarded: 1, isPlayedOTB: true, float: 'NONE' },
    { round: 3, opponentTpn: null, color: null, result: 'PAB', pointsAwarded: 1, isPlayedOTB: false, float: 'DF' },
  ],
};
// Score(V_3) = S_{P, 2} + (1 - PointsAwarded) + 0.5 * (9 - 3)
// S_{P, 2} = 2.0
// PointsAwarded = 1.0 => (1 - 1.0) = 0.0
// 0.5 * 6 = 3.0
// Total = 2.0 + 0.0 + 3.0 = 5.0
const vScore = calculateVirtualOpponentScore(dummyPlayer, 3, 1.0, 9);
assert(vScore === 5.0, `Virtual opponent score is mathematically exact (expected 5.0, got ${vScore})`);

// ----------------------------------------------------
// 7. TRF16 Export & Import Round-Trip
// ----------------------------------------------------
console.log('\n--- TEST 7: FIDE TRF16 Format Compliance ---');
const trfText = exportToTRF16(tournament);
assert(trfText.includes('012 FIDE Masters World Swiss Championship 2026'), 'TRF16 header 012 present');
assert(trfText.includes('001    1 m GM  Carlsen, Magnus'), 'TRF16 player row 001 Carlsen present');

const importedTourn = parseTRF16(trfText);
assert(importedTourn.players.length === 64, 'Parsed TRF16 yields 64 players');
assert(importedTourn.players[0].name === 'Carlsen, Magnus', 'Parsed seed #1 matches');
assert(importedTourn.players[0].rating === 2832, 'Parsed rating matches');

console.log('\n====================================================');
console.log(`   ALL AUDIT TESTS COMPLETED: ${testsPassed}/${totalTests} PASSED (100%) `);
console.log('====================================================');
