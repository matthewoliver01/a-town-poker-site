import type { Metadata } from "next";
import Link from "next/link";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { CashGameCard, TournamentCard } from "@/components/event-cards";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatMoney,
  formatSignedMoney,
  formatTournamentWinLabel,
  formatTournamentWins,
} from "@/lib/format";
import {
  getCashGameStandings,
  getCompletedCashGames,
  getCompletedTournaments,
  getPlayerProfiles,
  getRecentCashGames,
  getRecentTournaments,
  getTournamentStandings,
  getUpcomingTournaments,
  toPlayerSlug,
} from "@/lib/poker-data";
import type {
  CashGame,
  CashGameStanding,
  Tournament,
  TournamentStanding,
} from "@/lib/poker-types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "A-Town Poker",
  description: "Tournament and cash-game results for A-Town Poker.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];
const standingsLimit = 8;

function NetValue({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "numeric font-semibold",
        value > 0 && "text-positive",
        value < 0 && "text-negative",
      )}
    >
      {formatSignedMoney(value)}
    </span>
  );
}

function CashStandings({ standings }: { standings: CashGameStanding[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3.5">
        <h3 className="font-semibold">Cash games</h3>
        <Link
          href="/standings"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {standings.length > 0 ? (
        <Table>
          <TableHeader className="bg-muted/55">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 w-10 px-3 text-center">#</TableHead>
              <TableHead className="h-9 px-2">Player</TableHead>
              <TableHead className="h-9 px-2 text-center">GP</TableHead>
              <TableHead className="h-9 px-4 text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.slice(0, standingsLimit).map((player, index) => (
              <TableRow key={player.name}>
                <TableCell className="numeric px-3 py-2 text-center text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Link
                    href={`/players/${toPlayerSlug(player.name)}`}
                    className="text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {player.name}
                  </Link>
                </TableCell>
                <TableCell className="numeric px-2 py-2 text-center text-sm text-muted-foreground">
                  {player.gamesPlayed}
                </TableCell>
                <TableCell className="px-4 py-2 text-right text-sm">
                  <NetValue value={player.netProfit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No cash-game results.
        </p>
      )}
    </Card>
  );
}

function TournamentStandings({
  standings,
}: {
  standings: TournamentStanding[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3.5">
        <h3 className="font-semibold">Tournaments</h3>
        <Link
          href="/standings?mode=tournaments"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {standings.length > 0 ? (
        <Table>
          <TableHeader className="bg-muted/55">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 w-10 px-3 text-center">#</TableHead>
              <TableHead className="h-9 px-2">Player</TableHead>
              <TableHead className="h-9 px-2 text-center">Wins</TableHead>
              <TableHead className="h-9 px-4 text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.slice(0, standingsLimit).map((player, index) => (
              <TableRow key={player.name}>
                <TableCell className="numeric px-3 py-2 text-center text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Link
                    href={`/players/${toPlayerSlug(player.name)}`}
                    className="text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {player.name}
                  </Link>
                </TableCell>
                <TableCell className="numeric px-2 py-2 text-center text-sm text-muted-foreground">
                  {formatTournamentWins(player.wins)}
                </TableCell>
                <TableCell className="px-4 py-2 text-right text-sm">
                  <NetValue value={player.netProfit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No tournament results.
        </p>
      )}
    </Card>
  );
}

interface Superlative {
  label: string;
  name: string;
  value: string;
}

function SuperlativeCard({ label, name, value }: Superlative) {
  return (
    <Link href={`/players/${toPlayerSlug(name)}`} className="block h-full">
      <Card className="h-full p-4 transition-colors hover:border-primary/30">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 truncate font-semibold">{name}</p>
        <p className="numeric mt-1 text-sm font-semibold text-primary">
          {value}
        </p>
      </Card>
    </Link>
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

  const latestCompletedDate = [
    ...completedTournaments.map((event) => event.date),
    ...completedCashGames.map((event) => event.date),
  ]
    .sort()
    .at(-1);
  const latestMonth = latestCompletedDate?.slice(0, 7);
  const latestMonthLabel = latestCompletedDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        timeZone: "UTC",
      }).format(new Date(`${latestCompletedDate}T12:00:00Z`))
    : "Monthly";
  const monthlyLeader = latestMonth
    ? players
        .filter((player) =>
          player.history.some((event) => event.date.startsWith(latestMonth)),
        )
        .map((player) => ({
          player,
          profit:
            player.monthlyProfit.find((point) => point.month === latestMonth)
              ?.totalProfit ?? 0,
        }))
        .toSorted(
          (a, b) =>
            b.profit - a.profit || a.player.name.localeCompare(b.player.name),
        )[0]
    : undefined;
  const tournamentKing = tournamentLeaders.toSorted(
    (a, b) =>
      b.wins - a.wins ||
      b.netProfit - a.netProfit ||
      a.name.localeCompare(b.name),
  )[0];
  const volatilityLeaders = cashLeaders
    .filter((player) => player.profitLossStandardDeviation !== null)
    .toSorted(
      (a, b) =>
        (b.profitLossStandardDeviation ?? 0) -
          (a.profitLossStandardDeviation ?? 0) ||
        b.gamesPlayed - a.gamesPlayed ||
        a.name.localeCompare(b.name),
    );
  const mostVolatile =
    volatilityLeaders.length >= 2 ? volatilityLeaders[0] : undefined;
  const leastVolatile =
    volatilityLeaders.length >= 2
      ? volatilityLeaders.toSorted(
          (a, b) =>
            (a.profitLossStandardDeviation ?? Number.POSITIVE_INFINITY) -
              (b.profitLossStandardDeviation ?? Number.POSITIVE_INFINITY) ||
            b.gamesPlayed - a.gamesPlayed ||
            a.name.localeCompare(b.name),
        )[0]
      : undefined;
  const mostAverage = cashLeaders.toSorted(
    (a, b) =>
      Math.abs(a.netProfit) - Math.abs(b.netProfit) ||
      b.gamesPlayed - a.gamesPlayed ||
      a.name.localeCompare(b.name),
  )[0];
  const mostActive = players.toSorted(
    (a, b) =>
      b.eventsPlayed - a.eventsPlayed ||
      b.combinedNetProfit - a.combinedNetProfit ||
      a.name.localeCompare(b.name),
  )[0];

  const bestNight = [
    ...completedTournaments.flatMap((event) =>
      event.players.map((player) => ({
        name: player.name,
        profit: player.placementPayout + player.bonusPayout - player.totalBuyIn,
      })),
    ),
    ...completedCashGames.flatMap((event) =>
      event.players.map((player) => ({
        name: player.name,
        profit: player.amountAtEnd - player.amountBuyIn,
      })),
    ),
  ].toSorted((a, b) => b.profit - a.profit || a.name.localeCompare(b.name))[0];

  const superlatives: Superlative[] = [
    ...(cashLeaders[0]
      ? [
          {
            label: "Cash specialist",
            name: cashLeaders[0].name,
            value: `${formatSignedMoney(cashLeaders[0].netProfit)} all-time`,
          },
        ]
      : []),
    ...(monthlyLeader
      ? [
          {
            label: `${latestMonthLabel} leader`,
            name: monthlyLeader.player.name,
            value: `${formatSignedMoney(monthlyLeader.profit)} in ${latestMonthLabel}`,
          },
        ]
      : []),
    ...(tournamentKing
      ? [
          {
            label: "Tournament king",
            name: tournamentKing.name,
            value: formatTournamentWinLabel(tournamentKing.wins),
          },
        ]
      : []),
    ...(bestNight
      ? [
          {
            label: "Best night",
            name: bestNight.name,
            value: formatSignedMoney(bestNight.profit),
          },
        ]
      : []),
    ...(mostActive
      ? [
          {
            label: "Biggest Degen",
            name: mostActive.name,
            value: `${mostActive.eventsPlayed} events`,
          },
        ]
      : []),
    ...(typeof mostVolatile?.profitLossStandardDeviation === "number"
      ? [
          {
            label: "Most volatile",
            name: mostVolatile.name,
            value: `${formatMoney(mostVolatile.profitLossStandardDeviation)} variance`,
          },
        ]
      : []),
    ...(typeof leastVolatile?.profitLossStandardDeviation === "number"
      ? [
          {
            label: "Least volatile",
            name: leastVolatile.name,
            value: `${formatMoney(leastVolatile.profitLossStandardDeviation)} variance`,
          },
        ]
      : []),
    ...(mostAverage
      ? [
          {
            label: "Most average",
            name: mostAverage.name,
            value: `${formatSignedMoney(mostAverage.netProfit)} cash net`,
          },
        ]
      : []),
  ];

  return (
    <div className="page-shell py-10 sm:py-14">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
          A-Town Poker
        </h1>
      </header>

      {upcoming ? (
        <section className="mt-10">
          <SectionHeading
            title="Upcoming tournament"
            href="/tournaments"
            linkLabel="All tournaments"
          />
          <div className="max-w-2xl">
            <TournamentCard tournament={upcoming} />
          </div>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="standings-heading">
        <h2
          id="standings-heading"
          className="mb-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
        >
          Standings
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <CashStandings standings={cashLeaders} />
          <TournamentStandings standings={tournamentLeaders} />
        </div>
      </section>

      {superlatives.length > 0 ? (
        <section className="mt-14" aria-labelledby="superlatives-heading">
          <h2
            id="superlatives-heading"
            className="mb-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
          >
            Superlatives
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {superlatives.map((item) => (
              <SuperlativeCard key={item.label} {...item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14">
        <SectionHeading
          title="Recent tournaments"
          href="/tournaments"
          linkLabel="All tournaments"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentTournaments.map((event) => (
            <TournamentCard key={event.id} tournament={event} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading
          title="Recent cash games"
          href="/cash-games"
          linkLabel="All cash games"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentCashGames.map((game) => (
            <CashGameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
}
