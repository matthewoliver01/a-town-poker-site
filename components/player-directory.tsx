"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSignedMoney, formatTournamentWins } from "@/lib/format";
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
      netLabel: "Net",
      netValue: player.tournaments.netProfit,
      firstLabel: "Wins",
      firstValue: formatTournamentWins(player.tournaments.wins),
      secondLabel: "ROI",
      secondValue: player.tournaments.tournamentsPlayed
        ? `${player.tournaments.returnOnInvestment.toFixed(0)}%`
        : "—",
    };
  }

  if (mode === "cash-games") {
    return {
      hasResults: player.cashGames.gamesPlayed > 0,
      meta: `${countLabel(player.cashGames.gamesPlayed, "cash game")} · ${countLabel(player.cashGames.winningSessions, "win")}`,
      netLabel: "Net",
      netValue: player.cashGames.netProfit,
      firstLabel: "Win rate",
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
    netLabel: "Net",
    netValue: player.combinedNetProfit,
    firstLabel: "Tournament wins",
    firstValue: formatTournamentWins(player.tournaments.wins),
    secondLabel: "Cash win rate",
    secondValue: player.cashGames.gamesPlayed
      ? `${player.cashGames.winRate.toFixed(0)}%`
      : "—",
  };
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
            <section aria-label={`${viewMode.label} players`}>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {sortedPlayers.map((player) => {
                  const metrics = cardMetrics(player, mode);

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
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
