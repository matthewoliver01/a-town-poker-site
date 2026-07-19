import type { Metadata } from "next";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { TournamentCard } from "@/components/event-cards";
import { formatMoney } from "@/lib/format";
import type { Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Tournament schedule and results.",
};

const tournaments = tournamentsJson as Tournament[];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function TournamentsPage() {
  const upcoming = tournaments.filter((event) => event.status === "upcoming").toSorted((a, b) => a.date.localeCompare(b.date));
  const completed = tournaments.filter((event) => event.status === "completed").toSorted((a, b) => b.date.localeCompare(a.date));
  const uniquePlayers = new Set(tournaments.flatMap((event) => event.players.map((player) => player.name))).size;
  const totalPrizePools = completed.reduce((total, event) => total + event.players.reduce((sum, player) => sum + player.totalBuyIn, 0), 0);

  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="[&>div]:border-b-0 [&>div]:pb-4">
        <PageIntro title="Tournaments" />
      </div>

      <section className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-4" aria-label="Tournament summary">
        <SummaryStat label="Completed" value={String(completed.length)} />
        <SummaryStat label="Upcoming" value={String(upcoming.length)} />
        <SummaryStat label="Players" value={String(uniquePlayers)} />
        <SummaryStat label="Total buy-ins" value={formatMoney(totalPrizePools)} />
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Upcoming</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => <TournamentCard key={event.id} tournament={event} />)}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Completed</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((event) => <TournamentCard key={event.id} tournament={event} />)}
        </div>
      </section>
    </div>
  );
}
