export type FideTitle = 'GM' | 'IM' | 'WGM' | 'FM' | 'WIM' | 'CM' | 'WFM' | 'WCM' | 'None';

export type GameResult = 
  | '1-0'      // White wins OTB
  | '0-1'      // Black wins OTB
  | '1/2-1/2'  // Draw OTB
  | '+ -'      // White wins by forfeit (unplayed)
  | '- +'      // Black wins by forfeit (unplayed)
  | '- -'      // Double forfeit (unplayed)
  | 'PAB'      // Pairing-Allocated Bye (+1.0)
  | 'HPB'      // Half-Point Bye requested (+0.5)
  | 'ZPB'      // Zero-Point Bye requested (+0.0)
  | '*';       // Ongoing / Not yet played

export type Color = 'W' | 'B';

export type ColorPreferenceType = 
  | 'ABS_W' 
  | 'ABS_B' 
  | 'STR_W' 
  | 'STR_B' 
  | 'MLD_W' 
  | 'MLD_B' 
  | 'NONE';

export type FloatType = 'UF' | 'DF' | 'NONE';

export interface PlayerRoundData {
  round: number;
  opponentTpn: number | null; // null if bye
  color: Color | null;
  result: GameResult;
  pointsAwarded: number;
  isPlayedOTB: boolean;
  float: FloatType;
}

export interface Player {
  id: string;
  tpn: number;             // Tournament Pairing Number (1..N)
  fideId?: string;
  name: string;            // "LastName, FirstName"
  rating: number;          // 0 if unrated
  title: FideTitle;
  federation: string;      // 3-letter FIDE code, e.g. "USA", "IND", "GER"
  isActive: boolean;       // Present for pairing
  isWithdrawn: boolean;    // Dropped out
  requestedByeRound?: number; // Round where player requested HPB or ZPB
  requestedByeType?: 'HPB' | 'ZPB';
  
  // History & Dynamic Stats
  history: PlayerRoundData[];
  score: number;           // Total points accumulated
  virtualScore?: number;   // Baku virtual points if active
  colorHistory: Color[];   // Strictly over-the-board played colors
  colorDifference: number; // count(W) - count(B)
  colorPreference: ColorPreferenceType;
  isTopscorer: boolean;
  receivedPAB: boolean;
  receivedForfeitWin: boolean;
}

export interface BoardPairing {
  boardNumber: number;
  whiteTpn: number;
  blackTpn: number;
  result: GameResult;
  isManualOverride?: boolean;
  violationBadges?: string[];
}

export interface ByeAllocation {
  playerTpn: number;
  type: 'PAB' | 'HPB' | 'ZPB';
  points: number;
}

export interface Round {
  roundNumber: number;
  isPaired: boolean;
  isCompleted: boolean;
  pairings: BoardPairing[];
  byes: ByeAllocation[];
  pairedAt?: string;
}

export type TieBreakType = 
  | 'BH_C1'  // Buchholz Cut 1 (FIDE C.07)
  | 'BH'     // Buchholz Total
  | 'BH_C2'  // Buchholz Cut 2
  | 'BH_M1'  // Median Buchholz
  | 'SB'     // Sonneborn-Berger with Virtual Opponents
  | 'DE'     // Direct Encounter
  | 'WIN'    // Most Wins (OTB only)
  | 'BWG'    // Most Wins with Black (OTB only)
  | 'ARO'    // Average Rating of Opponents
  | 'PS';    // Progressive Score

export interface TournamentSettings {
  name: string;
  city: string;
  federation: string;
  startDate: string;
  endDate: string;
  totalRounds: number;
  initialColor: Color;        // Drawn color for seed #1 in Round 1 (default 'W')
  enableBakuAcceleration: boolean;
  tieBreaks: TieBreakType[];
  chiefArbiter: string;
  deputyArbiter: string;
  timeControl: string;
}

export interface Tournament {
  id: string;
  settings: TournamentSettings;
  players: Player[];
  currentRound: number;
  rounds: Round[];
}

export interface PlayerStanding {
  rank: number;
  tpn: number;
  name: string;
  title: FideTitle;
  federation: string;
  rating: number;
  score: number;
  tieBreaks: Record<TieBreakType, number>;
  colorBalance: number;
  roundsPlayed: number;
}
