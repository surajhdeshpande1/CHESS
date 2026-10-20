// src/test_vault_and_features.ts
// Verification of Error-Proof Vault, 7 Invariant Guards, Time Machine Undo & 8 Signature Features

import {
  createInitialTournamentState,
  get64DemoCandidates,
} from './data/quickDemoData';
import {
  generateNextRoundPairings,
  recordBoardResult,
  seedPlayersAndAssignTPN,
  TournamentState,
} from './lib/fideSwissEngine';
import {
  computePrizeWinners,
  createAuditAndSnapshot,
  DEFAULT_PRIZE_CATEGORIES,
  explainBoardPairing,
  exportTournamentStateToTRF16,
  findPlayerBoardInfo,
  generateCertificatesData,
  generateWhatsAppShareMessage,
  reopenPreviousRound,
  simulatePodiumWhatIf,
  TournamentVault,
  undoLastTournamentAction,
  verifyTournamentIntegrity,
} from './lib/tournamentVaultAndFeatures';

console.log('====================================================');
console.log('   ERROR-PROOF VAULT & 8 SIGNATURE FEATURES AUDIT   ');
console.log('====================================================\n');

let passCount = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
}

// Setup initial state with 64 Grandmasters
const initialTourney = createInitialTournamentState();
const demoPlayers = get64DemoCandidates();
const seededPlayers = seedPlayersAndAssignTPN(demoPlayers);

let vault: TournamentVault = {
  currentState: {
    ...initialTourney,
    players: seededPlayers,
    status: 'REGISTRATION',
  },
  auditLogs: [],
  snapshots: [],
};

// --- TEST 1: The 7 Mathematical Invariant Guards ---
console.log('--- TEST 1: 7-Point Mathematical Invariant Guards ---');
const integrity1 = verifyTournamentIntegrity(vault.currentState);
assert(integrity1.isValid, 'Initial seeded tournament satisfies all 7 invariant guards');
assert(integrity1.errors.length === 0, 'Zero invariant errors detected');

// --- TEST 2: Round 1 Pairing & Audit Logging ---
console.log('\n--- TEST 2: Round 1 Auto-Pair & Audit Logging ---');
const r1Boards = generateNextRoundPairings({
  ...vault.currentState,
  currentRound: 0,
});
const r1State: TournamentState = {
  ...vault.currentState,
  status: 'IN_PROGRESS',
  currentRound: 1,
  rounds: [r1Boards],
};

vault = createAuditAndSnapshot(
  vault,
  r1State,
  'ROUND_PAIRED',
  'Round 1 paired with 32 boards',
  'Chief Arbiter'
);

assert(vault.auditLogs.length === 1, 'Audit log created with sequence #1');
assert(vault.auditLogs[0].actionType === 'ROUND_PAIRED', 'Action badge is ROUND_PAIRED');
assert(vault.snapshots.length === 1, 'Pre-action snapshot saved for 1-click Undo');

// --- TEST 3: Result Recording & 1-Click Time Machine Undo ---
console.log('\n--- TEST 3: One-Tap Result & Time Machine Undo ---');
const afterTap1 = recordBoardResult(vault.currentState, 1, 1, 'WHITE_WIN');
vault = createAuditAndSnapshot(
  vault,
  afterTap1,
  'RESULT_RECORDED',
  'Board 1 White won (1-0)',
  'Chief Arbiter'
);

const whiteP = vault.currentState.players.find((p) => p.id === r1Boards[0].whitePlayerId);
assert(whiteP?.score === 1.0, 'Board 1 White score is 1.0 after tap');
assert(vault.snapshots.length === 2, 'Two snapshots stored in vault');

// Now trigger 1-Click Undo!
vault = undoLastTournamentAction(vault);
const restoredWhite = vault.currentState.players.find((p) => p.id === r1Boards[0].whitePlayerId);
assert(restoredWhite?.score === 0.0, '1-Click Undo restored White score to 0.0');
assert(vault.snapshots.length === 1, 'Snapshots popped by 1 after undo');
assert(vault.auditLogs[0].actionType === 'ACTION_UNDONE', 'Audit logged ACTION_UNDONE checkpoint');

// --- TEST 4: Feature 1 - "Explain Why" Pairing X-Ray ---
console.log('\n--- TEST 4: Feature 1 - Pairing X-Ray Explainer ---');
const explanation = explainBoardPairing(r1Boards[0], vault.currentState.players, 'W');
assert(explanation.boardNumber === 1, 'Explains Board 1');
assert(explanation.bracketReason.includes('S1') || explanation.bracketReason.includes('Scorebracket'), 'Explains bracket pairing reason');
assert(explanation.colorReason.length > 10, 'Explains color allocation logic');
assert(explanation.fideRuleCitations.length >= 2, 'Includes official FIDE rule citations');

// --- TEST 5: Complete 7 Rounds Simulation for Prize Testing ---
console.log('\n--- TEST 5: Complete Tournament Simulation ---');
let simState = vault.currentState;

for (let r = 1; r <= 7; r++) {
  if (r > 1) {
    const nextBoards = generateNextRoundPairings(simState);
    simState = {
      ...simState,
      currentRound: r,
      rounds: [...simState.rounds, nextBoards],
    };
  }

  // Simulate all boards in round r
  const rBoards = simState.rounds[r - 1];
  for (const b of rBoards) {
    if (b.blackPlayerId) {
      simState = recordBoardResult(simState, r, b.boardNumber, 'WHITE_WIN');
    }
  }
}

simState = { ...simState, status: 'COMPLETED' };
const finalIntegrity = verifyTournamentIntegrity(simState);
assert(finalIntegrity.isValid, '7-round completed tournament passes all 7 invariant guards');

// --- TEST 6: Feature 2 - Automated Multi-Category Prize Allocator (No Double-Dipping) ---
console.log('\n--- TEST 6: Feature 2 - Multi-Category Prize Calculator ---');
const awardedPrizes = computePrizeWinners(simState.players, DEFAULT_PRIZE_CATEGORIES, 2026);
assert(awardedPrizes.length === DEFAULT_PRIZE_CATEGORIES.length, 'Evaluated all configured prize categories');

// Verify zero double-dipping: each player ID appears at most once among awarded prizes
const awardedIds = awardedPrizes.filter((ap) => ap.winner !== null).map((ap) => ap.winner!.id);
const uniqueAwardedIds = new Set(awardedIds);
assert(awardedIds.length === uniqueAwardedIds.size, 'Zero double-dipping confirmed: each player won at most 1 trophy/prize');

// --- TEST 7: Feature 5 - Final Round "What-If" Podium Simulator ---
console.log('\n--- TEST 7: Feature 5 - Final Round What-If Simulator ---');
const whatIf = simulatePodiumWhatIf(simState, [
  { boardNumber: 1, hypotheticalResult: 'DRAW' },
]);
assert(whatIf.length === 64, 'Simulates complete 64 player standings');
assert(whatIf[0].score > 0, 'Top podium player has points');

// --- TEST 8: Feature 6 - WhatsApp Broadcast Generator ---
console.log('\n--- TEST 8: Feature 6 - WhatsApp Message Broadcaster ---');
const waMsg = generateWhatsAppShareMessage(simState);
assert(waMsg.includes('ROUND 7 PAIRINGS'), 'WhatsApp message contains tournament round title');
assert(waMsg.includes('Board 1'), 'WhatsApp message contains Board 1 info');

// --- TEST 9: Feature 7 - "Find My Board" Search ---
console.log('\n--- TEST 9: Feature 7 - "Find My Board" Player Lookup ---');
const foundBoard = findPlayerBoardInfo(simState, 'Carlsen');
assert(foundBoard.length >= 1, 'Finds board info for Carlsen');
assert(foundBoard[0].player.name.includes('Carlsen'), 'Found correct candidate name');
assert(foundBoard[0].boardNumber > 0, 'Assigned board number is valid');

// --- TEST 10: Feature 8 - Bulk Printable Certificates Suite ---
console.log('\n--- TEST 10: Feature 8 - Bulk Certificates Generator ---');
const certs = generateCertificatesData(simState, awardedPrizes);
assert(certs.length === 64, 'Generated certificates for all 64 candidates');
assert(certs[0].finalRank === 1, 'Champion certificate marked Rank #1');
assert(certs[0].totalPoints > 0, 'Certificate includes final score');

// --- TEST 11: Official FIDE TRF16 Export Compliance ---
console.log('\n--- TEST 11: Official FIDE TRF16 Export ---');
const trfText = exportTournamentStateToTRF16(simState);
assert(trfText.startsWith('012'), 'TRF16 starts with header line 012');
assert(trfText.includes('001    1'), 'TRF16 contains player line for Seed #1');
assert(trfText.includes('092 Individual: Swiss System'), 'TRF16 specifies Dutch Swiss pairing system');

console.log('\n====================================================');
console.log(`   ALL VAULT & FEATURES AUDIT TESTS PASSED: ${passCount}/${passCount} (100%) `);
console.log('====================================================');
