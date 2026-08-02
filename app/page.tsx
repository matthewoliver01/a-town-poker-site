import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarRange,
  Coins,
  Flame,
  Gauge,
  Scale,
  Trophy,
  UsersRound,
} from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import siteContentJson from "@/data/site-content.json";
import tournamentsJson from "@/data/tournaments.json";
import { CashGameCard, TournamentCard } from "@/components/event-cards";
import { HomeAnnouncements } from "@/components/home-announcements";
import { HomeGallery } from "@/components/home-gallery";
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
  SiteContent,
  Tournament,
  TournamentStanding,
} from "@/lib/poker-types";
import { currentEasternDate, isAnnouncementActive } from "@/lib/site-content";
import { getTiedMetricLeaders } from "@/lib/superlatives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "A-Town Poker",
  description: "Tournament and cash-game results for A-Town Poker.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];
const siteContent = siteContentJson as SiteContent;
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
  names: string[];
  value: string;
  caption: string;
  icon: LucideIcon;
}

function SuperlativeCard({
  label,
  names,
  value,
  caption,
  icon: Icon,
}: Superlative) {
  return (
    <Card className="group h-full p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-4 font-semibold leading-snug">
        {names.map((name, index) => (
          <span key={name}>
            <Link
              href={`/players/${toPlayerSlug(name)}`}
              className="hover:text-primary hover:underline"
            >
              {name}
            </Link>
            {index < names.length - 1 ? ", " : null}
          </span>
        ))}
      </p>
      <p className="numeric mt-2 text-2xl font-semibold tracking-tight text-black">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </Card>
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
  const today = currentEasternDate();
  const activeAnnouncements = siteContent.announcements.filter((announcement) =>
    isAnnouncementActive(announcement, today),
  );
  const generalAnnouncements = activeAnnouncements
    .filter((announcement) => !announcement.eventId)
    .slice(0, 6);
  const upcomingAnnouncement = upcoming
    ? activeAnnouncements.find(
        (announcement) => announcement.eventId === upcoming.id,
      )
    : undefined;
  const galleryItems = siteContent.slides.map((slide) => ({
    id: slide.id,
    src: slide.src,
    caption: slide.caption,
    eventLabel: slide.eventTitle,
    href:
      slide.eventType === "tournament"
        ? `/tournaments/${slide.eventSlug}`
        : `/cash-games/${slide.eventSlug}`,
  }));

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
  const monthlyLeaders = latestMonth
    ? getTiedMetricLeaders(
        players
          .filter((player) =>
            player.history.some((event) => event.date.startsWith(latestMonth)),
          )
          .map((player) => ({
            name: player.name,
            value:
              player.monthlyProfit.find((point) => point.month === latestMonth)
                ?.totalProfit ?? 0,
          })),
      )
    : undefined;
  const cashSpecialists = getTiedMetricLeaders(
    cashLeaders.map((player) => ({
      name: player.name,
      value: player.netProfit,
    })),
  );
  const tournamentKings = getTiedMetricLeaders(
    tournamentLeaders.map((player) => ({
      name: player.name,
      value: player.netProfit,
    })),
  );
  const volatilityCandidates = cashLeaders.flatMap((player) =>
    typeof player.profitLossStandardDeviation === "number"
      ? [
          {
            name: player.name,
            value: player.profitLossStandardDeviation,
          },
        ]
      : [],
  );
  const mostVolatile =
    volatilityCandidates.length >= 2
      ? getTiedMetricLeaders(volatilityCandidates)
      : undefined;
  const leastVolatile =
    volatilityCandidates.length >= 2
      ? getTiedMetricLeaders(volatilityCandidates, "lowest")
      : undefined;
  const mostAverage = getTiedMetricLeaders(
    cashLeaders.map((player) => ({
      name: player.name,
      value: Math.abs(player.netProfit),
    })),
    "lowest",
  );
  const mostActive = getTiedMetricLeaders(
    players.map((player) => ({
      name: player.name,
      value: player.eventsPlayed,
    })),
  );

  const bestNight = getTiedMetricLeaders([
    ...completedTournaments.flatMap((event) =>
      event.players.map((player) => ({
        name: player.name,
        value:
          player.placementPayout + player.bonusPayout - player.totalBuyIn,
      })),
    ),
    ...completedCashGames.flatMap((event) =>
      event.players.map((player) => ({
        name: player.name,
        value: player.amountAtEnd - player.amountBuyIn,
      })),
    ),
  ]);

  const superlatives: Superlative[] = [
    ...(cashSpecialists
      ? [
          {
            label: "Cash specialist",
            names: cashSpecialists.names,
            value: formatSignedMoney(cashSpecialists.value),
            caption: "All-time cash profit",
            icon: Coins,
          },
        ]
      : []),
    ...(tournamentKings
      ? [
          {
            label: "Tournament king",
            names: tournamentKings.names,
            value: formatSignedMoney(tournamentKings.value),
            caption: "All-time tournament profit",
            icon: Trophy,
          },
        ]
      : []),
    ...(monthlyLeaders
      ? [
          {
            label: `${latestMonthLabel} leader`,
            names: monthlyLeaders.names,
            value: formatSignedMoney(monthlyLeaders.value),
            caption: `Combined profit in ${latestMonthLabel}`,
            icon: CalendarRange,
          },
        ]
      : []),
    ...(bestNight
      ? [
          {
            label: "Best night",
            names: bestNight.names,
            value: formatSignedMoney(bestNight.value),
            caption: "Highest single-event profit",
            icon: Flame,
          },
        ]
      : []),
    ...(mostActive
      ? [
          {
            label: "Biggest Degen",
            names: mostActive.names,
            value: String(mostActive.value),
            caption: "Tournaments and cash games played",
            icon: UsersRound,
          },
        ]
      : []),
    ...(mostVolatile
      ? [
          {
            label: "Most volatile",
            names: mostVolatile.names,
            value: formatMoney(mostVolatile.value),
            caption: "Cash-session profit/loss spread",
            icon: Activity,
          },
        ]
      : []),
    ...(leastVolatile
      ? [
          {
            label: "Least volatile",
            names: leastVolatile.names,
            value: formatMoney(leastVolatile.value),
            caption: "Cash-session profit/loss spread",
            icon: Gauge,
          },
        ]
      : []),
    ...(mostAverage
      ? [
          {
            label: "Most average",
            names: mostAverage.names,
            value: formatMoney(mostAverage.value),
            caption: "Distance from $0 cash net",
            icon: Scale,
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
          <div className={upcoming.photos?.length ? "max-w-3xl" : "max-w-2xl"}>
            <TournamentCard
              tournament={upcoming}
              announcement={
                upcomingAnnouncement
                  ? {
                      title: upcomingAnnouncement.title,
                      body: upcomingAnnouncement.body,
                    }
                  : undefined
              }
            />
          </div>
        </section>
      ) : null}

      {galleryItems.length > 0 ? (
        <section className="mt-14" aria-labelledby="photos-heading">
          <h2
            id="photos-heading"
            className="mb-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
          >
            Photos
          </h2>
          <div className="max-w-2xl">
            <HomeGallery items={galleryItems} />
          </div>
        </section>
      ) : null}

      {generalAnnouncements.length > 0 ? (
        <section className="mt-14" aria-labelledby="announcements-heading">
          <h2
            id="announcements-heading"
            className="mb-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
          >
            Announcements
          </h2>
          <HomeAnnouncements announcements={generalAnnouncements} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
