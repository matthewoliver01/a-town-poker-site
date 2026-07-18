import type { Metadata } from "next";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { StandingsTables } from "@/components/standings-tables";
import { getCashGameStandings, getTournamentStandings } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Standings",
  description: "Tournament and cash-game leaderboards with wins, payouts, profit, averages, and ROI.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

export default function StandingsPage() {
  const tournamentStandings = getTournamentStandings(tournaments);
  const cashGameStandings = getCashGameStandings(cashGames);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro title="Standings" />

      <section className="mt-8">
        <StandingsTables tournamentStandings={tournamentStandings} cashGameStandings={cashGameStandings} />
      </section>
    </div>
  );
}
