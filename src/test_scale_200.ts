import { createInitialTournament } from './data/sampleTournament';
import { evaluateGameResult, updatePlayerDynamicStats } from './engine/colorEngine';
import { generateRoundPairings } from './engine/pairingEngine';
import { calculateTournamentStandings } from './engine/tiebreaks';
import { GameResult, Player, Tournament } from './types/chess';

console.log('--- STRESS-TESTING FIDE ENGINE AT MAXIMUM BOUND (N = 200 PLAYERS) ---');
let tournament: Tournament = createInitialTournament(200);
tournament.settings.enableBakuAcceleration = true;

const startTime = Date.now();

for (let r = 1; r <= 9; r++) {
  const roundStart = Date.now();
  const round = generateRoundPairings(tournament, r);
  const elapsed = Date.now() - roundStart;
  console.log(`Round ${r}: Generated 100 boards in ${elapsed}ms.`);

  // Verify zero C1 rematches
  for (const b of round.pairings) {
    const white = tournament.players.find((p) => p.tpn === b.whiteTpn)!;
    const black = tournament.players.find((p) => p.tpn === b.blackTpn)!;
    if (white.history.some((h) => h.isPlayedOTB && h.opponentTpn === black.tpn)) {
      console.error(`Rematch detected on Board ${b.boardNumber}!`);
      process.exit(1);
    }
  }

  // Simulate results
  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, { ...p });
  }

  for (const pairing of round.pairings) {
    const white = playerMap.get(pairing.whiteTpn)!;
    const black = playerMap.get(pairing.blackTpn)!;
    const res: GameResult = Math.random() < 0.4 ? '1-0' : Math.random() < 0.7 ? '1/2-1/2' : '0-1';
    const evalRes = evaluateGameResult(res);

    white.history.push({
      round: r,
      opponentTpn: black.tpn,
      color: 'W',
      result: res,
      pointsAwarded: evalRes.whitePoints,
      isPlayedOTB: true,
      float: white.score > black.score ? 'DF' : white.score < black.score ? 'UF' : 'NONE',
    });
    white.score += evalRes.whitePoints;

    black.history.push({
      round: r,
      opponentTpn: white.tpn,
      color: 'B',
      result: res,
      pointsAwarded: evalRes.blackPoints,
      isPlayedOTB: true,
      float: black.score > white.score ? 'DF' : black.score < white.score ? 'UF' : 'NONE',
    });
    black.score += evalRes.blackPoints;
  }

  const updatedPlayers = Array.from(playerMap.values()).map((p) =>
    updatePlayerDynamicStats(p, r, tournament.settings.totalRounds)
  );

  tournament = {
    ...tournament,
    players: updatedPlayers,
    currentRound: r + 1 <= 9 ? r + 1 : 9,
    rounds: [...tournament.rounds, { ...round, isCompleted: true }],
  };
}

const totalTime = Date.now() - startTime;
console.log(`\nALL 9 ROUNDS FOR 200 PLAYERS COMPLETED IN ${totalTime}ms (Average ${(totalTime / 9).toFixed(1)}ms per round)!`);
const standings = calculateTournamentStandings(tournament.players, tournament.settings);
console.log(`Winner: ${standings[0].name} (${standings[0].score.toFixed(1)} pts, BH-C1: ${standings[0].tieBreaks.BH_C1})`);
