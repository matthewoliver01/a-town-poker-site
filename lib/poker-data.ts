import type {
  CashGame,
  CashGameHistoryItem,
  CashGameStanding,
  CompletedCashGame,
  CompletedTournament,
  MonthlyProfitPoint,
  PlayerHistoryItem,
  PlayerName,
  PlayerProfile,
  RecentActivity,
  RecentCashGameActivity,
  RecentTournamentActivity,
  Tournament,
  TournamentHistoryItem,
  TournamentPlacement,
  TournamentStanding,
  UpcomingCashGame,
  UpcomingTournament,
} from "./poker-types";
import {
  compareTournamentPlacements,
  placementRank,
  placementSortValue,
} from "./poker-placement";

const round = (value: number, digits = 2): number => {
  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

const byNewestDate = <T extends { date: string }>(a: T, b: T): number =>
  b.date.localeCompare(a.date);

const byOldestDate = <T extends { date: string }>(a: T, b: T): number =>
  a.date.localeCompare(b.date);

const total = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0);

const monthKey = (date: string): string => date.slice(0, 7);

export const toPlayerSlug = (name: PlayerName): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const monthsBetween = (start: string, end: string): string[] => {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const months: string[] = [];

  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
  }

  return months;
};

export const isCompletedTournament = (
  tournament: Tournament,
): tournament is CompletedTournament => tournament.status === "completed";

export const isUpcomingTournament = (
  tournament: Tournament,
): tournament is UpcomingTournament => tournament.status === "upcoming";

export const isCompletedCashGame = (
  cashGame: CashGame,
): cashGame is CompletedCashGame => cashGame.status === "completed";

export const isUpcomingCashGame = (
  cashGame: CashGame,
): cashGame is UpcomingCashGame => cashGame.status === "upcoming";

export const getCompletedTournaments = (
  tournaments: readonly Tournament[],
): CompletedTournament[] =>
  tournaments.filter(isCompletedTournament).sort(byNewestDate);

export const getUpcomingTournaments = (
  tournaments: readonly Tournament[],
): UpcomingTournament[] =>
  tournaments.filter(isUpcomingTournament).sort(byOldestDate);

export const getCompletedCashGames = (
  cashGames: readonly CashGame[],
): CompletedCashGame[] => cashGames.filter(isCompletedCashGame).sort(byNewestDate);

export const getUpcomingCashGames = (
  cashGames: readonly CashGame[],
): UpcomingCashGame[] => cashGames.filter(isUpcomingCashGame).sort(byOldestDate);

export const getTournamentBySlug = (
  tournaments: readonly Tournament[],
  slug: string,
): Tournament | undefined =>
  tournaments.find((tournament) => tournament.slug === slug);

export const getTournamentById = (
  tournaments: readonly Tournament[],
  id: string,
): Tournament | undefined =>
  tournaments.find((tournament) => tournament.id === id);

export const getCashGameBySlug = (
  cashGames: readonly CashGame[],
  slug: string,
): CashGame | undefined => cashGames.find((cashGame) => cashGame.slug === slug);

export const getCashGameById = (
  cashGames: readonly CashGame[],
  id: string,
): CashGame | undefined => cashGames.find((cashGame) => cashGame.id === id);

export const getTournamentPrizePool = (tournament: Tournament): number =>
  total(tournament.players.map((player) => player.totalBuyIn));

export const getTournamentPayoutTotal = (
  tournament: CompletedTournament,
): number =>
  total(
    tournament.players.map(
      (player) => player.placementPayout + player.bonusPayout,
    ),
  );

export const getCashGameTotalBuyIn = (cashGame: CashGame): number =>
  total(cashGame.players.map((player) => player.amountBuyIn));

export const getCashGameEndingTotal = (
  cashGame: CompletedCashGame,
): number => total(cashGame.players.map((player) => player.amountAtEnd));

export const isTournamentPrizePoolBalanced = (
  tournament: CompletedTournament,
): boolean => getTournamentPrizePool(tournament) === getTournamentPayoutTotal(tournament);

export const isCashGameBalanced = (cashGame: CompletedCashGame): boolean =>
  getCashGameTotalBuyIn(cashGame) === getCashGameEndingTotal(cashGame);

interface TournamentAccumulator {
  name: PlayerName;
  tournamentsPlayed: number;
  wins: number;
  topThreeFinishes: number;
  inTheMoneyFinishes: number;
  totalBuyIn: number;
  placementWinnings: number;
  bonusWinnings: number;
  placements: TournamentPlacement[];
}

export const getTournamentStandings = (
  tournaments: readonly Tournament[],
): TournamentStanding[] => {
  const accumulators = new Map<PlayerName, TournamentAccumulator>();

  for (const tournament of tournaments.filter(isCompletedTournament)) {
    for (const player of tournament.players) {
      const stats = accumulators.get(player.name) ?? {
        name: player.name,
        tournamentsPlayed: 0,
        wins: 0,
        topThreeFinishes: 0,
        inTheMoneyFinishes: 0,
        totalBuyIn: 0,
        placementWinnings: 0,
        bonusWinnings: 0,
        placements: [],
      };

      stats.tournamentsPlayed += 1;
      stats.wins += placementRank(player.placement) === 1 ? 1 : 0;
      stats.topThreeFinishes += placementRank(player.placement) <= 3 ? 1 : 0;
      stats.inTheMoneyFinishes += player.placementPayout > 0 ? 1 : 0;
      stats.totalBuyIn += player.totalBuyIn;
      stats.placementWinnings += player.placementPayout;
      stats.bonusWinnings += player.bonusPayout;
      stats.placements.push(player.placement);
      accumulators.set(player.name, stats);
    }
  }

  return [...accumulators.values()]
    .map((stats): TournamentStanding => {
      const amountWon = stats.placementWinnings + stats.bonusWinnings;
      const netProfit = amountWon - stats.totalBuyIn;

      return {
        name: stats.name,
        tournamentsPlayed: stats.tournamentsPlayed,
        wins: stats.wins,
        topThreeFinishes: stats.topThreeFinishes,
        inTheMoneyFinishes: stats.inTheMoneyFinishes,
        cashRate: round(
          (stats.inTheMoneyFinishes / stats.tournamentsPlayed) * 100,
          1,
        ),
        totalBuyIn: stats.totalBuyIn,
        placementWinnings: stats.placementWinnings,
        bonusWinnings: stats.bonusWinnings,
        amountWon,
        netProfit,
        averagePayout: round(amountWon / stats.tournamentsPlayed),
        averageFinish: round(
          total(stats.placements.map(placementSortValue)) /
            stats.tournamentsPlayed,
          1,
        ),
        highestFinish: [...stats.placements].sort(
          compareTournamentPlacements,
        )[0],
        lowestFinish: [...stats.placements].sort(
          compareTournamentPlacements,
        )[stats.placements.length - 1],
        returnOnInvestment: round((netProfit / stats.totalBuyIn) * 100, 1),
      };
    })
    .sort(
      (a, b) =>
        b.netProfit - a.netProfit ||
        b.amountWon - a.amountWon ||
        (a.averageFinish ?? Number.POSITIVE_INFINITY) -
          (b.averageFinish ?? Number.POSITIVE_INFINITY) ||
        a.name.localeCompare(b.name),
    );
};

interface CashAccumulator {
  name: PlayerName;
  gamesPlayed: number;
  winningSessions: number;
  totalBuyIn: number;
  totalCashedOut: number;
  sessionProfits: number[];
}

export const getCashGameStandings = (
  cashGames: readonly CashGame[],
): CashGameStanding[] => {
  const accumulators = new Map<PlayerName, CashAccumulator>();

  for (const cashGame of cashGames.filter(isCompletedCashGame)) {
    for (const player of cashGame.players) {
      const profit = player.amountAtEnd - player.amountBuyIn;
      const stats = accumulators.get(player.name) ?? {
        name: player.name,
        gamesPlayed: 0,
        winningSessions: 0,
        totalBuyIn: 0,
        totalCashedOut: 0,
        sessionProfits: [],
      };

      stats.gamesPlayed += 1;
      stats.winningSessions += profit > 0 ? 1 : 0;
      stats.totalBuyIn += player.amountBuyIn;
      stats.totalCashedOut += player.amountAtEnd;
      stats.sessionProfits.push(profit);
      accumulators.set(player.name, stats);
    }
  }

  return [...accumulators.values()]
    .map((stats): CashGameStanding => {
      const netProfit = stats.totalCashedOut - stats.totalBuyIn;

      return {
        name: stats.name,
        gamesPlayed: stats.gamesPlayed,
        winningSessions: stats.winningSessions,
        winRate: round((stats.winningSessions / stats.gamesPlayed) * 100, 1),
        totalBuyIn: stats.totalBuyIn,
        totalCashedOut: stats.totalCashedOut,
        netProfit,
        averageBuyIn: round(stats.totalBuyIn / stats.gamesPlayed),
        averageProfitLoss: round(netProfit / stats.gamesPlayed),
        biggestWin: Math.max(...stats.sessionProfits),
        biggestLoss: Math.min(...stats.sessionProfits),
        returnOnInvestment: round((netProfit / stats.totalBuyIn) * 100, 1),
      };
    })
    .sort(
      (a, b) =>
        b.netProfit - a.netProfit ||
        b.totalCashedOut - a.totalCashedOut ||
        a.name.localeCompare(b.name),
    );
};

export const getMonthlyProfitSeries = (
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
  playerName?: PlayerName,
): MonthlyProfitPoint[] => {
  const completedTournaments = tournaments.filter(isCompletedTournament);
  const completedCashGames = cashGames.filter(isCompletedCashGame);
  const completedDates = [
    ...completedTournaments.map((tournament) => tournament.date),
    ...completedCashGames.map((cashGame) => cashGame.date),
  ].sort();

  if (completedDates.length === 0) return [];

  const points = new Map<string, MonthlyProfitPoint>();
  for (const month of monthsBetween(
    monthKey(completedDates[0]),
    monthKey(completedDates[completedDates.length - 1]),
  )) {
    points.set(month, {
      month,
      label: monthLabel(month),
      tournamentProfit: 0,
      cashGameProfit: 0,
      totalProfit: 0,
    });
  }

  for (const tournament of completedTournaments) {
    const point = points.get(monthKey(tournament.date));
    if (!point) continue;

    for (const player of tournament.players) {
      if (playerName && player.name !== playerName) continue;
      point.tournamentProfit +=
        player.placementPayout + player.bonusPayout - player.totalBuyIn;
    }
  }

  for (const cashGame of completedCashGames) {
    const point = points.get(monthKey(cashGame.date));
    if (!point) continue;

    for (const player of cashGame.players) {
      if (playerName && player.name !== playerName) continue;
      point.cashGameProfit += player.amountAtEnd - player.amountBuyIn;
    }
  }

  return [...points.values()].map((point) => ({
    ...point,
    totalProfit: point.tournamentProfit + point.cashGameProfit,
  }));
};

export const getPlayerNames = (
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): PlayerName[] => {
  const names = new Set<PlayerName>();
  for (const tournament of tournaments) {
    tournament.players.forEach((player) => names.add(player.name));
  }
  for (const cashGame of cashGames) {
    cashGame.players.forEach((player) => names.add(player.name));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
};

const emptyTournamentStanding = (name: PlayerName): TournamentStanding => ({
  name,
  tournamentsPlayed: 0,
  wins: 0,
  topThreeFinishes: 0,
  inTheMoneyFinishes: 0,
  cashRate: 0,
  totalBuyIn: 0,
  placementWinnings: 0,
  bonusWinnings: 0,
  amountWon: 0,
  netProfit: 0,
  averagePayout: 0,
  averageFinish: null,
  highestFinish: null,
  lowestFinish: null,
  returnOnInvestment: 0,
});

const emptyCashGameStanding = (name: PlayerName): CashGameStanding => ({
  name,
  gamesPlayed: 0,
  winningSessions: 0,
  winRate: 0,
  totalBuyIn: 0,
  totalCashedOut: 0,
  netProfit: 0,
  averageBuyIn: 0,
  averageProfitLoss: 0,
  biggestWin: null,
  biggestLoss: null,
  returnOnInvestment: 0,
});

export const getPlayerHistory = (
  playerName: PlayerName,
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): PlayerHistoryItem[] => {
  const tournamentHistory: TournamentHistoryItem[] = tournaments
    .filter(isCompletedTournament)
    .flatMap((tournament) => {
      const player = tournament.players.find(
        (entry) => entry.name === playerName,
      );
      if (!player) return [];
      const totalPayout = player.placementPayout + player.bonusPayout;
      return [
        {
          eventType: "tournament" as const,
          id: tournament.id,
          slug: tournament.slug,
          title: tournament.title,
          date: tournament.date,
          host: tournament.host,
          placement: player.placement,
          totalBuyIn: player.totalBuyIn,
          totalPayout,
          netProfit: totalPayout - player.totalBuyIn,
        },
      ];
    });

  const cashGameHistory: CashGameHistoryItem[] = cashGames
    .filter(isCompletedCashGame)
    .flatMap((cashGame) => {
      const player = cashGame.players.find((entry) => entry.name === playerName);
      if (!player) return [];
      return [
        {
          eventType: "cash-game" as const,
          id: cashGame.id,
          slug: cashGame.slug,
          title: cashGame.title,
          date: cashGame.date,
          host: cashGame.host,
          amountBuyIn: player.amountBuyIn,
          amountAtEnd: player.amountAtEnd,
          netProfit: player.amountAtEnd - player.amountBuyIn,
        },
      ];
    });

  return [...tournamentHistory, ...cashGameHistory].sort(byNewestDate);
};

export const getPlayerProfiles = (
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): PlayerProfile[] => {
  const tournamentStandings = new Map(
    getTournamentStandings(tournaments).map((standing) => [
      standing.name,
      standing,
    ]),
  );
  const cashStandings = new Map(
    getCashGameStandings(cashGames).map((standing) => [
      standing.name,
      standing,
    ]),
  );
  const completedTournaments = tournaments.filter(isCompletedTournament);
  const completedCashGames = cashGames.filter(isCompletedCashGame);

  return getPlayerNames(tournaments, cashGames).map((name) => {
    const tournamentStats =
      tournamentStandings.get(name) ?? emptyTournamentStanding(name);
    const cashStats = cashStandings.get(name) ?? emptyCashGameStanding(name);

    return {
      name,
      slug: toPlayerSlug(name),
      tournaments: tournamentStats,
      cashGames: cashStats,
      eventsPlayed: tournamentStats.tournamentsPlayed + cashStats.gamesPlayed,
      eventsHosted:
        completedTournaments.filter((tournament) => tournament.host === name)
          .length +
        completedCashGames.filter((cashGame) => cashGame.host === name).length,
      combinedBuyIn: tournamentStats.totalBuyIn + cashStats.totalBuyIn,
      combinedWinnings:
        tournamentStats.amountWon + cashStats.totalCashedOut,
      combinedNetProfit: tournamentStats.netProfit + cashStats.netProfit,
      history: getPlayerHistory(name, tournaments, cashGames),
      monthlyProfit: getMonthlyProfitSeries(tournaments, cashGames, name),
    };
  });
};

export const getPlayerProfile = (
  playerName: PlayerName,
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): PlayerProfile | undefined =>
  getPlayerProfiles(tournaments, cashGames).find(
    (profile) => profile.name === playerName,
  );

export const getPlayerProfileBySlug = (
  slug: string,
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): PlayerProfile | undefined =>
  getPlayerProfiles(tournaments, cashGames).find(
    (profile) => profile.slug === slug,
  );

export const getRecentTournaments = (
  tournaments: readonly Tournament[],
  limit = 3,
): CompletedTournament[] =>
  getCompletedTournaments(tournaments).slice(0, Math.max(0, limit));

export const getRecentCashGames = (
  cashGames: readonly CashGame[],
  limit = 3,
): CompletedCashGame[] =>
  getCompletedCashGames(cashGames).slice(0, Math.max(0, limit));

const toTournamentActivity = (
  tournament: Tournament,
): RecentTournamentActivity => ({
  eventType: "tournament",
  id: tournament.id,
  slug: tournament.slug,
  title: tournament.title,
  date: tournament.date,
  host: tournament.host,
  status: tournament.status,
  playerCount: tournament.players.length,
  prizePool: getTournamentPrizePool(tournament),
});

const toCashGameActivity = (cashGame: CashGame): RecentCashGameActivity => ({
  eventType: "cash-game",
  id: cashGame.id,
  slug: cashGame.slug,
  title: cashGame.title,
  date: cashGame.date,
  host: cashGame.host,
  status: cashGame.status,
  playerCount: cashGame.players.length,
  totalBuyIn: getCashGameTotalBuyIn(cashGame),
});

/** Returns the newest completed events across both game formats. */
export const getRecentActivity = (
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
  limit = 6,
): RecentActivity[] =>
  [
    ...tournaments.filter(isCompletedTournament).map(toTournamentActivity),
    ...cashGames.filter(isCompletedCashGame).map(toCashGameActivity),
  ]
    .sort(byNewestDate)
    .slice(0, Math.max(0, limit));

/** Returns every event, including upcoming registrations, ordered newest first. */
export const getAllActivity = (
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
): RecentActivity[] =>
  [
    ...tournaments.map(toTournamentActivity),
    ...cashGames.map(toCashGameActivity),
  ].sort(byNewestDate);

// Readable aliases for callers that prefer "calculate" / "build" terminology.
export const calculateTournamentStandings = getTournamentStandings;
export const calculateCashGameStandings = getCashGameStandings;
export const calculateMonthlyProfitSeries = getMonthlyProfitSeries;
export const buildPlayerProfiles = getPlayerProfiles;
