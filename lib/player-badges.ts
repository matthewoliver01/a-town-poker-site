import { placementRank } from "./poker-placement";
import type {
  CashGame,
  CompletedCashGame,
  PlayerBadge,
  PlayerBadgeKind,
  PlayerName,
  Tournament,
} from "./poker-types";

const badgeOrder: PlayerBadgeKind[] = [
  "tournament-champion",
  "tournament-co-champion",
  "tournament-runner-up",
  "tournament-third-place",
  "cash-game-winner",
  "cash-win-streak",
  "monthly-cash-leader",
  "annual-cash-leader",
];
const CASH_WIN_STREAK_MINIMUM = 4;

type BadgeCounts = Map<PlayerName, Map<string, PlayerBadge>>;
type PeriodTotals = Map<string, Map<PlayerName, number>>;

function currentEasternDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addBadge(
  counts: BadgeCounts,
  playerName: PlayerName,
  kind: PlayerBadgeKind,
  streakLength?: number,
) {
  const playerCounts = counts.get(playerName) ?? new Map<string, PlayerBadge>();
  const key = streakLength ? `${kind}:${streakLength}` : kind;
  const badge = playerCounts.get(key);
  playerCounts.set(key, {
    kind,
    count: (badge?.count ?? 0) + 1,
    ...(streakLength ? { streakLength } : {}),
  });
  counts.set(playerName, playerCounts);
}

function addPeriodProfit(
  totals: PeriodTotals,
  period: string,
  playerName: PlayerName,
  profit: number,
) {
  const playerTotals = totals.get(period) ?? new Map<PlayerName, number>();
  const profitInCents = Math.round(profit * 100);
  playerTotals.set(playerName, (playerTotals.get(playerName) ?? 0) + profitInCents);
  totals.set(period, playerTotals);
}

function awardPeriodLeaders(
  counts: BadgeCounts,
  totals: PeriodTotals,
  kind: PlayerBadgeKind,
) {
  for (const playerTotals of totals.values()) {
    const leadingTotal = Math.max(...playerTotals.values());
    for (const [playerName, total] of playerTotals) {
      if (total === leadingTotal) addBadge(counts, playerName, kind);
    }
  }
}

export function calculatePlayerBadges(
  tournaments: readonly Tournament[],
  cashGames: readonly CashGame[],
  asOfDate = currentEasternDate(),
): Map<PlayerName, PlayerBadge[]> {
  const counts: BadgeCounts = new Map();
  const currentMonth = asOfDate.slice(0, 7);
  const currentYear = asOfDate.slice(0, 4);
  const monthlyCashTotals: PeriodTotals = new Map();
  const annualCashTotals: PeriodTotals = new Map();

  for (const tournament of tournaments) {
    if (tournament.status !== "completed" || tournament.date > asOfDate) continue;

    const firstPlacePlayers = tournament.players.filter(
      (player) => placementRank(player.placement) === 1,
    );
    const hasSplitChampion =
      firstPlacePlayers.length > 1 ||
      firstPlacePlayers.some((player) => player.placement === "T-1");

    for (const player of tournament.players) {
      const rank = placementRank(player.placement);
      if (rank === 1) {
        addBadge(
          counts,
          player.name,
          hasSplitChampion
            ? "tournament-co-champion"
            : "tournament-champion",
        );
      } else if (rank === 2) {
        addBadge(counts, player.name, "tournament-runner-up");
      } else if (rank === 3) {
        addBadge(counts, player.name, "tournament-third-place");
      }
    }
  }

  const cashWinStreaks = new Map<PlayerName, number>();
  const completedCashGames = cashGames
    .filter(
      (cashGame): cashGame is CompletedCashGame =>
        cashGame.status === "completed" && cashGame.date <= asOfDate,
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
    );

  for (const cashGame of completedCashGames) {
    const profits = cashGame.players.map((player) => ({
      name: player.name,
      profitInCents: Math.round(
        (player.amountAtEnd - player.amountBuyIn) * 100,
      ),
    }));
    const leadingProfit = Math.max(
      ...profits.map((player) => player.profitInCents),
    );
    const winningPlayers = new Set(
      profits
        .filter((player) => player.profitInCents === leadingProfit)
        .map((player) => player.name),
    );
    for (const playerName of winningPlayers) {
      addBadge(counts, playerName, "cash-game-winner");
    }

    for (const player of profits) {
      if (player.profitInCents > 0) {
        cashWinStreaks.set(
          player.name,
          (cashWinStreaks.get(player.name) ?? 0) + 1,
        );
      } else {
        const completedStreak = cashWinStreaks.get(player.name) ?? 0;
        if (completedStreak >= CASH_WIN_STREAK_MINIMUM) {
          addBadge(counts, player.name, "cash-win-streak", completedStreak);
        }
        cashWinStreaks.set(player.name, 0);
      }
    }

    const month = cashGame.date.slice(0, 7);
    const year = cashGame.date.slice(0, 4);
    for (const player of cashGame.players) {
      const profit = player.amountAtEnd - player.amountBuyIn;
      if (month < currentMonth) {
        addPeriodProfit(monthlyCashTotals, month, player.name, profit);
      }
      if (year < currentYear) {
        addPeriodProfit(annualCashTotals, year, player.name, profit);
      }
    }
  }

  for (const [playerName, activeStreak] of cashWinStreaks) {
    if (activeStreak >= CASH_WIN_STREAK_MINIMUM) {
      addBadge(counts, playerName, "cash-win-streak", activeStreak);
    }
  }

  awardPeriodLeaders(counts, monthlyCashTotals, "monthly-cash-leader");
  awardPeriodLeaders(counts, annualCashTotals, "annual-cash-leader");

  return new Map(
    [...counts].map(([playerName, playerCounts]) => [
      playerName,
      [...playerCounts.values()].sort((left, right) => {
        const kindOrder =
          badgeOrder.indexOf(left.kind) - badgeOrder.indexOf(right.kind);
        if (kindOrder !== 0) return kindOrder;
        return (right.streakLength ?? 0) - (left.streakLength ?? 0);
      }),
    ]),
  );
}
