import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Crown, Flame, TrendingUp, Trophy } from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatSignedMoney } from "@/lib/format";
import { getPlayerProfiles } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Players",
  description: "Player profiles with tournament finishes, cash-game results, and profit trends.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

export default function PlayersPage() {
  const players = getPlayerProfiles(tournaments, cashGames).toSorted((a, b) => b.combinedNetProfit - a.combinedNetProfit);
  const mostActive = players.toSorted((a, b) => b.eventsPlayed - a.eventsPlayed)[0];
  const mostTitles = players.toSorted((a, b) => b.tournaments.wins - a.tournaments.wins || b.combinedNetProfit - a.combinedNetProfit)[0];
  const bestWinRate = players.toSorted((a, b) => b.cashGames.winRate - a.cashGames.winRate)[0];

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro eyebrow="Player profiles" title="Everyone has a story in the stats." description="Open any profile for monthly profit trends, tournament finishes, cash-game form, and a complete event history." />

      <section className="mt-8 grid gap-3 md:grid-cols-3" aria-label="Player highlights">
        <Card className="bg-primary text-primary-foreground"><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><Flame className="size-4.5" /></span><div><p className="text-xs text-white/55">Overall leader</p><p className="mt-1 font-semibold">{players[0]?.name}</p><p className="numeric mt-0.5 text-sm text-[#bfe0cc]">{players[0] ? formatSignedMoney(players[0].combinedNetProfit) : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><CalendarCheck className="size-4.5" /></span><div><p className="text-xs text-muted-foreground">Most active</p><p className="mt-1 font-semibold">{mostActive?.name}</p><p className="mt-0.5 text-sm text-muted-foreground">{mostActive?.eventsPlayed} events played</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Crown className="size-4.5" /></span><div><p className="text-xs text-muted-foreground">Most titles</p><p className="mt-1 font-semibold">{mostTitles?.name}</p><p className="mt-0.5 text-sm text-muted-foreground">{mostTitles?.tournaments.wins} tournament win{mostTitles?.tournaments.wins === 1 ? "" : "s"}</p></div></CardContent></Card>
      </section>

      <section className="mt-12">
        <div className="mb-6"><p className="eyebrow">The roster</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">All players</h2></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((player, index) => (
            <Link href={`/players/${player.slug}`} key={player.name} className="group block">
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="flex items-center gap-3"><PlayerAvatar name={player.name} className="size-12 text-sm" /><div><h3 className="font-semibold tracking-tight">{player.name}</h3><p className="mt-1 text-xs text-muted-foreground">{player.eventsPlayed} events · {player.eventsHosted} hosted</p></div></div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-muted/70 p-4"><p className="text-xs text-muted-foreground">Combined net</p><p className={cn("numeric mt-1 text-2xl font-semibold", player.combinedNetProfit > 0 ? "text-positive" : player.combinedNetProfit < 0 ? "text-negative" : "")}>{formatSignedMoney(player.combinedNetProfit)}</p></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Tournament wins</p><p className="numeric mt-1 font-semibold">{player.tournaments.wins}</p></div><div><p className="text-xs text-muted-foreground">Cash win rate</p><p className="numeric mt-1 font-semibold">{player.cashGames.winRate.toFixed(0)}%</p></div></div>
                  <div className="mt-5 flex items-center gap-2 border-t pt-4">
                    {index === 0 ? <Badge variant="success"><Trophy /> Overall leader</Badge> : player.name === bestWinRate?.name ? <Badge variant="secondary"><TrendingUp /> Cash specialist</Badge> : <span className="text-xs font-medium text-primary">View profile</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
