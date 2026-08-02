"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  CashSessionProfitChart,
  ProfitOverTimeChart,
  TournamentFinishesChart,
  type TournamentFinishPoint,
} from "@/components/poker-charts";
import { PlayerAvatar } from "@/components/player-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatMoney,
  formatSignedMoney,
  formatTournamentWins,
} from "@/lib/format";
import {
  buildProfitTimeline,
  isPlayerViewMode,
  PLAYER_VIEW_MODES,
  playerViewHref,
  type PlayerViewMode,
} from "@/lib/player-view";
import { formatTournamentPlacement } from "@/lib/poker-placement";
import type {
  CashGameStanding,
  PlayerHistoryItem,
  PlayerProfile,
  TournamentStanding,
} from "@/lib/poker-types";
import { cn } from "@/lib/utils";

export type PlayerHostedCounts = {
  tournaments: number;
  cashGames: number;
};

type PlayerProfileViewProps = {
  profile: PlayerProfile;
  tournamentChartData: TournamentFinishPoint[];
  initialMode: PlayerViewMode;
  hostedCounts: PlayerHostedCounts;
};

type StatCardProps = {
  label: string;
  value: string;
  note?: string;
};

type MonthlyResultTile = {
  eventCount: number;
  label: string;
  month: string;
  profit: number;
};

const MONTH_TILE_START = "2026-07";

function StatCard({ label, value, note }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="numeric mt-1 truncate text-lg font-semibold">{value}</p>
        {note ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function historyForMode(history: PlayerHistoryItem[], mode: PlayerViewMode) {
  if (mode === "tournaments") {
    return history.filter((event) => event.eventType === "tournament");
  }
  if (mode === "cash-games") {
    return history.filter((event) => event.eventType === "cash-game");
  }
  return history;
}

function currentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : MONTH_TILE_START;
}

function monthKeysBetween(start: string, end: string) {
  if (start > end) return [];

  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const finalMonth = Date.UTC(endYear, endMonth - 1, 1);
  const months: string[] = [];

  while (cursor.getTime() <= finalMonth) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function monthlyResults(history: PlayerHistoryItem[]): MonthlyResultTile[] {
  const results = new Map<
    string,
    {
      eventCount: number;
      profit: number;
    }
  >();

  for (const event of history) {
    const month = event.date.slice(0, 7);
    const current = results.get(month) ?? { eventCount: 0, profit: 0 };
    results.set(month, {
      eventCount: current.eventCount + 1,
      profit: Math.round((current.profit + event.netProfit) * 100) / 100,
    });
  }

  return monthKeysBetween(MONTH_TILE_START, currentMonthKey()).map((month) => {
    const result = results.get(month) ?? { eventCount: 0, profit: 0 };
    return {
      month,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      }).format(new Date(`${month}-01T00:00:00Z`)),
      ...result,
    };
  });
}

function tileStyle(
  tile: MonthlyResultTile,
  largestMagnitude: number,
): CSSProperties | undefined {
  if (!tile.eventCount || tile.profit === 0) return undefined;

  const intensity = Math.min(
    1,
    Math.abs(tile.profit) / Math.max(largestMagnitude, 200),
  );
  const backgroundOpacity = 0.1 + intensity * 0.68;
  const borderOpacity = 0.22 + intensity * 0.62;
  const positive = tile.profit > 0;
  const color = positive ? "22, 163, 74" : "220, 38, 38";

  return {
    backgroundColor: `rgba(${color}, ${backgroundOpacity})`,
    borderColor: `rgba(${color}, ${borderOpacity})`,
    color:
      intensity >= 0.72
        ? "#ffffff"
        : positive
          ? "#14532d"
          : "#7f1d1d",
  };
}

function MonthlyResultTiles({
  data,
  ariaLabel,
}: {
  data: MonthlyResultTile[];
  ariaLabel: string;
}) {
  const largestMagnitude = Math.max(
    0,
    ...data
      .filter((tile) => tile.eventCount > 0)
      .map((tile) => Math.abs(tile.profit)),
  );

  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Monthly results begin in July 2026.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3"
      role="list"
      aria-label={ariaLabel}
    >
      {data.map((tile) => {
        const didPlay = tile.eventCount > 0;
        const even = didPlay && tile.profit === 0;

        return (
          <div
            key={tile.month}
            role="listitem"
            className={cn(
              "min-h-28 rounded-xl border p-3.5 transition-colors",
              !didPlay && "border-border bg-muted/65 text-muted-foreground",
              even && "border-border bg-background text-foreground",
            )}
            style={tileStyle(tile, largestMagnitude)}
            aria-label={`${tile.label}: ${
              didPlay
                ? `${formatSignedMoney(tile.profit)} across ${pluralize(tile.eventCount, "event")}`
                : "no events"
            }`}
          >
            <p className="text-xs font-medium opacity-75">{tile.label}</p>
            <p className="numeric mt-3 text-xl font-semibold tracking-tight">
              {didPlay ? formatSignedMoney(tile.profit) : "—"}
            </p>
            <p className="mt-1 text-[11px] opacity-70">
              {didPlay
                ? pluralize(tile.eventCount, "event")
                : "No events"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TournamentSnapshot({ stats }: { stats: TournamentStanding }) {
  const hasResults = stats.tournamentsPlayed > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tournament stats</CardTitle>
        <p className="text-sm text-muted-foreground">
          {pluralize(stats.tournamentsPlayed, "tournament")} played
        </p>
      </CardHeader>
      {hasResults ? (
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Net</p><p className={cn("numeric mt-1 font-semibold", stats.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(stats.netProfit)}</p></div>
          <div><p className="text-xs text-muted-foreground">Total payouts</p><p className="numeric mt-1 font-semibold">{formatMoney(stats.amountWon)}</p></div>
          <div><p className="text-xs text-muted-foreground">Average finish</p><p className="numeric mt-1 font-semibold">{stats.averageFinish === null ? "—" : stats.averageFinish.toFixed(1)}</p></div>
          <div><p className="text-xs text-muted-foreground">Best finish</p><p className="numeric mt-1 font-semibold">{stats.highestFinish === null ? "—" : formatTournamentPlacement(stats.highestFinish)}</p></div>
          <div><p className="text-xs text-muted-foreground">In the money</p><p className="numeric mt-1 font-semibold">{stats.cashRate.toFixed(0)}%</p></div>
          <div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{Number.isFinite(stats.returnOnInvestment) ? `${stats.returnOnInvestment.toFixed(1)}%` : "—"}</p></div>
        </CardContent>
      ) : (
        <CardContent className="border-t py-8 text-center text-sm text-muted-foreground">
          No tournament results.
        </CardContent>
      )}
    </Card>
  );
}

function CashGameSnapshot({ stats }: { stats: CashGameStanding }) {
  const hasResults = stats.gamesPlayed > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cash game stats</CardTitle>
        <p className="text-sm text-muted-foreground">
          {pluralize(stats.gamesPlayed, "session")} played
        </p>
      </CardHeader>
      {hasResults ? (
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Net</p><p className={cn("numeric mt-1 font-semibold", stats.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(stats.netProfit)}</p></div>
          <div><p className="text-xs text-muted-foreground">Average P/L</p><p className="numeric mt-1 font-semibold">{formatSignedMoney(stats.averageProfitLoss)}</p></div>
          <div><p className="text-xs text-muted-foreground">Win rate</p><p className="numeric mt-1 font-semibold">{stats.winRate.toFixed(0)}%</p></div>
          <div><p className="text-xs text-muted-foreground">Biggest win</p><p className="numeric mt-1 font-semibold text-positive">{stats.biggestWin === null ? "—" : formatSignedMoney(stats.biggestWin)}</p></div>
          <div><p className="text-xs text-muted-foreground">Biggest loss</p><p className="numeric mt-1 font-semibold text-negative">{stats.biggestLoss === null ? "—" : formatSignedMoney(stats.biggestLoss)}</p></div>
          <div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{Number.isFinite(stats.returnOnInvestment) ? `${stats.returnOnInvestment.toFixed(1)}%` : "—"}</p></div>
        </CardContent>
      ) : (
        <CardContent className="border-t py-8 text-center text-sm text-muted-foreground">
          No cash game results.
        </CardContent>
      )}
    </Card>
  );
}

function EventHistory({ history, mode }: { history: PlayerHistoryItem[]; mode: PlayerViewMode }) {
  const title = mode === "overall" ? "Event history" : mode === "tournaments" ? "Tournament history" : "Cash game history";
  const emptyLabel = mode === "tournaments" ? "No tournament results." : mode === "cash-games" ? "No cash game results." : "No event results.";
  const showType = mode === "overall";
  const resultLabel = mode === "tournaments" ? "Finish" : mode === "cash-games" ? "Amount at end" : "Result";

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader className="border-b bg-muted/35">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Event</TableHead>
              {showType ? <TableHead>Type</TableHead> : null}
              <TableHead className="text-right">{resultLabel}</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length ? history.map((event) => (
              <TableRow key={`${event.eventType}-${event.id}`}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(event.date)}</TableCell>
                <TableCell>
                  <Link href={event.eventType === "tournament" ? `/tournaments/${event.slug}` : `/cash-games/${event.slug}`} className="font-semibold hover:text-primary hover:underline">
                    {event.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">Hosted by {event.host}</p>
                </TableCell>
                {showType ? (
                  <TableCell className="text-muted-foreground">
                    {event.eventType === "tournament" ? "Tournament" : "Cash game"}
                  </TableCell>
                ) : null}
                <TableCell className="numeric text-right">{event.eventType === "tournament" ? formatTournamentPlacement(event.placement) : formatMoney(event.amountAtEnd)}</TableCell>
                <TableCell className={cn("numeric text-right font-semibold", event.netProfit > 0 ? "text-positive" : event.netProfit < 0 ? "text-negative" : "")}>{formatSignedMoney(event.netProfit)}</TableCell>
              </TableRow>
            )) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={showType ? 5 : 4} className="h-28 text-center text-muted-foreground">{emptyLabel}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlayerModeContent({
  mode,
  profile,
  tournamentChartData,
  hostedCounts,
}: Omit<PlayerProfileViewProps, "initialMode"> & { mode: PlayerViewMode }) {
  const history = useMemo(() => historyForMode(profile.history, mode), [mode, profile.history]);
  const hasResults = history.length > 0;
  const tournamentMode = mode === "tournaments";
  const cashMode = mode === "cash-games";
  const showTournamentChart = !cashMode;
  const showTournamentSnapshot = !cashMode;
  const showCashSnapshot = !tournamentMode;

  const monthlyTileData = useMemo(() => monthlyResults(history), [history]);
  const timelineData = useMemo(() => buildProfitTimeline(history), [history]);
  const cashSessionData = useMemo(
    () =>
      history.flatMap((event) =>
        event.eventType === "cash-game"
          ? [
              {
                id: event.id,
                title: event.title,
                date: event.date,
                profit: event.netProfit,
              },
            ]
          : [],
      ),
    [history],
  );

  const view = mode === "overall"
    ? {
        netLabel: "Combined net",
        net: profile.combinedNetProfit,
      }
    : tournamentMode
      ? {
          netLabel: "Tournament net",
          net: profile.tournaments.netProfit,
        }
      : {
          netLabel: "Cash game net",
          net: profile.cashGames.netProfit,
        };

  const summaryCards: StatCardProps[] = mode === "overall"
    ? [
        { label: "Events played", value: String(profile.eventsPlayed), note: `${profile.eventsHosted} hosted` },
        { label: "Tournament wins", value: formatTournamentWins(profile.tournaments.wins), note: pluralize(profile.tournaments.topThreeFinishes, "top-three finish", "top-three finishes") },
        { label: "Cash win rate", value: profile.cashGames.gamesPlayed ? `${profile.cashGames.winRate.toFixed(0)}%` : "—", note: profile.cashGames.gamesPlayed ? pluralize(profile.cashGames.winningSessions, "winning session") : "No completed sessions" },
        { label: "Total buy-ins", value: formatMoney(profile.combinedBuyIn) },
      ]
    : tournamentMode
      ? [
          { label: "Tournaments played", value: String(profile.tournaments.tournamentsPlayed), note: `${hostedCounts.tournaments} hosted` },
          { label: "Tournament wins", value: formatTournamentWins(profile.tournaments.wins), note: pluralize(profile.tournaments.topThreeFinishes, "top-three finish", "top-three finishes") },
          { label: "In the money", value: profile.tournaments.tournamentsPlayed ? `${profile.tournaments.cashRate.toFixed(0)}%` : "—", note: profile.tournaments.tournamentsPlayed ? pluralize(profile.tournaments.inTheMoneyFinishes, "paid finish", "paid finishes") : "No completed tournaments" },
          { label: "Total buy-ins", value: formatMoney(profile.tournaments.totalBuyIn), note: `${formatMoney(profile.tournaments.amountWon)} paid out` },
        ]
      : [
          { label: "Cash sessions", value: String(profile.cashGames.gamesPlayed), note: `${hostedCounts.cashGames} hosted` },
          { label: "Cash win rate", value: profile.cashGames.gamesPlayed ? `${profile.cashGames.winRate.toFixed(0)}%` : "—", note: profile.cashGames.gamesPlayed ? pluralize(profile.cashGames.winningSessions, "winning session") : "No completed sessions" },
          { label: "Average P/L", value: profile.cashGames.gamesPlayed ? formatSignedMoney(profile.cashGames.averageProfitLoss) : "—", note: profile.cashGames.gamesPlayed ? undefined : "No completed sessions" },
          { label: "Total buy-ins", value: formatMoney(profile.cashGames.totalBuyIn), note: `${formatMoney(profile.cashGames.totalCashedOut)} at end` },
        ];

  return (
    <>
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PlayerAvatar name={profile.name} className="size-12 text-sm sm:size-14" />
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{profile.name}</h1>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground">{view.netLabel}</p>
          <p className={cn("numeric mt-1 text-2xl font-semibold", !hasResults ? "text-muted-foreground" : view.net > 0 ? "text-positive" : view.net < 0 ? "text-negative" : "")}>{hasResults ? formatSignedMoney(view.net) : "—"}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={`${profile.name} ${mode} summary`}>
        {summaryCards.map((card) => <StatCard key={card.label} {...card} />)}
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Net over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitOverTimeChart
              data={timelineData}
              height={300}
              ariaLabel={`${profile.name}'s ${mode} cumulative profit over time`}
              emptyLabel="No dated results."
            />
          </CardContent>
        </Card>
        {cashMode ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session P/L</CardTitle>
            </CardHeader>
            <CardContent>
              <CashSessionProfitChart
                data={cashSessionData}
                height={260}
                ariaLabel={`${profile.name}'s cash game profit and loss by session`}
                emptyLabel="No cash game sessions."
              />
            </CardContent>
          </Card>
        ) : null}
        <Card className={cn(cashMode && "xl:col-span-2")}>
          <CardHeader>
            <CardTitle className="text-lg">Monthly results</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyResultTiles
              data={monthlyTileData}
              ariaLabel={`${profile.name}'s ${mode} results by month`}
            />
          </CardContent>
        </Card>
        {showTournamentChart ? (
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="text-lg">Finish percentile</CardTitle></CardHeader>
            <CardContent><TournamentFinishesChart data={tournamentChartData} height={300} ariaLabel={`${profile.name}'s tournament finishes`} emptyLabel="No tournament results." /></CardContent>
          </Card>
        ) : null}
      </section>

      <section className={cn("mt-6 grid gap-6", showTournamentSnapshot && showCashSnapshot && "lg:grid-cols-2")}>
        {showTournamentSnapshot ? <TournamentSnapshot stats={profile.tournaments} /> : null}
        {showCashSnapshot ? <CashGameSnapshot stats={profile.cashGames} /> : null}
      </section>

      <EventHistory history={history} mode={mode} />
    </>
  );
}

export function PlayerProfileView({ profile, tournamentChartData, initialMode, hostedCounts }: PlayerProfileViewProps) {
  const [mode, setMode] = useState<PlayerViewMode>(initialMode);

  return (
    <div className="page-shell py-8 sm:py-12">
      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (!isPlayerViewMode(value)) return;
          setMode(value);
          window.history.replaceState(null, "", playerViewHref(`/players/${profile.slug}`, value));
        }}
        className="gap-0"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href={playerViewHref("/players", mode, "cash-games")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> All players
          </Link>
          <TabsList className="w-full sm:w-fit" aria-label="Player results type">
            {PLAYER_VIEW_MODES.map((option) => <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>)}
          </TabsList>
        </div>

        {PLAYER_VIEW_MODES.map((option) => (
          <TabsContent key={option.value} value={option.value} className="mt-0">
            {mode === option.value ? (
              <PlayerModeContent mode={option.value} profile={profile} tournamentChartData={tournamentChartData} hostedCounts={hostedCounts} />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
