import type { Metadata } from "next";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import {
  StandingsDashboard,
  type CashStandingsPeriod,
  type StandingsMode,
} from "@/components/event-standings-dashboard";
import {
  getCashGameStandings,
  getCashGameStandingsForMonth,
  getCompletedCashGames,
  getTournamentStandings,
} from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";
import { currentEasternDate } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Standings",
  description: "Cash-game and tournament standings.",
};

const cashGames = cashGamesJson as CashGame[];
const tournaments = tournamentsJson as Tournament[];

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function monthsBetween(start: string, end: string) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
  }

  return months;
}

function parseMode(value: string | string[] | undefined): StandingsMode {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === "tournaments" ? "tournaments" : "cash-games";
}

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ mode?: string | string[] }> }) {
  const query = await searchParams;
  const completedCashGames = getCompletedCashGames(cashGames);
  const firstMonth = completedCashGames.at(-1)?.date.slice(0, 7);
  const currentMonth = currentEasternDate().slice(0, 7);
  const months = firstMonth ? monthsBetween(firstMonth, currentMonth) : [];
  const periods: CashStandingsPeriod[] = [
    {
      key: "overall",
      label: "Overall",
      standings: getCashGameStandings(cashGames),
    },
    ...months.toReversed().map((month) => ({
      key: month,
      label: monthLabel(month),
      standings: getCashGameStandingsForMonth(cashGames, month),
    })),
  ];

  return (
    <div className="mx-auto w-[min(100%-2rem,96rem)] py-10 sm:py-14">
      <PageIntro title="Standings" />
      <section className="mt-8">
        <StandingsDashboard
          key={parseMode(query.mode)}
          periods={periods}
          tournamentStandings={getTournamentStandings(tournaments)}
          initialMode={parseMode(query.mode)}
        />
      </section>
    </div>
  );
}
