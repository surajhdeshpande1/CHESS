import { assignInitialTPNs } from '../engine/ranking';
import { FideTitle, Player, Tournament, TournamentSettings } from '../types/chess';

export const INITIAL_SETTINGS: TournamentSettings = {
  name: 'FIDE Masters World Swiss Championship 2026',
  city: 'Baku',
  federation: 'AZE',
  startDate: '2026-10-20',
  endDate: '2026-10-28',
  totalRounds: 9,
  initialColor: 'W',
  enableBakuAcceleration: false,
  tieBreaks: ['BH_C1', 'BH', 'SB', 'DE', 'WIN'],
  chiefArbiter: 'IA Laurent Freyd',
  deputyArbiter: 'IA Shohreh Bayat',
  timeControl: '90m/40 moves + 30m + 30s/move',
};

const SAMPLE_MASTER_PLAYERS: { name: string; rating: number; title: FideTitle; federation: string; fideId: string }[] = [
  { name: 'Carlsen, Magnus', rating: 2832, title: 'GM', federation: 'NOR', fideId: '1503014' },
  { name: 'Nakamura, Hikaru', rating: 2802, title: 'GM', federation: 'USA', fideId: '2016192' },
  { name: 'Caruana, Fabiano', rating: 2798, title: 'GM', federation: 'USA', fideId: '2020009' },
  { name: 'Gukesh, D', rating: 2794, title: 'GM', federation: 'IND', fideId: '46616543' },
  { name: 'Firouzja, Alireza', rating: 2767, title: 'GM', federation: 'FRA', fideId: '12573981' },
  { name: 'Erigaisi, Arjun', rating: 2797, title: 'GM', federation: 'IND', fideId: '35009192' },
  { name: 'Praggnanandhaa, R', rating: 2749, title: 'GM', federation: 'IND', fideId: '25059530' },
  { name: 'Abdusattorov, Nodirbek', rating: 2777, title: 'GM', federation: 'UZB', fideId: '14204118' },
  { name: 'Nepomniachtchi, Ian', rating: 2755, title: 'GM', federation: 'FID', fideId: '4152956' },
  { name: 'So, Wesley', rating: 2751, title: 'GM', federation: 'USA', fideId: '5202213' },
  { name: 'Wei, Yi', rating: 2762, title: 'GM', federation: 'CHN', fideId: '8603405' },
  { name: 'Duda, Jan-Krzysztof', rating: 2733, title: 'GM', federation: 'POL', fideId: '1170544' },
  { name: 'Giri, Anish', rating: 2738, title: 'GM', federation: 'NED', fideId: '24116068' },
  { name: 'Vachier-Lagrave, Maxime', rating: 2732, title: 'GM', federation: 'FRA', fideId: '623539' },
  { name: 'Aronian, Levon', rating: 2729, title: 'GM', federation: 'USA', fideId: '13300881' },
  { name: 'Vidit, Santosh Gujrathi', rating: 2726, title: 'GM', federation: 'IND', fideId: '5029465' },
  { name: 'Keymer, Vincent', rating: 2730, title: 'GM', federation: 'GER', fideId: '12940690' },
  { name: 'Dominguez Perez, Leinier', rating: 2748, title: 'GM', federation: 'USA', fideId: '3503240' },
  { name: 'Maghsoodloo, Parham', rating: 2720, title: 'GM', federation: 'IRI', fideId: '12539929' },
  { name: 'Rapport, Richard', rating: 2715, title: 'GM', federation: 'HUN', fideId: '738590' },
  { name: 'Yu, Yangyi', rating: 2710, title: 'GM', federation: 'CHN', fideId: '8603642' },
  { name: 'Mamedyarov, Shakhriyar', rating: 2734, title: 'GM', federation: 'AZE', fideId: '13401319' },
  { name: 'Radjabov, Teimour', rating: 2700, title: 'GM', federation: 'AZE', fideId: '13400924' },
  { name: 'Deac, Bogdan-Daniel', rating: 2692, title: 'GM', federation: 'ROU', fideId: '1226380' },
  { name: 'Sindarov, Javokhir', rating: 2684, title: 'GM', federation: 'UZB', fideId: '14205408' },
  { name: 'Niemann, Hans Moke', rating: 2711, title: 'GM', federation: 'USA', fideId: '2093596' },
  { name: 'Sarana, Alexey', rating: 2679, title: 'GM', federation: 'SRB', fideId: '24133795' },
  { name: 'Van Foreest, Jorden', rating: 2671, title: 'GM', federation: 'NED', fideId: '1039784' },
  { name: 'Shevchenko, Kirill', rating: 2678, title: 'GM', federation: 'ROU', fideId: '14129574' },
  { name: 'Esipenko, Andrey', rating: 2671, title: 'GM', federation: 'FID', fideId: '24175439' },
  { name: 'Korobov, Anton', rating: 2658, title: 'GM', federation: 'UKR', fideId: '14105730' },
  { name: 'Grandelius, Nils', rating: 2656, title: 'GM', federation: 'SWE', fideId: '1710400' },
  { name: 'Narayanan, S.L.', rating: 2650, title: 'GM', federation: 'IND', fideId: '5058422' },
  { name: 'Sadhwani, Raunak', rating: 2652, title: 'GM', federation: 'IND', fideId: '35093487' },
  { name: 'Abasov, Nijat', rating: 2646, title: 'GM', federation: 'AZE', fideId: '13402960' },
  { name: 'Aravindh, Chithambaram', rating: 2698, title: 'GM', federation: 'IND', fideId: '5072786' },
  { name: 'Nihal, Sarin', rating: 2668, title: 'GM', federation: 'IND', fideId: '25072782' },
  { name: 'Shankland, Sam', rating: 2665, title: 'GM', federation: 'USA', fideId: '2004887' },
  { name: 'Robson, Ray', rating: 2696, title: 'GM', federation: 'USA', fideId: '2023970' },
  { name: 'Fedoseev, Vladimir', rating: 2712, title: 'GM', federation: 'SLO', fideId: '24130737' },
  { name: 'Sevian, Samuel', rating: 2689, title: 'GM', federation: 'USA', fideId: '2040506' },
  { name: 'Tabatabaei, M. Amin', rating: 2686, title: 'GM', federation: 'IRI', fideId: '12521213' },
  { name: 'Volokitin, Andrei', rating: 2660, title: 'GM', federation: 'UKR', fideId: '14107090' },
  { name: 'Bjerre, Jonas Buhl', rating: 2653, title: 'GM', federation: 'DEN', fideId: '1444948' },
  { name: 'Saric, Ivan', rating: 2662, title: 'GM', federation: 'CRO', fideId: '14508150' },
  { name: 'Vallejo Pons, Francisco', rating: 2657, title: 'GM', federation: 'ESP', fideId: '2205530' },
  { name: 'Cheparinov, Ivan', rating: 2650, title: 'GM', federation: 'BUL', fideId: '2905540' },
  { name: 'Ponomariov, Ruslan', rating: 2654, title: 'GM', federation: 'UKR', fideId: '14103320' },
  { name: 'Santos Latasa, Jaime', rating: 2645, title: 'GM', federation: 'ESP', fideId: '2293218' },
  { name: 'Bluebaum, Matthias', rating: 2650, title: 'GM', federation: 'GER', fideId: '24651516' },
  { name: 'Kollbars, Dmitrij', rating: 2640, title: 'GM', federation: 'GER', fideId: '4658097' },
  { name: 'Kuzubov, Yuriy', rating: 2638, title: 'GM', federation: 'UKR', fideId: '14112906' },
  { name: 'Yilmaz, Mustafa', rating: 2635, title: 'GM', federation: 'TUR', fideId: '6302717' },
  { name: 'Gledura, Benjamin', rating: 2632, title: 'GM', federation: 'HUN', fideId: '745022' },
  { name: 'Svane, Rasmus', rating: 2628, title: 'GM', federation: 'GER', fideId: '24603295' },
  { name: 'Mishra, Abhimanyu', rating: 2634, title: 'GM', federation: 'USA', fideId: '30920019' },
  { name: 'Pranesh, M', rating: 2600, title: 'GM', federation: 'IND', fideId: '35028561' },
  { name: 'Bartel, Mateusz', rating: 2615, title: 'GM', federation: 'POL', fideId: '1113109' },
  { name: 'Piorun, Kacper', rating: 2595, title: 'GM', federation: 'POL', fideId: '1123406' },
  { name: 'Nguyen, Ngoc Truong Son', rating: 2630, title: 'GM', federation: 'VIE', fideId: '12401136' },
  { name: 'Le, Quang Liem', rating: 2731, title: 'GM', federation: 'VIE', fideId: '12401586' },
  { name: 'Inarkiev, Ernesto', rating: 2640, title: 'GM', federation: 'FID', fideId: '4162722' },
  { name: 'Kovalenko, Igor', rating: 2645, title: 'GM', federation: 'UKR', fideId: '14116995' },
  { name: 'Motylev, Alexander', rating: 2605, title: 'GM', federation: 'ROU', fideId: '4121830' },
];

export function getSample64Players(): Player[] {
  const rawPlayers: Player[] = SAMPLE_MASTER_PLAYERS.map((m, idx) => ({
    id: `seed-player-${idx + 1}`,
    tpn: 0,
    fideId: m.fideId,
    name: m.name,
    rating: m.rating,
    title: m.title,
    federation: m.federation,
    isActive: true,
    isWithdrawn: false,
    history: [],
    score: 0,
    colorHistory: [],
    colorDifference: 0,
    colorPreference: 'NONE',
    isTopscorer: false,
    receivedPAB: false,
    receivedForfeitWin: false,
  }));

  return assignInitialTPNs(rawPlayers);
}

export function generateCustomPlayerPool(totalPlayers: number): Player[] {
  const titles: FideTitle[] = ['GM', 'IM', 'FM', 'CM', 'None'];
  const feds = ['USA', 'IND', 'GER', 'FRA', 'UZB', 'CHN', 'POL', 'NED', 'ESP', 'NOR', 'AZE', 'ARM'];
  const surnames = ['Smith', 'Mueller', 'Garcia', 'Ivanov', 'Sharma', 'Patel', 'Dubois', 'Silva', 'Kim', 'Tanaka', 'Wang', 'Rossi', 'Andersson', 'Popov', 'Kowalski', 'Hansen'];
  const firstnames = ['Alex', 'David', 'Elena', 'Lucas', 'Maya', 'Marco', 'Sofia', 'Liam', 'Oliver', 'Noah', 'Mia', 'Chloe', 'Arjun', 'Leon', 'Daniel', 'Viktor'];

  const rawList: Player[] = [];

  for (let i = 0; i < totalPlayers; i++) {
    if (i < SAMPLE_MASTER_PLAYERS.length) {
      const m = SAMPLE_MASTER_PLAYERS[i];
      rawList.push({
        id: `gen-player-${i + 1}`,
        tpn: 0,
        fideId: m.fideId,
        name: m.name,
        rating: m.rating,
        title: m.title,
        federation: m.federation,
        isActive: true,
        isWithdrawn: false,
        history: [],
        score: 0,
        colorHistory: [],
        colorDifference: 0,
        colorPreference: 'NONE',
        isTopscorer: false,
        receivedPAB: false,
        receivedForfeitWin: false,
      });
    } else {
      const surname = surnames[i % surnames.length];
      const firstname = firstnames[(i * 3) % firstnames.length];
      const fed = feds[i % feds.length];
      const rating = Math.max(1400, 2600 - (i * 8));
      const title = rating > 2500 ? 'GM' : rating > 2400 ? 'IM' : rating > 2300 ? 'FM' : rating > 2200 ? 'CM' : 'None';

      rawList.push({
        id: `gen-player-${i + 1}`,
        tpn: 0,
        fideId: `${1000000 + i}`,
        name: `${surname}, ${firstname}`,
        rating,
        title,
        federation: fed,
        isActive: true,
        isWithdrawn: false,
        history: [],
        score: 0,
        colorHistory: [],
        colorDifference: 0,
        colorPreference: 'NONE',
        isTopscorer: false,
        receivedPAB: false,
        receivedForfeitWin: false,
      });
    }
  }

  return assignInitialTPNs(rawList);
}

export function createInitialTournament(playerCount = 64): Tournament {
  const players = playerCount === 64 ? getSample64Players() : generateCustomPlayerPool(playerCount);
  return {
    id: `fide-tourn-${Date.now()}`,
    settings: { ...INITIAL_SETTINGS },
    players,
    currentRound: 1,
    rounds: [],
  };
}
