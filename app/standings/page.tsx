import type { Metadata } from "next";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { StandingsTables, type StandingsMode } from "@/components/standings-tables";
import { getCashGameStandings, getTournamentStandings } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Standings",
  description: "Tournament and cash-game leaderboards with wins, payouts, profit, averages, and ROI.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

interface StandingsPageProps {
  searchParams: Promise<{ mode?: string | string[] }>;
}

function parseStandingsMode(value: string | string[] | undefined): StandingsMode {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === "tournaments" ? "tournaments" : "cash-games";
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const query = await searchParams;
  const tournamentStandings = getTournamentStandings(tournaments);
  const cashGameStandings = getCashGameStandings(cashGames);
  const initialMode = parseStandingsMode(query.mode);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro title="Standings" />

      <section className="mt-8">
        <StandingsTables
          key={initialMode}
          tournamentStandings={tournamentStandings}
          cashGameStandings={cashGameStandings}
          initialMode={initialMode}
        />
      </section>
    </div>
  );
}
