import {
  CandidatePlayer,
  EligibilityRules,
  FideTitle,
  seedPlayersAndAssignTPN,
  TournamentState,
} from '../lib/fideSwissEngine';

export const DEFAULT_RULES: EligibilityRules = {
  minPlayers: 2,
  maxPlayers: 200,
  minRating: null,
  maxRating: null,
  allowUnrated: true,
  minAge: null,
  maxAge: null,
  allowedGender: 'OPEN',
  allowedOrganizations: [],
};

const MASTER_ROSTER: Array<{
  name: string;
  rating: number;
  title: FideTitle;
  birthYear: number;
  gender: 'M' | 'F' | 'OTHER';
  organization: string;
  fideId: string;
}> = [
  { name: 'Carlsen, Magnus', rating: 2832, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Offerspill Chess Club', fideId: '1503014' },
  { name: 'Nakamura, Hikaru', rating: 2802, title: 'GM', birthYear: 1987, gender: 'M', organization: 'US Chess Federation', fideId: '2016192' },
  { name: 'Caruana, Fabiano', rating: 2798, title: 'GM', birthYear: 1992, gender: 'M', organization: 'Saint Louis Chess Club', fideId: '2020009' },
  { name: 'Erigaisi, Arjun', rating: 2797, title: 'GM', birthYear: 2003, gender: 'M', organization: 'Telangana Chess Academy', fideId: '35009192' },
  { name: 'Gukesh, D', rating: 2794, title: 'GM', birthYear: 2006, gender: 'M', organization: 'WACA Academy', fideId: '46616543' },
  { name: 'Abdusattorov, Nodirbek', rating: 2777, title: 'GM', birthYear: 2004, gender: 'M', organization: 'Tashkent Chess Club', fideId: '14204118' },
  { name: 'Firouzja, Alireza', rating: 2767, title: 'GM', birthYear: 2003, gender: 'M', organization: 'Chartres Chess Club', fideId: '12573981' },
  { name: 'Wei, Yi', rating: 2762, title: 'GM', birthYear: 1999, gender: 'M', organization: 'Jiangsu Chess Team', fideId: '8603405' },
  { name: 'Nepomniachtchi, Ian', rating: 2755, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Central Chess Club', fideId: '4152956' },
  { name: 'So, Wesley', rating: 2751, title: 'GM', birthYear: 1993, gender: 'M', organization: 'Minnesota Chess', fideId: '5202213' },
  { name: 'Praggnanandhaa, R', rating: 2749, title: 'GM', birthYear: 2005, gender: 'M', organization: 'Velammal Chess Academy', fideId: '25059530' },
  { name: 'Dominguez Perez, Leinier', rating: 2748, title: 'GM', birthYear: 1983, gender: 'M', organization: 'Saint Louis Chess Club', fideId: '3503240' },
  { name: 'Giri, Anish', rating: 2738, title: 'GM', birthYear: 1994, gender: 'M', organization: 'Royal Dutch Chess', fideId: '24116068' },
  { name: 'Mamedyarov, Shakhriyar', rating: 2734, title: 'GM', birthYear: 1985, gender: 'M', organization: 'Baku Chess Academy', fideId: '13401319' },
  { name: 'Duda, Jan-Krzysztof', rating: 2733, title: 'GM', birthYear: 1998, gender: 'M', organization: 'Polonia Wroclaw', fideId: '1170544' },
  { name: 'Vachier-Lagrave, Maxime', rating: 2732, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Clichy Chess Club', fideId: '623539' },
  { name: 'Le, Quang Liem', rating: 2731, title: 'GM', birthYear: 1991, gender: 'M', organization: 'Webster University', fideId: '12401586' },
  { name: 'Keymer, Vincent', rating: 2730, title: 'GM', birthYear: 2004, gender: 'M', organization: 'OSG Baden-Baden', fideId: '12940690' },
  { name: 'Aronian, Levon', rating: 2729, title: 'GM', birthYear: 1982, gender: 'M', organization: 'Saint Louis Chess Club', fideId: '13300881' },
  { name: 'Vidit, Santosh Gujrathi', rating: 2726, title: 'GM', birthYear: 1994, gender: 'M', organization: 'Nashik Chess', fideId: '5029465' },
  { name: 'Maghsoodloo, Parham', rating: 2720, title: 'GM', birthYear: 2000, gender: 'M', organization: 'Tehran Chess Club', fideId: '12539929' },
  { name: 'Rapport, Richard', rating: 2715, title: 'GM', birthYear: 1996, gender: 'M', organization: 'Budapest Chess', fideId: '738590' },
  { name: 'Fedoseev, Vladimir', rating: 2712, title: 'GM', birthYear: 1995, gender: 'M', organization: 'Maribor Chess Club', fideId: '24130737' },
  { name: 'Niemann, Hans Moke', rating: 2711, title: 'GM', birthYear: 2003, gender: 'M', organization: 'Marshall Chess Club', fideId: '2093596' },
  { name: 'Yu, Yangyi', rating: 2710, title: 'GM', birthYear: 1994, gender: 'M', organization: 'Beijing Chess', fideId: '8603642' },
  { name: 'Radjabov, Teimour', rating: 2700, title: 'GM', birthYear: 1987, gender: 'M', organization: 'Baku Chess Academy', fideId: '13400924' },
  { name: 'Aravindh, Chithambaram', rating: 2698, title: 'GM', birthYear: 1999, gender: 'M', organization: 'ONGC Chess', fideId: '5072786' },
  { name: 'Robson, Ray', rating: 2696, title: 'GM', birthYear: 1994, gender: 'M', organization: 'Webster University', fideId: '2023970' },
  { name: 'Deac, Bogdan-Daniel', rating: 2692, title: 'GM', birthYear: 2001, gender: 'M', organization: 'Bucharest Chess', fideId: '1226380' },
  { name: 'Sevian, Samuel', rating: 2689, title: 'GM', birthYear: 2000, gender: 'M', organization: 'Boston Chess Club', fideId: '2040506' },
  { name: 'Tabatabaei, M. Amin', rating: 2686, title: 'GM', birthYear: 2001, gender: 'M', organization: 'Tehran Chess Club', fideId: '12521213' },
  { name: 'Sindarov, Javokhir', rating: 2684, title: 'GM', birthYear: 2005, gender: 'M', organization: 'Tashkent Chess Club', fideId: '14205408' },
  { name: 'Sarana, Alexey', rating: 2679, title: 'GM', birthYear: 2000, gender: 'M', organization: 'Belgrade Chess Club', fideId: '24133795' },
  { name: 'Shevchenko, Kirill', rating: 2678, title: 'GM', birthYear: 2002, gender: 'M', organization: 'Bucharest Chess', fideId: '14129574' },
  { name: 'Van Foreest, Jorden', rating: 2671, title: 'GM', birthYear: 1999, gender: 'M', organization: 'Groningen Chess', fideId: '1039784' },
  { name: 'Esipenko, Andrey', rating: 2671, title: 'GM', birthYear: 2002, gender: 'M', organization: 'Rostov Chess', fideId: '24175439' },
  { name: 'Nihal, Sarin', rating: 2668, title: 'GM', birthYear: 2004, gender: 'M', organization: 'Thrissur Chess', fideId: '25072782' },
  { name: 'Shankland, Sam', rating: 2665, title: 'GM', birthYear: 1991, gender: 'M', organization: 'Mechanics Institute', fideId: '2004887' },
  { name: 'Saric, Ivan', rating: 2662, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Zagreb Chess', fideId: '14508150' },
  { name: 'Volokitin, Andrei', rating: 2660, title: 'GM', birthYear: 1986, gender: 'M', organization: 'Lviv Chess', fideId: '14107090' },
  { name: 'Korobov, Anton', rating: 2658, title: 'GM', birthYear: 1985, gender: 'M', organization: 'Kyiv Chess', fideId: '14105730' },
  { name: 'Vallejo Pons, Francisco', rating: 2657, title: 'GM', birthYear: 1982, gender: 'M', organization: 'Menorca Chess', fideId: '2205530' },
  { name: 'Grandelius, Nils', rating: 2656, title: 'GM', birthYear: 1993, gender: 'M', organization: 'Malmo Chess', fideId: '1710400' },
  { name: 'Ponomariov, Ruslan', rating: 2654, title: 'GM', birthYear: 1983, gender: 'M', organization: 'Donetsk Chess', fideId: '14103320' },
  { name: 'Bjerre, Jonas Buhl', rating: 2653, title: 'GM', birthYear: 2004, gender: 'M', organization: 'Skanderborg Chess', fideId: '1444948' },
  { name: 'Sadhwani, Raunak', rating: 2652, title: 'GM', birthYear: 2005, gender: 'M', organization: 'Nagpur Chess', fideId: '35093487' },
  { name: 'Bluebaum, Matthias', rating: 2650, title: 'GM', birthYear: 1995, gender: 'M', organization: 'SV Werder Bremen', fideId: '24651516' },
  { name: 'Cheparinov, Ivan', rating: 2650, title: 'GM', birthYear: 1986, gender: 'M', organization: 'Sofia Chess', fideId: '2905540' },
  { name: 'Narayanan, S.L.', rating: 2650, title: 'GM', birthYear: 1998, gender: 'M', organization: 'Trivandrum Chess', fideId: '5058422' },
  { name: 'Abasov, Nijat', rating: 2646, title: 'GM', birthYear: 1995, gender: 'M', organization: 'Baku Chess Academy', fideId: '13402960' },
  { name: 'Kovalenko, Igor', rating: 2645, title: 'GM', birthYear: 1988, gender: 'M', organization: 'Kyiv Chess', fideId: '14116995' },
  { name: 'Santos Latasa, Jaime', rating: 2645, title: 'GM', birthYear: 1996, gender: 'M', organization: 'Madrid Chess', fideId: '2293218' },
  { name: 'Inarkiev, Ernesto', rating: 2640, title: 'GM', birthYear: 1985, gender: 'M', organization: 'Moscow Chess', fideId: '4162722' },
  { name: 'Kollbars, Dmitrij', rating: 2640, title: 'GM', birthYear: 1987, gender: 'M', organization: 'Bremen Chess', fideId: '4658097' },
  { name: 'Kuzubov, Yuriy', rating: 2638, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Kramatorsk Chess', fideId: '14112906' },
  { name: 'Yilmaz, Mustafa', rating: 2635, title: 'GM', birthYear: 1992, gender: 'M', organization: 'Ankara Chess', fideId: '6302717' },
  { name: 'Mishra, Abhimanyu', rating: 2634, title: 'GM', birthYear: 2009, gender: 'M', organization: 'New Jersey Chess', fideId: '30920019' },
  { name: 'Gledura, Benjamin', rating: 2632, title: 'GM', birthYear: 1999, gender: 'M', organization: 'Eger Chess', fideId: '745022' },
  { name: 'Nguyen, Ngoc Truong Son', rating: 2630, title: 'GM', birthYear: 1990, gender: 'M', organization: 'Vietnam Chess', fideId: '12401136' },
  { name: 'Svane, Rasmus', rating: 2628, title: 'GM', birthYear: 1997, gender: 'M', organization: 'Lubeck Chess', fideId: '24603295' },
  { name: 'Bartel, Mateusz', rating: 2615, title: 'GM', birthYear: 1985, gender: 'M', organization: 'Warsaw Chess', fideId: '1113109' },
  { name: 'Motylev, Alexander', rating: 2605, title: 'GM', birthYear: 1979, gender: 'M', organization: 'Bucharest Chess', fideId: '4121830' },
  { name: 'Pranesh, M', rating: 2600, title: 'GM', birthYear: 2006, gender: 'M', organization: 'Madurai Chess', fideId: '35028561' },
  { name: 'Piorun, Kacper', rating: 2595, title: 'GM', birthYear: 1991, gender: 'M', organization: 'Warsaw Chess', fideId: '1123406' },
];

export function get64DemoCandidates(): CandidatePlayer[] {
  const rawList: CandidatePlayer[] = MASTER_ROSTER.map((m, idx) => ({
    id: `cand-${idx + 1}`,
    name: m.name,
    rating: m.rating,
    title: m.title,
    birthYear: m.birthYear,
    gender: m.gender,
    organization: m.organization,
    fideId: m.fideId,
    isActive: true,
    requestedByes: {},
    tpn: 0,
    score: 0,
    roundsWon: 0,
    otbWins: 0,
    otbBlackWins: 0,
    roundsDrawn: 0,
    roundsLost: 0,
    receivedPABOrForfeitWin: false,
    history: [],
    tieBreaks: {
      buchholzCut1: 0,
      buchholzTotal: 0,
      sonnebornBerger: 0,
      progressiveScore: 0,
      directEncounter: 0,
      mostWins: 0,
    },
  }));

  return seedPlayersAndAssignTPN(rawList);
}

export function createInitialTournamentState(): TournamentState {
  return {
    id: `tourn-${Date.now()}`,
    name: '',
    tournamentYear: new Date().getFullYear(),
    totalRounds: 5,
    currentRound: 1,
    topSeedInitialColor: 'W',
    status: 'REGISTRATION',
    rules: { ...DEFAULT_RULES },
    players: [],
    rounds: [],
  };
}
