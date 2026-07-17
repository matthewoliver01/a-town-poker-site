import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, CircleDollarSign, Crown, HandCoins, Target, TrendingUp, Trophy } from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { MonthlyProfitChart, TournamentFinishesChart } from "@/components/poker-charts";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import { getPlayerProfileBySlug, getPlayerProfiles, getTournamentBySlug } from "@/lib/poker-data";
import { formatTournamentPlacement } from "@/lib/poker-placement";
import type { CashGame, Tournament } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

export function generateStaticParams() {
  return getPlayerProfiles(tournaments, cashGames).map((profile) => ({ slug: profile.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = getPlayerProfileBySlug(slug, tournaments, cashGames);
  return profile ? { title: profile.name, description: `${profile.name}'s poker results, monthly trends, and complete event history.` } : {};
}

function StatCard({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string; note?: string }) {
  return <Card><CardContent className="flex gap-3 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="numeric mt-1 truncate text-lg font-semibold">{value}</p>{note ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p> : null}</div></CardContent></Card>;
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = getPlayerProfileBySlug(slug, tournaments, cashGames);
  if (!profile) notFound();

  const monthlyChartData = profile.monthlyProfit.map((point) => ({
    month: point.label.replace(" 2026", ""),
    profit: point.totalProfit,
    games: profile.history.filter((event) => event.date.startsWith(point.month)).length,
  }));
  const tournamentChartData = profile.history
    .filter((event) => event.eventType === "tournament")
    .toReversed()
    .map((event) => {
      const tournament = getTournamentBySlug(tournaments, event.slug);
      return {
        tournament: tournament?.title.split(" ").slice(0, 2).join(" ") ?? event.title,
        placement: event.placement,
        fieldSize: tournament?.players.length,
        payout: event.totalPayout,
        date: formatDate(event.date),
      };
    });

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href="/players" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> All players</Link>

      <header className="relative overflow-hidden rounded-3xl border bg-primary px-6 py-8 text-primary-foreground shadow-xl shadow-primary/10 subtle-grid sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5"><PlayerAvatar name={profile.name} className="size-16 border-4 border-white/10 text-lg sm:size-20" /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Player profile</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{profile.name}</h1><p className="mt-3 text-sm text-white/65">{profile.eventsPlayed} events played · {profile.eventsHosted} hosted</p></div></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 sm:text-right"><p className="text-xs text-white/55">Combined net</p><p className={cn("numeric mt-1 text-3xl font-semibold", profile.combinedNetProfit >= 0 ? "text-[#bfe0cc]" : "text-[#f2b8b2]")}>{formatSignedMoney(profile.combinedNetProfit)}</p></div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={`${profile.name} summary`}>
        <StatCard icon={CalendarCheck} label="Events played" value={String(profile.eventsPlayed)} note={`${profile.eventsHosted} hosted`} />
        <StatCard icon={Trophy} label="Tournament titles" value={String(profile.tournaments.wins)} note={`${profile.tournaments.topThreeFinishes} top-three finishes`} />
        <StatCard icon={Target} label="Cash win rate" value={`${profile.cashGames.winRate.toFixed(0)}%`} note={`${profile.cashGames.winningSessions} winning sessions`} />
        <StatCard icon={CircleDollarSign} label="Total buy-ins" value={formatMoney(profile.combinedBuyIn)} note="All tracked events" />
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-lg">Profit by month</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tournament and cash-game results combined</p></div><Badge variant="secondary"><TrendingUp /> Net P/L</Badge></div></CardHeader>
          <CardContent><MonthlyProfitChart data={monthlyChartData} height={300} ariaLabel={`${profile.name}'s monthly profit and loss`} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Tournament form</CardTitle><p className="text-sm text-muted-foreground">Finish strength across each field</p></CardHeader>
          <CardContent><TournamentFinishesChart data={tournamentChartData} height={300} ariaLabel={`${profile.name}'s tournament finishes`} /></CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><Crown className="size-4" /></span><div><CardTitle className="text-lg">Tournament snapshot</CardTitle><p className="text-sm text-muted-foreground">{profile.tournaments.tournamentsPlayed} events played</p></div></div></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Net profit</p><p className={cn("numeric mt-1 font-semibold", profile.tournaments.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(profile.tournaments.netProfit)}</p></div><div><p className="text-xs text-muted-foreground">Total payouts</p><p className="numeric mt-1 font-semibold">{formatMoney(profile.tournaments.amountWon)}</p></div><div><p className="text-xs text-muted-foreground">Average finish</p><p className="numeric mt-1 font-semibold">{profile.tournaments.averageFinish === null ? "—" : profile.tournaments.averageFinish.toFixed(1)}</p></div><div><p className="text-xs text-muted-foreground">Best finish</p><p className="numeric mt-1 font-semibold">{profile.tournaments.highestFinish === null ? "—" : formatTournamentPlacement(profile.tournaments.highestFinish)}</p></div><div><p className="text-xs text-muted-foreground">In the money</p><p className="numeric mt-1 font-semibold">{profile.tournaments.cashRate.toFixed(0)}%</p></div><div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{profile.tournaments.returnOnInvestment.toFixed(1)}%</p></div></CardContent>
        </Card>
        <Card>
          <CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-accent text-primary"><HandCoins className="size-4" /></span><div><CardTitle className="text-lg">Cash-game snapshot</CardTitle><p className="text-sm text-muted-foreground">{profile.cashGames.gamesPlayed} sessions played</p></div></div></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Net profit</p><p className={cn("numeric mt-1 font-semibold", profile.cashGames.netProfit >= 0 ? "text-positive" : "text-negative")}>{formatSignedMoney(profile.cashGames.netProfit)}</p></div><div><p className="text-xs text-muted-foreground">Average P/L</p><p className="numeric mt-1 font-semibold">{formatSignedMoney(profile.cashGames.averageProfitLoss)}</p></div><div><p className="text-xs text-muted-foreground">Win rate</p><p className="numeric mt-1 font-semibold">{profile.cashGames.winRate.toFixed(0)}%</p></div><div><p className="text-xs text-muted-foreground">Biggest win</p><p className="numeric mt-1 font-semibold text-positive">{profile.cashGames.biggestWin === null ? "—" : formatSignedMoney(profile.cashGames.biggestWin)}</p></div><div><p className="text-xs text-muted-foreground">Biggest loss</p><p className="numeric mt-1 font-semibold text-negative">{profile.cashGames.biggestLoss === null ? "—" : formatSignedMoney(profile.cashGames.biggestLoss)}</p></div><div><p className="text-xs text-muted-foreground">ROI</p><p className="numeric mt-1 font-semibold">{profile.cashGames.returnOnInvestment.toFixed(1)}%</p></div></CardContent>
        </Card>
      </section>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="border-b bg-muted/35"><CardTitle className="text-lg">Complete event history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead>Date</TableHead><TableHead>Event</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Result</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
            <TableBody>
              {profile.history.map((event) => (
                <TableRow key={`${event.eventType}-${event.id}`}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(event.date)}</TableCell>
                  <TableCell><Link href={event.eventType === "tournament" ? `/tournaments/${event.slug}` : `/cash-games/${event.slug}`} className="font-semibold hover:text-primary hover:underline">{event.title}</Link><p className="mt-1 text-xs text-muted-foreground">Hosted by {event.host}</p></TableCell>
                  <TableCell><Badge variant="secondary">{event.eventType === "tournament" ? "Tournament" : "Cash game"}</Badge></TableCell>
                  <TableCell className="numeric text-right">{event.eventType === "tournament" ? formatTournamentPlacement(event.placement) : formatMoney(event.amountAtEnd)}</TableCell>
                  <TableCell className={cn("numeric text-right font-semibold", event.netProfit > 0 ? "text-positive" : event.netProfit < 0 ? "text-negative" : "")}>{formatSignedMoney(event.netProfit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
