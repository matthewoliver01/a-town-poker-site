import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, Club, Crown, Sparkles, Trophy, Users } from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { CashGameCard, TournamentCard } from "@/components/event-cards";
import { PlayerAvatar } from "@/components/player-avatar";
import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import { getCashGameStandings, getCompletedCashGames, getCompletedTournaments, getPlayerProfiles, getRecentCashGames, getRecentTournaments, getTournamentStandings, getUpcomingTournaments } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "A-Town Poker",
  description: "Tournament finishes, cash-game ledgers, player stats, and friendly rivalries for A-Town Poker.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

function LeaderRow({ rank, name, value, note }: { rank: number; name: string; value: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
      <span className="numeric grid size-7 place-items-center rounded-lg bg-white/10 text-xs font-semibold text-white/60">{rank}</span>
      <PlayerAvatar name={name} className="size-9" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{name}</p><p className="mt-0.5 text-xs text-white/50">{note}</p></div>
      <span className="numeric text-sm font-semibold text-[#bfe0cc]">{value}</span>
    </div>
  );
}

export default function Home() {
  const completedTournaments = getCompletedTournaments(tournaments);
  const completedCashGames = getCompletedCashGames(cashGames);
  const recentTournaments = getRecentTournaments(tournaments, 3);
  const recentCashGames = getRecentCashGames(cashGames, 3);
  const upcoming = getUpcomingTournaments(tournaments)[0];
  const tournamentLeaders = getTournamentStandings(tournaments);
  const cashLeaders = getCashGameStandings(cashGames);
  const players = getPlayerProfiles(tournaments, cashGames);
  const totalTracked = completedTournaments.reduce((sum, event) => sum + event.players.reduce((subtotal, player) => subtotal + player.totalBuyIn, 0), 0) + completedCashGames.reduce((sum, game) => sum + game.players.reduce((subtotal, player) => subtotal + player.amountBuyIn, 0), 0);

  return (
    <>
      <section className="page-shell pt-10 sm:pt-16">
        <div className="grid overflow-hidden rounded-[2rem] border bg-card shadow-sm lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="absolute -left-20 -top-24 size-64 rounded-full bg-accent/80 blur-3xl" />
            <div className="relative">
              <p className="eyebrow flex items-center gap-2"><Sparkles className="size-3.5" /> The club record</p>
              <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
                The ledger behind <span className="text-primary">the legend.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Every buy-in, comeback, cooler, and championship—organized into one simple home for the group.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/standings" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-xl")}>View the standings <ArrowRight className="size-4" /></Link>
                <Link href="/players" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-xl")}>Meet the players</Link>
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-3 gap-5 border-t pt-6">
                <div><p className="numeric text-2xl font-semibold">{players.length}</p><p className="mt-1 text-xs text-muted-foreground">Players tracked</p></div>
                <div><p className="numeric text-2xl font-semibold">{completedTournaments.length + completedCashGames.length}</p><p className="mt-1 text-xs text-muted-foreground">Nights logged</p></div>
                <div><p className="numeric text-2xl font-semibold">{formatMoney(totalTracked)}</p><p className="mt-1 text-xs text-muted-foreground">Total action</p></div>
              </div>
            </div>
          </div>

          <aside className="relative flex flex-col justify-center bg-primary p-6 text-primary-foreground subtle-grid sm:p-10 lg:p-12">
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Current leaders</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Top of the table</h2></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Trophy className="size-5 text-[#e6c879]" /></span></div>
              <div className="mt-6 space-y-2.5">
                {tournamentLeaders.slice(0, 3).map((leader, index) => <LeaderRow key={leader.name} rank={index + 1} name={leader.name} note={`${leader.wins} win${leader.wins === 1 ? "" : "s"} · ${leader.tournamentsPlayed} played`} value={formatSignedMoney(leader.netProfit)} />)}
              </div>
              {cashLeaders[0] ? <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5 text-sm"><span className="text-white/55">Cash-game leader</span><span className="font-semibold">{cashLeaders[0].name} <span className="numeric ml-1 text-[#bfe0cc]">{formatSignedMoney(cashLeaders[0].netProfit)}</span></span></div> : null}
            </div>
          </aside>
        </div>
      </section>

      {upcoming ? (
        <section className="page-shell mt-6">
          <Link href={`/tournaments/${upcoming.slug}`} className="group flex flex-col gap-5 rounded-2xl border border-primary/15 bg-accent/70 p-5 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><CalendarDays className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Next on the calendar</p><h2 className="mt-1 font-semibold">{upcoming.title} <span className="font-normal text-muted-foreground">· {formatDate(upcoming.date)}</span></h2></div></div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">View tournament <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </section>
      ) : null}

      <section className="page-shell mt-20">
        <SectionHeading eyebrow="Latest action" title="Recent tournaments" description="Champions, prize pools, and every finishing position from the latest tournament nights." href="/tournaments" linkLabel="All tournaments" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{recentTournaments.map((event) => <TournamentCard key={event.id} tournament={event} />)}</div>
      </section>

      <section className="page-shell mt-20">
        <SectionHeading eyebrow="The ledger" title="Recent cash games" description="Who booked a win, who paid the table tax, and how every session balanced out." href="/cash-games" linkLabel="All cash games" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{recentCashGames.map((game) => <CashGameCard key={game.id} game={game} />)}</div>
      </section>

      <section className="page-shell mt-20">
        <Card className="overflow-hidden border-0 bg-[#e8eee9] shadow-none">
          <CardContent className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-5"><span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-card text-primary shadow-sm sm:grid"><Club className="size-6 fill-current" /></span><div><p className="eyebrow">Numbers meet bragging rights</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">See how every player stacks up.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Tournament trophies, cash-game win rates, monthly profit trends, and complete event histories—one profile at a time.</p></div></div>
            <Link href="/players" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-xl")}>Explore player profiles <Users className="size-4" /></Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
