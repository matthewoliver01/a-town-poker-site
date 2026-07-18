"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  Crown,
  Flame,
  HandCoins,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSignedMoney } from "@/lib/format";
import type { PlayerProfile } from "@/lib/poker-types";
import {
  isPlayerViewMode,
  PLAYER_VIEW_MODES,
  playerViewHref,
  type PlayerViewMode,
} from "@/lib/player-view";
import { cn } from "@/lib/utils";

interface PlayerDirectoryProps {
  players: PlayerProfile[];
  initialMode: PlayerViewMode;
}

interface PlayerCardMetrics {
  hasResults: boolean;
  meta: string;
  netLabel: string;
  netValue: number;
  firstLabel: string;
  firstValue: string;
  secondLabel: string;
  secondValue: string;
}

interface HighlightCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  name?: string;
  note: string;
  primary?: boolean;
}

function netForMode(player: PlayerProfile, mode: PlayerViewMode): number {
  if (mode === "tournaments") return player.tournaments.netProfit;
  if (mode === "cash-games") return player.cashGames.netProfit;
  return player.combinedNetProfit;
}

function eventsForMode(player: PlayerProfile, mode: PlayerViewMode): number {
  if (mode === "tournaments") return player.tournaments.tournamentsPlayed;
  if (mode === "cash-games") return player.cashGames.gamesPlayed;
  return player.eventsPlayed;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function comparePlayers(
  a: PlayerProfile,
  b: PlayerProfile,
  mode: PlayerViewMode,
): number {
  const participationDifference =
    Number(eventsForMode(b, mode) > 0) - Number(eventsForMode(a, mode) > 0);
  if (participationDifference !== 0) return participationDifference;

  const profitDifference = netForMode(b, mode) - netForMode(a, mode);
  if (profitDifference !== 0) return profitDifference;

  if (mode === "tournaments") {
    return (
      b.tournaments.amountWon - a.tournaments.amountWon ||
      b.tournaments.wins - a.tournaments.wins ||
      a.name.localeCompare(b.name)
    );
  }

  if (mode === "cash-games") {
    return (
      b.cashGames.totalCashedOut - a.cashGames.totalCashedOut ||
      b.cashGames.winningSessions - a.cashGames.winningSessions ||
      a.name.localeCompare(b.name)
    );
  }

  return (
    b.combinedWinnings - a.combinedWinnings ||
    b.eventsPlayed - a.eventsPlayed ||
    a.name.localeCompare(b.name)
  );
}

function cardMetrics(
  player: PlayerProfile,
  mode: PlayerViewMode,
): PlayerCardMetrics {
  if (mode === "tournaments") {
    return {
      hasResults: player.tournaments.tournamentsPlayed > 0,
      meta: `${countLabel(player.tournaments.tournamentsPlayed, "tournament")} · ${player.tournaments.topThreeFinishes} top 3`,
      netLabel: "Tournament net",
      netValue: player.tournaments.netProfit,
      firstLabel: "Tournament wins",
      firstValue: String(player.tournaments.wins),
      secondLabel: "Tournament ROI",
      secondValue: player.tournaments.tournamentsPlayed
        ? `${player.tournaments.returnOnInvestment.toFixed(0)}%`
        : "—",
    };
  }

  if (mode === "cash-games") {
    return {
      hasResults: player.cashGames.gamesPlayed > 0,
      meta: `${countLabel(player.cashGames.gamesPlayed, "cash game")} · ${countLabel(player.cashGames.winningSessions, "win")}`,
      netLabel: "Cash-game net",
      netValue: player.cashGames.netProfit,
      firstLabel: "Cash win rate",
      firstValue: player.cashGames.gamesPlayed
        ? `${player.cashGames.winRate.toFixed(0)}%`
        : "—",
      secondLabel: "Average P/L",
      secondValue: player.cashGames.gamesPlayed
        ? formatSignedMoney(player.cashGames.averageProfitLoss)
        : "—",
    };
  }

  return {
    hasResults: player.eventsPlayed > 0,
    meta: `${countLabel(player.eventsPlayed, "event")} · ${player.eventsHosted} hosted`,
    netLabel: "Combined net",
    netValue: player.combinedNetProfit,
    firstLabel: "Tournament wins",
    firstValue: String(player.tournaments.wins),
    secondLabel: "Cash win rate",
    secondValue: player.cashGames.gamesPlayed
      ? `${player.cashGames.winRate.toFixed(0)}%`
      : "—",
  };
}

function HighlightCard({
  icon: Icon,
  label,
  name,
  note,
  primary = false,
}: HighlightCardProps) {
  return (
    <Card className={cn(primary && "bg-primary text-primary-foreground")}>
      <CardContent className="flex items-center gap-3 p-4 sm:p-5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            primary ? "bg-white/10" : "bg-accent text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs",
              primary ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
            {name ?? "—"}
          </p>
          <p
            className={cn(
              "numeric mt-0.5 truncate text-xs sm:text-sm",
              primary ? "text-[#bfe0cc]" : "text-muted-foreground",
            )}
          >
            {note}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerDirectory({
  players,
  initialMode,
}: PlayerDirectoryProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PlayerViewMode>(initialMode);

  const sortedPlayers = useMemo(
    () => players.toSorted((a, b) => comparePlayers(a, b, mode)),
    [mode, players],
  );
  const activePlayers = players.filter(
    (player) => eventsForMode(player, mode) > 0,
  );
  const leader = activePlayers.toSorted((a, b) => comparePlayers(a, b, mode))[0];
  const mostActive = activePlayers.toSorted(
    (a, b) =>
      eventsForMode(b, mode) - eventsForMode(a, mode) ||
      netForMode(b, mode) - netForMode(a, mode) ||
      a.name.localeCompare(b.name),
  )[0];
  const mostTitles = players
    .filter((player) => player.tournaments.tournamentsPlayed > 0)
    .toSorted(
      (a, b) =>
        b.tournaments.wins - a.tournaments.wins ||
        b.tournaments.netProfit - a.tournaments.netProfit ||
        a.name.localeCompare(b.name),
    )[0];
  const bestWinRate = players
    .filter((player) => player.cashGames.gamesPlayed > 0)
    .toSorted(
      (a, b) =>
        b.cashGames.winRate - a.cashGames.winRate ||
        b.cashGames.gamesPlayed - a.cashGames.gamesPlayed ||
        b.cashGames.netProfit - a.cashGames.netProfit ||
        a.name.localeCompare(b.name),
    )[0];

  const leaderLabel =
    mode === "tournaments"
      ? "Tournament leader"
      : mode === "cash-games"
        ? "Cash-game leader"
        : "Overall leader";
  const leaderBadge =
    mode === "tournaments"
      ? "Tournament leader"
      : mode === "cash-games"
        ? "Cash leader"
        : "Overall leader";
  const activeNote = mostActive
    ? mode === "tournaments"
      ? countLabel(eventsForMode(mostActive, mode), "tournament")
      : mode === "cash-games"
        ? countLabel(eventsForMode(mostActive, mode), "cash game")
        : `${countLabel(eventsForMode(mostActive, mode), "event")} played`
    : "No results";

  const thirdHighlight =
    mode === "cash-games"
      ? {
          icon: TrendingUp,
          label: "Best win rate",
          player: bestWinRate,
          note: bestWinRate
            ? `${bestWinRate.cashGames.winRate.toFixed(0)}% across ${countLabel(bestWinRate.cashGames.gamesPlayed, "game")}`
            : "No cash-game results",
        }
      : {
          icon: Crown,
          label: "Most titles",
          player: mostTitles,
          note: `${mostTitles?.tournaments.wins ?? 0} tournament win${
            mostTitles?.tournaments.wins === 1 ? "" : "s"
          }`,
        };

  function handleModeChange(value: string) {
    if (!isPlayerViewMode(value)) return;
    setMode(value);
    router.replace(playerViewHref("/players", value), { scroll: false });
  }

  return (
    <Tabs
      value={mode}
      onValueChange={handleModeChange}
      className="mt-8 gap-0"
    >
      <TabsList className="w-full sm:w-fit" aria-label="Player statistics type">
        {PLAYER_VIEW_MODES.map((viewMode) => (
          <TabsTrigger key={viewMode.value} value={viewMode.value}>
            {viewMode.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {PLAYER_VIEW_MODES.map((viewMode) => (
        <TabsContent key={viewMode.value} value={viewMode.value} className="pt-6">
          {mode === viewMode.value ? (
            <>
              <section
          className="grid gap-3 md:grid-cols-3"
          aria-label={`${PLAYER_VIEW_MODES.find((item) => item.value === mode)?.label} player highlights`}
        >
          <HighlightCard
            icon={
              mode === "tournaments"
                ? Trophy
                : mode === "cash-games"
                  ? HandCoins
                  : Flame
            }
            label={leaderLabel}
            name={leader?.name}
            note={leader ? formatSignedMoney(netForMode(leader, mode)) : "—"}
            primary
          />
          <HighlightCard
            icon={CalendarCheck}
            label="Most active"
            name={mostActive?.name}
            note={activeNote}
          />
          <HighlightCard
            icon={thirdHighlight.icon}
            label={thirdHighlight.label}
            name={thirdHighlight.player?.name}
            note={thirdHighlight.note}
          />
              </section>

              <section className="mt-10">
          <div className="mb-4">
            <p className="eyebrow">The roster</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              All players
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sortedPlayers.map((player) => {
              const metrics = cardMetrics(player, mode);
              const isLeader = leader && player.name === leader.name;
              const isCashSpecialist =
                bestWinRate && player.name === bestWinRate.name;

              return (
                <Link
                  href={playerViewHref(`/players/${player.slug}`, mode)}
                  key={player.name}
                  className="group block min-w-0"
                >
                  <Card className="h-full transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PlayerAvatar
                          name={player.name}
                          className="size-9 text-[11px]"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold tracking-tight">
                            {player.name}
                          </h3>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {metrics.meta}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </CardHeader>

                    <CardContent className="px-4 pb-4">
                      <div className="rounded-lg bg-muted/70 p-3">
                        <p className="text-[11px] text-muted-foreground">
                          {metrics.netLabel}
                        </p>
                        <p
                          className={cn(
                            "numeric mt-0.5 text-xl font-semibold",
                            metrics.hasResults && metrics.netValue > 0
                              ? "text-positive"
                              : metrics.hasResults && metrics.netValue < 0
                                ? "text-negative"
                                : "",
                          )}
                        >
                          {metrics.hasResults
                            ? formatSignedMoney(metrics.netValue)
                            : "—"}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] leading-tight text-muted-foreground">
                            {metrics.firstLabel}
                          </p>
                          <p className="numeric mt-1 truncate text-xs font-semibold">
                            {metrics.firstValue}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] leading-tight text-muted-foreground">
                            {metrics.secondLabel}
                          </p>
                          <p className="numeric mt-1 truncate text-xs font-semibold">
                            {metrics.secondValue}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex min-h-6 items-center gap-2 border-t pt-3">
                        {isLeader ? (
                          <Badge
                            variant="success"
                            className="px-2 py-0.5 text-[10px]"
                          >
                            <Trophy /> {leaderBadge}
                          </Badge>
                        ) : mode !== "tournaments" && isCashSpecialist ? (
                          <Badge
                            variant="secondary"
                            className="px-2 py-0.5 text-[10px]"
                          >
                            <TrendingUp /> Cash specialist
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-medium text-primary">
                            View profile
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
              </section>
            </>
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
