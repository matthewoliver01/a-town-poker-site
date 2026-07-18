import type { Metadata } from "next";
import Link from "next/link";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { CashGameCard, TournamentCard } from "@/components/event-cards";
import { PlayerAvatar } from "@/components/player-avatar";
import { SectionHeading } from "@/components/section-heading";
import { formatDate, formatMoney, formatSignedMoney, formatTournamentWinLabel } from "@/lib/format";
import { getCashGameStandings, getCompletedCashGames, getCompletedTournaments, getPlayerProfiles, getRecentCashGames, getRecentTournaments, getTournamentStandings, getUpcomingTournaments } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "A-Town Poker",
  description: "Tournament and cash-game results for A-Town Poker.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

function LeaderRow({ rank, name, value, note }: { rank: number; name: string; value: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/35 p-3">
      <span className="numeric grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">{rank}</span>
      <PlayerAvatar name={name} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
      </div>
      <span className="numeric text-sm font-semibold text-primary">{value}</span>
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
  const totalBuyIns = completedTournaments.reduce((sum, event) => sum + event.players.reduce((subtotal, player) => subtotal + player.totalBuyIn, 0), 0) + completedCashGames.reduce((sum, game) => sum + game.players.reduce((subtotal, player) => subtotal + player.amountBuyIn, 0), 0);

  return (
    <div className="page-shell py-10 sm:py-14">
      <header className="border-b pb-8">
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">A-Town Poker</h1>
        <dl className="mt-7 grid max-w-2xl grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">Players</dt>
            <dd className="numeric mt-1 text-xl font-semibold sm:text-2xl">{players.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Completed events</dt>
            <dd className="numeric mt-1 text-xl font-semibold sm:text-2xl">{completedTournaments.length + completedCashGames.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total buy-ins</dt>
            <dd className="numeric mt-1 text-xl font-semibold sm:text-2xl">{formatMoney(totalBuyIns)}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="standings-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="standings-heading" className="text-xl font-semibold tracking-tight">Standings</h2>
          <Link href="/standings" className="text-sm font-semibold text-primary hover:underline">View all</Link>
        </div>
        {tournamentLeaders.length > 0 ? (
          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {tournamentLeaders.slice(0, 3).map((leader, index) => (
              <LeaderRow
                key={leader.name}
                rank={index + 1}
                name={leader.name}
                note={`${formatTournamentWinLabel(leader.wins)} · ${leader.tournamentsPlayed} played`}
                value={formatSignedMoney(leader.netProfit)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No tournament results.</p>
        )}
        {cashLeaders[0] ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
            <span className="text-muted-foreground">Cash game leader</span>
            <span className="font-semibold">{cashLeaders[0].name} <span className="numeric ml-1 text-primary">{formatSignedMoney(cashLeaders[0].netProfit)}</span></span>
          </div>
        ) : null}
      </section>

      {upcoming ? (
        <section className="mt-6" aria-labelledby="next-tournament-heading">
          <Link href={`/tournaments/${upcoming.slug}`} className="block rounded-2xl border bg-card p-5 transition-colors hover:border-primary/30">
            <p className="text-xs font-medium text-muted-foreground">Next tournament</p>
            <h2 id="next-tournament-heading" className="mt-1.5 font-semibold">{upcoming.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(upcoming.date)} · {upcoming.venue} · Host: {upcoming.host}</p>
          </Link>
        </section>
      ) : null}

      <section className="mt-14">
        <SectionHeading title="Recent tournaments" href="/tournaments" linkLabel="All tournaments" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentTournaments.map((event) => <TournamentCard key={event.id} tournament={event} />)}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading title="Recent cash games" href="/cash-games" linkLabel="All cash games" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentCashGames.map((game) => <CashGameCard key={game.id} game={game} />)}
        </div>
      </section>
    </div>
  );
}
