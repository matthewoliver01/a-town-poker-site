import type { Metadata } from "next";
import { Medal, Target, TrendingUp, Trophy } from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { StandingsTables } from "@/components/standings-tables";
import { Card, CardContent } from "@/components/ui/card";
import { formatSignedMoney, formatTournamentWinLabel } from "@/lib/format";
import { getCashGameStandings, getTournamentStandings } from "@/lib/poker-data";
import type { CashGame, Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Standings",
  description: "Tournament and cash-game leaderboards with wins, payouts, profit, averages, and ROI.",
};

const tournaments = tournamentsJson as Tournament[];
const cashGames = cashGamesJson as CashGame[];

function FeatureStat({ icon: Icon, label, value, note }: { icon: typeof Trophy; label: string; value: string; note: string }) {
  return (
    <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span></div></CardContent></Card>
  );
}

export default function StandingsPage() {
  const tournamentStandings = getTournamentStandings(tournaments);
  const cashGameStandings = getCashGameStandings(cashGames);
  const mostWins = tournamentStandings.toSorted((a, b) => b.wins - a.wins || b.netProfit - a.netProfit)[0];
  const bestCashAverage = cashGameStandings.toSorted((a, b) => b.averageProfitLoss - a.averageProfitLoss)[0];

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro eyebrow="Club standings" title="Bragging rights, quantified." description="Switch between tournament and cash-game results to see who is leading—and exactly how they got there." />

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Standings highlights">
        <FeatureStat icon={Trophy} label="Tournament leader" value={tournamentStandings[0]?.name ?? "—"} note={tournamentStandings[0] ? `${formatSignedMoney(tournamentStandings[0].netProfit)} net` : "No results"} />
        <FeatureStat icon={TrendingUp} label="Cash-game leader" value={cashGameStandings[0]?.name ?? "—"} note={cashGameStandings[0] ? `${formatSignedMoney(cashGameStandings[0].netProfit)} net` : "No results"} />
        <FeatureStat icon={Medal} label="Most tournament wins" value={mostWins?.name ?? "—"} note={mostWins ? formatTournamentWinLabel(mostWins.wins) : "No results"} />
        <FeatureStat icon={Target} label="Best cash average" value={bestCashAverage?.name ?? "—"} note={bestCashAverage ? `${formatSignedMoney(bestCashAverage.averageProfitLoss)} per session` : "No results"} />
      </section>

      <section className="mt-10">
        <StandingsTables tournamentStandings={tournamentStandings} cashGameStandings={cashGameStandings} />
      </section>
    </div>
  );
}
