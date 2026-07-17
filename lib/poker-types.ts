/**
 * Core poker domain models.
 *
 * Dates use the ISO `YYYY-MM-DD` format and every monetary value is expressed
 * in whole US dollars. Tournament and cash-game records are discriminated by
 * `status`, so an upcoming event cannot accidentally contain completed results.
 */

export type ISODate = string;
export type EventStatus = "completed" | "upcoming";
export type PlayerName = string;
export type TournamentPlacement = number | `T-${number}`;

export interface TournamentBase {
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  venue: string;
  initialBuyIn: number;
}

export interface CompletedTournamentPlayer {
  name: PlayerName;
  /** Initial entry plus every rebuy. */
  totalBuyIn: number;
  placement: TournamentPlacement;
  eliminationRound: string;
  placementPayout: number;
  bonusPayout: number;
}

export interface UpcomingTournamentPlayer {
  name: PlayerName;
  /** Amount already committed to the event, normally the initial buy-in. */
  totalBuyIn: number;
}

export type TournamentPlayer =
  | CompletedTournamentPlayer
  | UpcomingTournamentPlayer;

export interface CompletedTournament extends TournamentBase {
  status: "completed";
  players: CompletedTournamentPlayer[];
}

export interface UpcomingTournament extends TournamentBase {
  status: "upcoming";
  startTime: string;
  players: UpcomingTournamentPlayer[];
}

export type Tournament = CompletedTournament | UpcomingTournament;

export interface CashGameBase {
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  venue: string;
  initialBuyIn: number;
}

export interface CompletedCashGamePlayer {
  name: PlayerName;
  amountBuyIn: number;
  amountAtEnd: number;
}

export interface UpcomingCashGamePlayer {
  name: PlayerName;
  amountBuyIn: number;
}

export type CashGamePlayer = CompletedCashGamePlayer | UpcomingCashGamePlayer;

export interface CompletedCashGame extends CashGameBase {
  status: "completed";
  players: CompletedCashGamePlayer[];
}

export interface UpcomingCashGame extends CashGameBase {
  status: "upcoming";
  startTime: string;
  players: UpcomingCashGamePlayer[];
}

export type CashGame = CompletedCashGame | UpcomingCashGame;

export interface TournamentStanding {
  name: PlayerName;
  tournamentsPlayed: number;
  wins: number;
  topThreeFinishes: number;
  inTheMoneyFinishes: number;
  cashRate: number;
  totalBuyIn: number;
  placementWinnings: number;
  bonusWinnings: number;
  amountWon: number;
  netProfit: number;
  averagePayout: number;
  averageFinish: number | null;
  highestFinish: TournamentPlacement | null;
  lowestFinish: TournamentPlacement | null;
  returnOnInvestment: number;
}

export interface CashGameStanding {
  name: PlayerName;
  gamesPlayed: number;
  winningSessions: number;
  winRate: number;
  totalBuyIn: number;
  totalCashedOut: number;
  netProfit: number;
  averageBuyIn: number;
  averageProfitLoss: number;
  biggestWin: number | null;
  biggestLoss: number | null;
  returnOnInvestment: number;
}

export interface MonthlyProfitPoint {
  /** Machine-friendly month key in `YYYY-MM` format. */
  month: string;
  /** Short display label, for example `Jan 2026`. */
  label: string;
  tournamentProfit: number;
  cashGameProfit: number;
  totalProfit: number;
}

export interface TournamentHistoryItem {
  eventType: "tournament";
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  placement: TournamentPlacement;
  totalBuyIn: number;
  totalPayout: number;
  netProfit: number;
}

export interface CashGameHistoryItem {
  eventType: "cash-game";
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  amountBuyIn: number;
  amountAtEnd: number;
  netProfit: number;
}

export type PlayerHistoryItem = TournamentHistoryItem | CashGameHistoryItem;

export interface PlayerProfile {
  name: PlayerName;
  slug: string;
  tournaments: TournamentStanding;
  cashGames: CashGameStanding;
  eventsPlayed: number;
  eventsHosted: number;
  combinedBuyIn: number;
  combinedWinnings: number;
  combinedNetProfit: number;
  history: PlayerHistoryItem[];
  monthlyProfit: MonthlyProfitPoint[];
}

export interface RecentTournamentActivity {
  eventType: "tournament";
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  status: EventStatus;
  playerCount: number;
  prizePool: number;
}

export interface RecentCashGameActivity {
  eventType: "cash-game";
  id: string;
  slug: string;
  title: string;
  date: ISODate;
  host: PlayerName;
  status: EventStatus;
  playerCount: number;
  totalBuyIn: number;
}

export type RecentActivity = RecentTournamentActivity | RecentCashGameActivity;
