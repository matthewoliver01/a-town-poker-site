import type { Metadata } from "next";
import { notFound } from "next/navigation";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import {
  PlayerProfileView,
  type PlayerHostedCounts,
} from "@/components/player-profile-view";
import { formatDate } from "@/lib/format";
import {
  getPlayerProfileBySlug,
  getPlayerProfiles,
  getTournamentBySlug,
  toPlayerSlug,
} from "@/lib/poker-data";
import { parsePlayerViewMode } from "@/lib/player-view";
import type { CashGame, Tournament } from "@/lib/poker-types";

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

type PlayerDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
};

export function generateStaticParams() {
  return getPlayerProfiles(tournaments, cashGames).map((profile) => ({
    slug: profile.slug,
  }));
}

export async function generateMetadata({
  params,
}: Pick<PlayerDetailPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const profile = getPlayerProfileBySlug(slug, tournaments, cashGames);

  return profile
    ? {
        title: profile.name,
        description: `${profile.name}'s poker results, monthly trends, and complete event history.`,
      }
    : {};
}

export default async function PlayerDetailPage({
  params,
  searchParams,
}: PlayerDetailPageProps) {
  const { slug } = await params;
  const query: { mode?: string | string[] } = searchParams
    ? await searchParams
    : {};
  const profile = getPlayerProfileBySlug(slug, tournaments, cashGames);
  if (!profile) notFound();

  const hostedCounts: PlayerHostedCounts = {
    tournaments: tournaments.filter(
      (tournament) =>
        tournament.status === "completed" &&
        toPlayerSlug(tournament.host) === profile.slug,
    ).length,
    cashGames: cashGames.filter(
      (cashGame) =>
        cashGame.status === "completed" &&
        toPlayerSlug(cashGame.host) === profile.slug,
    ).length,
  };
  const tournamentChartData = profile.history
    .filter((event) => event.eventType === "tournament")
    .toReversed()
    .map((event) => {
      const tournament = getTournamentBySlug(tournaments, event.slug);
      return {
        tournament:
          tournament?.title.split(" ").slice(0, 2).join(" ") ?? event.title,
        placement: event.placement,
        fieldSize: tournament?.players.length,
        payout: event.totalPayout,
        date: formatDate(event.date),
      };
    });

  return (
    <PlayerProfileView
      profile={profile}
      tournamentChartData={tournamentChartData}
      initialMode={parsePlayerViewMode(query.mode)}
      hostedCounts={hostedCounts}
    />
  );
}
