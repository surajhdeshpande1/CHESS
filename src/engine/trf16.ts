import {
  Color,
  FideTitle,
  GameResult,
  Player,
  PlayerRoundData,
  Tournament,
  TournamentSettings,
} from '../types/chess';
import { updatePlayerDynamicStats } from './colorEngine';

function padRight(str: string, length: number): string {
  return str.length >= length ? str.slice(0, length) : str + ' '.repeat(length - str.length);
}

function padLeft(str: string, length: number): string {
  return str.length >= length ? str.slice(0, length) : ' '.repeat(length - str.length) + str;
}

/**
 * Generates an official FIDE TRF16 compliant string from Tournament state.
 * Fixed column specification per FIDE Data Exchange Format (TRF16)
 */
export function exportToTRF16(tournament: Tournament): string {
  const { settings, players } = tournament;
  const lines: string[] = [];

  // Headers
  lines.push(`012 ${settings.name}`);
  lines.push(`022 ${settings.city}`);
  lines.push(`032 ${settings.federation}`);
  lines.push(`042 ${settings.startDate}`);
  lines.push(`052 ${settings.endDate}`);
  lines.push(`062 ${players.length}`);
  lines.push(`072 ${players.filter((p) => p.rating > 0).length}`);
  lines.push(`082 0`);
  lines.push(`092 Individual: Swiss System`);
  lines.push(`102 ${settings.chiefArbiter}`);
  lines.push(`112 ${settings.deputyArbiter}`);
  lines.push(`122 ${settings.timeControl}`);

  // Player Rows (001)
  for (const player of players) {
    let row = '001 ';                                                      // Pos 1-4
    row += padLeft(player.tpn.toString(), 4) + ' ';                       // Pos 5-9
    row += 'm ';                                                          // Pos 10-11
    row += padRight(player.title !== 'None' ? player.title : '', 3) + ' '; // Pos 12-15
    row += padRight(player.name, 33) + ' ';                               // Pos 16-49
    row += padLeft(player.rating ? player.rating.toString() : '0', 4) + ' '; // Pos 50-54
    row += padRight(player.federation || 'FID', 3) + ' ';                 // Pos 55-58
    row += padLeft(player.fideId || '0', 11) + ' ';                       // Pos 59-70
    row += '2000/01/01 ';                                                 // Pos 71-81
    row += padLeft(player.score.toFixed(1), 4) + ' ';                     // Pos 82-86
    row += padLeft(player.tpn.toString(), 4) + ' ';                       // Pos 87-91

    // Round data (8 characters per round starting at Pos 92)
    for (let r = 1; r <= settings.totalRounds; r++) {
      const h = player.history.find((x) => x.round === r);
      if (!h) {
        row += '  0000 -  ';
        continue;
      }

      const opp = h.opponentTpn ? padLeft(h.opponentTpn.toString(), 4) : '0000';
      const col = h.color ? h.color.toLowerCase() : '-';
      let res = ' ';
      switch (h.result) {
        case '1-0':
          res = h.color === 'W' ? '1' : '0';
          break;
        case '0-1':
          res = h.color === 'B' ? '1' : '0';
          break;
        case '1/2-1/2':
          res = '=';
          break;
        case '+ -':
          res = h.color === 'W' ? '+' : '-';
          break;
        case '- +':
          res = h.color === 'B' ? '+' : '-';
          break;
        case 'PAB':
          res = 'U';
          break;
        case 'HPB':
          res = 'H';
          break;
        case 'ZPB':
          res = 'Z';
          break;
        default:
          res = ' ';
          break;
      }

      row += `  ${opp} ${col} ${res}`;
    }

    lines.push(row);
  }

  return lines.join('\r\n');
}

/**
 * Parses an official FIDE TRF16 text into a Tournament object.
 */
export function parseTRF16(trfText: string): Tournament {
  const lines = trfText.split(/\r?\n/);
  const settings: TournamentSettings = {
    name: 'Imported TRF Tournament',
    city: '',
    federation: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    totalRounds: 9,
    initialColor: 'W',
    enableBakuAcceleration: false,
    tieBreaks: ['BH_C1', 'BH', 'SB', 'DE', 'WIN'],
    chiefArbiter: '',
    deputyArbiter: '',
    timeControl: '90m + 30s',
  };

  const players: Player[] = [];
  let maxRoundsSeen = 0;

  for (const line of lines) {
    if (line.startsWith('012 ')) settings.name = line.slice(4).trim();
    else if (line.startsWith('022 ')) settings.city = line.slice(4).trim();
    else if (line.startsWith('032 ')) settings.federation = line.slice(4).trim();
    else if (line.startsWith('042 ')) settings.startDate = line.slice(4).trim();
    else if (line.startsWith('052 ')) settings.endDate = line.slice(4).trim();
    else if (line.startsWith('102 ')) settings.chiefArbiter = line.slice(4).trim();
    else if (line.startsWith('112 ')) settings.deputyArbiter = line.slice(4).trim();
    else if (line.startsWith('122 ')) settings.timeControl = line.slice(4).trim();
    else if (line.startsWith('001 ')) {
      // Parse player row by fixed positions
      const tpn = parseInt(line.slice(4, 8).trim(), 10) || players.length + 1;
      const titleRaw = line.slice(11, 14).trim() as FideTitle;
      const title: FideTitle = ['GM', 'IM', 'WGM', 'FM', 'WIM', 'CM', 'WFM', 'WCM'].includes(titleRaw)
        ? titleRaw
        : 'None';
      const name = line.slice(15, 48).trim() || `Player ${tpn}`;
      const rating = parseInt(line.slice(49, 53).trim(), 10) || 0;
      const fed = line.slice(54, 57).trim() || 'FID';
      const fideId = line.slice(58, 69).trim();
      const score = parseFloat(line.slice(81, 85).trim()) || 0;

      // Parse round entries starting at column 91 (index 90 or 91)
      const roundDataStr = line.slice(91);
      const history: PlayerRoundData[] = [];
      const numRounds = Math.floor(roundDataStr.length / 8);
      if (numRounds > maxRoundsSeen) maxRoundsSeen = numRounds;

      for (let r = 0; r < numRounds; r++) {
        const chunk = roundDataStr.slice(r * 8, (r + 1) * 8);
        const oppStr = chunk.slice(2, 6).trim();
        const colChar = chunk.slice(6, 7).toUpperCase();
        const resChar = chunk.slice(7, 8);

        const oppTpn = parseInt(oppStr, 10);
        const color: Color | null = colChar === 'W' ? 'W' : colChar === 'B' ? 'B' : null;
        let result: GameResult = '*';
        let pts = 0;
        let isOTB = false;

        if (resChar === '1') {
          result = color === 'W' ? '1-0' : '0-1';
          pts = 1.0;
          isOTB = true;
        } else if (resChar === '0') {
          result = color === 'W' ? '0-1' : '1-0';
          pts = 0.0;
          isOTB = true;
        } else if (resChar === '=') {
          result = '1/2-1/2';
          pts = 0.5;
          isOTB = true;
        } else if (resChar === '+') {
          result = color === 'W' ? '+ -' : '- +';
          pts = 1.0;
        } else if (resChar === '-') {
          result = color === 'W' ? '- +' : '+ -';
          pts = 0.0;
        } else if (resChar === 'U') {
          result = 'PAB';
          pts = 1.0;
        } else if (resChar === 'H') {
          result = 'HPB';
          pts = 0.5;
        } else if (resChar === 'Z') {
          result = 'ZPB';
          pts = 0.0;
        }

        history.push({
          round: r + 1,
          opponentTpn: isNaN(oppTpn) || oppTpn === 0 ? null : oppTpn,
          color,
          result,
          pointsAwarded: pts,
          isPlayedOTB: isOTB,
          float: 'NONE',
        });
      }

      players.push({
        id: `player-${tpn}`,
        tpn,
        fideId,
        name,
        rating,
        title,
        federation: fed,
        isActive: true,
        isWithdrawn: false,
        history,
        score,
        colorHistory: [],
        colorDifference: 0,
        colorPreference: 'NONE',
        isTopscorer: false,
        receivedPAB: false,
        receivedForfeitWin: false,
      });
    }
  }

  if (maxRoundsSeen > 0) {
    settings.totalRounds = Math.max(settings.totalRounds, maxRoundsSeen);
  }

  const updatedPlayers = players.map((p) =>
    updatePlayerDynamicStats(p, maxRoundsSeen, settings.totalRounds)
  );

  return {
    id: `tourn-${Date.now()}`,
    settings,
    players: updatedPlayers,
    currentRound: maxRoundsSeen || 1,
    rounds: [],
  };
}
