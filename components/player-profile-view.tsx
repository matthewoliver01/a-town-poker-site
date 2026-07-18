"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CircleDollarSign,
  Crown,
  HandCoins,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  MonthlyProfitChart,
  TournamentFinishesChart,
  type TournamentFinishPoint,
} from "@/components/poker-charts";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import {
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
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note?: string;
};

function StatCard({ icon: Icon, label, value, note }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="numeric mt-1 truncate text-lg font-semibold">{value}</p>
          {note ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p> : null}
        </div>
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

function TournamentSnapshot({ stats }: { stats: TournamentStanding }) {
  const hasResults = stats.tournamentsPlayed > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
            <Crown className="size-4" />
          </span>
          <div>
            <CardTitle className="text-lg">Tournament snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pluralize(stats.tournamentsPlayed, "event")} played
            </p>
          </div>
        </div>
      </CardHeader>
      {hasResults ? (
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Net profit</p><p className={cn("numeric mt-1 font-semibold", stats.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(stats.netProfit)}</p></div>
          <div><p className="text-xs text-muted-foreground">Total payouts</p><p className="numeric mt-1 font-semibold">{formatMoney(stats.amountWon)}</p></div>
          <div><p className="text-xs text-muted-foreground">Average finish</p><p className="numeric mt-1 font-semibold">{stats.averageFinish === null ? "—" : stats.averageFinish.toFixed(1)}</p></div>
          <div><p className="text-xs text-muted-foreground">Best finish</p><p className="numeric mt-1 font-semibold">{stats.highestFinish === null ? "—" : formatTournamentPlacement(stats.highestFinish)}</p></div>
          <div><p className="text-xs text-muted-foreground">In the money</p><p className="numeric mt-1 font-semibold">{stats.cashRate.toFixed(0)}%</p></div>
          <div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{Number.isFinite(stats.returnOnInvestment) ? `${stats.returnOnInvestment.toFixed(1)}%` : "—"}</p></div>
        </CardContent>
      ) : (
        <CardContent className="border-t py-8 text-center text-sm text-muted-foreground">
          No completed tournament results yet.
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
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
            <HandCoins className="size-4" />
          </span>
          <div>
            <CardTitle className="text-lg">Cash-game snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pluralize(stats.gamesPlayed, "session")} played
            </p>
          </div>
        </div>
      </CardHeader>
      {hasResults ? (
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Net profit</p><p className={cn("numeric mt-1 font-semibold", stats.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(stats.netProfit)}</p></div>
          <div><p className="text-xs text-muted-foreground">Average P/L</p><p className="numeric mt-1 font-semibold">{formatSignedMoney(stats.averageProfitLoss)}</p></div>
          <div><p className="text-xs text-muted-foreground">Win rate</p><p className="numeric mt-1 font-semibold">{stats.winRate.toFixed(0)}%</p></div>
          <div><p className="text-xs text-muted-foreground">Biggest win</p><p className="numeric mt-1 font-semibold text-positive">{stats.biggestWin === null ? "—" : formatSignedMoney(stats.biggestWin)}</p></div>
          <div><p className="text-xs text-muted-foreground">Biggest loss</p><p className="numeric mt-1 font-semibold text-negative">{stats.biggestLoss === null ? "—" : formatSignedMoney(stats.biggestLoss)}</p></div>
          <div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{Number.isFinite(stats.returnOnInvestment) ? `${stats.returnOnInvestment.toFixed(1)}%` : "—"}</p></div>
        </CardContent>
      ) : (
        <CardContent className="border-t py-8 text-center text-sm text-muted-foreground">
          No completed cash-game results yet.
        </CardContent>
      )}
    </Card>
  );
}

function EventHistory({ history, mode }: { history: PlayerHistoryItem[]; mode: PlayerViewMode }) {
  const title = mode === "overall" ? "Complete event history" : mode === "tournaments" ? "Tournament history" : "Cash-game history";
  const emptyLabel = mode === "tournaments" ? "No completed tournaments for this player yet." : mode === "cash-games" ? "No completed cash games for this player yet." : "No completed events for this player yet.";

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
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Result</TableHead>
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
                <TableCell><Badge variant="secondary">{event.eventType === "tournament" ? "Tournament" : "Cash game"}</Badge></TableCell>
                <TableCell className="numeric text-right">{event.eventType === "tournament" ? formatTournamentPlacement(event.placement) : formatMoney(event.amountAtEnd)}</TableCell>
                <TableCell className={cn("numeric text-right font-semibold", event.netProfit > 0 ? "text-positive" : event.netProfit < 0 ? "text-negative" : "")}>{formatSignedMoney(event.netProfit)}</TableCell>
              </TableRow>
            )) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">{emptyLabel}</TableCell>
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

  const monthlyChartData = useMemo(() => {
    if (!hasResults) return [];
    const firstMonth = history.at(-1)?.date.slice(0, 7);
    const lastMonth = history[0]?.date.slice(0, 7);

    return profile.monthlyProfit
      .filter(
        (point) =>
          firstMonth &&
          lastMonth &&
          point.month >= firstMonth &&
          point.month <= lastMonth,
      )
      .map((point) => ({
        month: point.label.replace(" 2026", ""),
        profit: tournamentMode
          ? point.tournamentProfit
          : cashMode
            ? point.cashGameProfit
            : point.totalProfit,
        games: history.filter((event) => event.date.startsWith(point.month))
          .length,
      }));
  }, [cashMode, hasResults, history, profile.monthlyProfit, tournamentMode]);

  const view = mode === "overall"
    ? {
        netLabel: "Combined net",
        net: profile.combinedNetProfit,
        subtitle: `${pluralize(profile.eventsPlayed, "event")} played · ${pluralize(profile.eventsHosted, "event")} hosted`,
        profitDescription: "Tournament and cash-game results combined",
        profitBadge: "Net P/L",
      }
    : tournamentMode
      ? {
          netLabel: "Tournament net",
          net: profile.tournaments.netProfit,
          subtitle: `${pluralize(profile.tournaments.tournamentsPlayed, "tournament")} played · ${pluralize(hostedCounts.tournaments, "tournament")} hosted`,
          profitDescription: "Tournament results only",
          profitBadge: "Tournament P/L",
        }
      : {
          netLabel: "Cash-game net",
          net: profile.cashGames.netProfit,
          subtitle: `${pluralize(profile.cashGames.gamesPlayed, "cash session")} played · ${pluralize(hostedCounts.cashGames, "cash session")} hosted`,
          profitDescription: "Cash-game results only",
          profitBadge: "Cash P/L",
        };

  const summaryCards: StatCardProps[] = mode === "overall"
    ? [
        { icon: CalendarCheck, label: "Events played", value: String(profile.eventsPlayed), note: `${profile.eventsHosted} hosted` },
        { icon: Trophy, label: "Tournament titles", value: String(profile.tournaments.wins), note: pluralize(profile.tournaments.topThreeFinishes, "top-three finish", "top-three finishes") },
        { icon: Target, label: "Cash win rate", value: profile.cashGames.gamesPlayed ? `${profile.cashGames.winRate.toFixed(0)}%` : "—", note: profile.cashGames.gamesPlayed ? pluralize(profile.cashGames.winningSessions, "winning session") : "No completed sessions" },
        { icon: CircleDollarSign, label: "Total buy-ins", value: formatMoney(profile.combinedBuyIn), note: "All tracked events" },
      ]
    : tournamentMode
      ? [
          { icon: CalendarCheck, label: "Tournaments played", value: String(profile.tournaments.tournamentsPlayed), note: `${hostedCounts.tournaments} hosted` },
          { icon: Trophy, label: "Tournament titles", value: String(profile.tournaments.wins), note: pluralize(profile.tournaments.topThreeFinishes, "top-three finish", "top-three finishes") },
          { icon: Target, label: "In the money", value: profile.tournaments.tournamentsPlayed ? `${profile.tournaments.cashRate.toFixed(0)}%` : "—", note: profile.tournaments.tournamentsPlayed ? pluralize(profile.tournaments.inTheMoneyFinishes, "paid finish", "paid finishes") : "No completed tournaments" },
          { icon: CircleDollarSign, label: "Total buy-ins", value: formatMoney(profile.tournaments.totalBuyIn), note: `${formatMoney(profile.tournaments.amountWon)} paid out` },
        ]
      : [
          { icon: CalendarCheck, label: "Cash sessions", value: String(profile.cashGames.gamesPlayed), note: `${hostedCounts.cashGames} hosted` },
          { icon: Target, label: "Cash win rate", value: profile.cashGames.gamesPlayed ? `${profile.cashGames.winRate.toFixed(0)}%` : "—", note: profile.cashGames.gamesPlayed ? pluralize(profile.cashGames.winningSessions, "winning session") : "No completed sessions" },
          { icon: TrendingUp, label: "Average P/L", value: profile.cashGames.gamesPlayed ? formatSignedMoney(profile.cashGames.averageProfitLoss) : "—", note: profile.cashGames.gamesPlayed ? "Per completed session" : "No completed sessions" },
          { icon: CircleDollarSign, label: "Total buy-ins", value: formatMoney(profile.cashGames.totalBuyIn), note: `${formatMoney(profile.cashGames.totalCashedOut)} cashed out` },
        ];

  return (
    <>
      <header className="relative overflow-hidden rounded-3xl border bg-primary px-6 py-8 text-primary-foreground shadow-xl shadow-primary/10 subtle-grid sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <PlayerAvatar name={profile.name} className="size-16 border-4 border-white/10 text-lg sm:size-20" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Player profile</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{profile.name}</h1>
              <p className="mt-3 text-sm text-white/65">{view.subtitle}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 sm:text-right">
            <p className="text-xs text-white/55">{view.netLabel}</p>
            <p className={cn("numeric mt-1 text-3xl font-semibold", !hasResults ? "text-white/65" : view.net >= 0 ? "text-[#bfe0cc]" : "text-[#f2b8b2]")}>{hasResults ? formatSignedMoney(view.net) : "—"}</p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={`${profile.name} ${mode} summary`}>
        {summaryCards.map((card) => <StatCard key={card.label} {...card} />)}
      </section>

      <section className={cn("mt-10 grid gap-6", showTournamentChart && "xl:grid-cols-[1.25fr_0.75fr]")}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div><CardTitle className="text-lg">Profit by month</CardTitle><p className="mt-1 text-sm text-muted-foreground">{view.profitDescription}</p></div>
              <Badge variant="secondary"><TrendingUp /> {view.profitBadge}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyProfitChart data={monthlyChartData} height={300} ariaLabel={`${profile.name}'s ${mode} monthly profit and loss`} emptyLabel={`Monthly ${mode === "overall" ? "results" : mode === "tournaments" ? "tournament results" : "cash-game results"} will appear here.`} />
          </CardContent>
        </Card>
        {showTournamentChart ? (
          <Card>
            <CardHeader><CardTitle className="text-lg">Tournament form</CardTitle><p className="text-sm text-muted-foreground">Finish strength across each field</p></CardHeader>
            <CardContent><TournamentFinishesChart data={tournamentChartData} height={300} ariaLabel={`${profile.name}'s tournament finishes`} emptyLabel="Tournament finishes will appear after a completed event." /></CardContent>
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
          <Link href={playerViewHref("/players", mode)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
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
