"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleDollarSign,
  Crown,
  Medal,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
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
  PlayerBadge,
  PlayerBadgeKind,
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

const badgePresentation: Record<
  PlayerBadgeKind,
  {
    label: string;
    description: string;
    icon?: LucideIcon;
    detail?: string;
    frameClassName: string;
    faceClassName: string;
  }
> = {
  "tournament-champion": {
    label: "Tournament Gold",
    description: "Won a tournament outright.",
    icon: Trophy,
    detail: "1",
    frameClassName: "from-yellow-200 via-amber-500 to-amber-950",
    faceClassName: "from-amber-400 via-amber-600 to-yellow-950 text-white",
  },
  "tournament-runner-up": {
    label: "Tournament Silver",
    description: "Finished second in a tournament.",
    icon: Medal,
    detail: "2",
    frameClassName: "from-slate-100 via-slate-400 to-slate-800",
    faceClassName: "from-slate-400 via-slate-600 to-slate-900 text-white",
  },
  "tournament-third-place": {
    label: "Tournament Bronze",
    description: "Finished third in a tournament.",
    icon: Medal,
    detail: "3",
    frameClassName: "from-orange-200 via-amber-700 to-orange-950",
    faceClassName: "from-orange-500 via-amber-700 to-orange-950 text-white",
  },
  "tournament-co-champion": {
    label: "Tournament Co-Champ",
    description: "Shared first place in a split tournament.",
    icon: Crown,
    detail: "T1",
    frameClassName: "from-fuchsia-300 via-violet-600 to-indigo-950",
    faceClassName: "from-violet-500 via-violet-700 to-indigo-950 text-white",
  },
  "cash-game-winner": {
    label: "Cash Game Winner",
    description: "Posted the highest net profit in a cash game.",
    icon: CircleDollarSign,
    frameClassName: "from-emerald-200 via-emerald-600 to-emerald-950",
    faceClassName: "from-emerald-500 via-emerald-700 to-green-950 text-white",
  },
  "cash-win-streak": {
    label: "Cash Game Streak",
    description:
      "Four or more consecutive profitable cash-game sessions played.",
    frameClassName: "from-orange-200 via-orange-600 to-red-950",
    faceClassName: "from-orange-500 via-red-600 to-red-950 text-white",
  },
  "monthly-cash-leader": {
    label: "Monthly Champion",
    description: "Led cash-game profit for a completed month.",
    frameClassName: "from-cyan-200 via-blue-600 to-indigo-950",
    faceClassName: "from-sky-500 via-blue-700 to-indigo-950 text-white",
  },
  "annual-cash-leader": {
    label: "Yearly Champion",
    description: "Led cash-game profit for a completed year.",
    frameClassName: "from-teal-200 via-teal-600 to-slate-950",
    faceClassName: "from-teal-500 via-teal-700 to-slate-950 text-white",
  },
};

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

function monthlyBadgeFace(period?: string) {
  const [year, month] = period?.split("-") ?? [];
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (!year || !month || !Number.isInteger(monthNumber) || !Number.isInteger(yearNumber)) {
    return { full: "Unknown month", month: "MON", year: "--" };
  }

  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
  return {
    month: new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase(),
    full: new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }).format(date),
    year: year.slice(-2),
  };
}

function eventBadgeDate(date?: string) {
  const [year, month, day] = date?.split("-") ?? [];
  if (!year || !month || !day) return "DATE";
  return `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
}

function badgeTooltip(badge: PlayerBadge) {
  const presentation = badgePresentation[badge.kind];

  if (badge.kind === "cash-win-streak") {
    return `${badge.streakLength}-game cash win streak: Finished profitable in ${badge.streakLength} consecutive cash-game sessions played.`;
  }
  if (badge.kind === "monthly-cash-leader" && badge.period) {
    const { full } = monthlyBadgeFace(badge.period);
    return `${full} Monthly Champion: ${presentation.description}`;
  }
  if (badge.kind === "annual-cash-leader" && badge.period) {
    return `${badge.period} Yearly Champion: ${presentation.description}`;
  }
  if (badge.eventDate) {
    return `${presentation.label} — ${formatDate(badge.eventDate)}: ${presentation.description}`;
  }
  return `${presentation.label}: ${presentation.description}`;
}

function BadgeMedallion({ badge, instance }: { badge: PlayerBadge; instance: number }) {
  const presentation = badgePresentation[badge.kind];
  const Icon = presentation.icon;
  const monthFace = monthlyBadgeFace(badge.period);
  const tooltip = badgeTooltip(badge);

  return (
    <span
      key={`${badge.kind}-${badge.eventId ?? badge.eventDate ?? badge.period ?? badge.streakLength ?? "standard"}-${instance}`}
      tabIndex={0}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "group/trophy relative grid size-14 shrink-0 place-items-center rounded-[1.05rem] bg-gradient-to-br p-[3px] shadow-[0_6px_14px_-4px_rgba(15,23,42,0.75)] ring-1 ring-black/30 outline-none transition duration-200 hover:z-10 hover:-translate-y-0.5 hover:scale-105 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        presentation.frameClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-full place-items-center overflow-hidden rounded-[0.82rem] border border-white/40 bg-gradient-to-br shadow-inner",
          presentation.faceClassName,
        )}
      >
        <span className="absolute inset-[3px] rounded-[0.55rem] ring-1 ring-inset ring-white/20" />
        <span className="absolute -left-3 -top-5 h-12 w-7 rotate-[32deg] bg-white/20 blur-[1px]" />
        <span className="absolute bottom-1 left-1 size-1 rounded-full bg-white/70 shadow-[0_0_5px_rgba(255,255,255,0.85)]" />
        <Star className="absolute right-1 top-1 size-2.5 fill-current opacity-75" />

        {badge.eventDate && Icon ? (
          <span className="relative z-10 flex flex-col items-center gap-0.5 drop-shadow-sm">
            <Icon className="size-4.5" strokeWidth={2.35} />
            <span className="numeric text-[8px] font-black leading-none tracking-tight">
              {eventBadgeDate(badge.eventDate)}
            </span>
          </span>
        ) : badge.kind === "monthly-cash-leader" ? (
          <span className="relative z-10 text-center font-black leading-none drop-shadow-sm">
            <span className="block text-[10px] tracking-[0.08em]">
              {monthFace.month}
            </span>
            <span className="numeric mt-0.5 block text-[9px] opacity-90">
              {monthFace.year}
            </span>
          </span>
        ) : badge.kind === "annual-cash-leader" ? (
          <span className="numeric relative z-10 text-[11px] font-black tracking-tight drop-shadow-sm">
            {badge.period ?? "YEAR"}
          </span>
        ) : badge.kind === "cash-win-streak" ? (
          <span className="numeric relative z-10 text-xl font-black leading-none drop-shadow-sm">
            {badge.streakLength}
          </span>
        ) : Icon ? (
          <Icon
            className="relative z-10 size-5 drop-shadow-sm"
            strokeWidth={2.35}
          />
        ) : null}

        {presentation.detail ? (
          <span
            className={cn(
              "numeric absolute z-10 text-[8px] font-black leading-none drop-shadow-sm",
              badge.eventDate ? "left-1 top-1" : "bottom-1 right-1",
            )}
          >
            {presentation.detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function TrophyCase({ badges }: { badges: PlayerBadge[] }) {
  const totalBadges = badges.reduce((sum, badge) => sum + badge.count, 0);
  const badgeGroups = [...badges.reduce((groups, badge) => {
    const group = groups.get(badge.kind) ?? [];
    group.push(badge);
    groups.set(badge.kind, group);
    return groups;
  }, new Map<PlayerBadgeKind, PlayerBadge[]>())];

  return (
    <Card className="mt-5">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trophy case
          </p>
          <p className="text-xs text-muted-foreground">
            {pluralize(totalBadges, "badge")}
          </p>
        </div>
        {badges.length > 0 ? (
          <div
            className="divide-y"
            role="list"
            aria-label="Earned badges"
          >
            {badgeGroups.map(([kind, groupedBadges]) => {
              const presentation = badgePresentation[kind];

              return (
                <div
                  key={kind}
                  role="listitem"
                  className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
                >
                  <p className="text-sm font-semibold">{presentation.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {groupedBadges.flatMap((badge) =>
                      Array.from({ length: badge.count }, (_, index) => (
                        <BadgeMedallion
                            key={`${badge.eventId ?? badge.eventDate ?? badge.period ?? badge.streakLength ?? "standard"}-${index}`}
                          badge={badge}
                          instance={index}
                        />
                      )),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No badges earned yet.</p>
        )}
      </CardContent>
    </Card>
  );
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

function MonthlyResultTiles({
  data,
  ariaLabel,
}: {
  data: MonthlyResultTile[];
  ariaLabel: string;
}) {
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

        return (
          <div
            key={tile.month}
            role="listitem"
            className={cn(
              "min-h-28 rounded-xl border p-3.5 transition-colors",
              !didPlay && "border-border bg-muted/65 text-muted-foreground",
              didPlay && tile.profit >= 0 &&
                "border-positive bg-positive text-white",
              didPlay && tile.profit < 0 &&
                "border-negative bg-negative text-white",
            )}
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

      <TrophyCase badges={profile.badges} />

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
