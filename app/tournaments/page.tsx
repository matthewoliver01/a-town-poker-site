import type { Metadata } from "next";
import { CalendarClock, CircleDollarSign, Trophy, Users } from "lucide-react";
import tournamentsJson from "@/data/tournaments.json";
import { PageIntro } from "@/components/page-intro";
import { TournamentCard } from "@/components/event-cards";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Upcoming poker nights, completed tournament results, prize pools, and champions.",
};

const tournaments = tournamentsJson as Tournament[];

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4.5" /></span>
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="numeric mt-1 text-xl font-semibold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

export default function TournamentsPage() {
  const upcoming = tournaments.filter((event) => event.status === "upcoming").toSorted((a, b) => a.date.localeCompare(b.date));
  const completed = tournaments.filter((event) => event.status === "completed").toSorted((a, b) => b.date.localeCompare(a.date));
  const uniquePlayers = new Set(completed.flatMap((event) => event.players.map((player) => player.name))).size;
  const totalPrizePools = completed.reduce((total, event) => total + event.players.reduce((sum, player) => sum + player.totalBuyIn, 0), 0);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro
        eyebrow="Tournament archive"
        title="Every title. Every finish."
        description="Browse upcoming events and the complete record of who ran deep, who bubbled, and who took home the trophy."
      />

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tournament summary">
        <SummaryStat icon={Trophy} label="Completed" value={String(completed.length)} />
        <SummaryStat icon={CalendarClock} label="Upcoming" value={String(upcoming.length)} />
        <SummaryStat icon={Users} label="Players" value={String(uniquePlayers)} />
        <SummaryStat icon={CircleDollarSign} label="Total entries" value={formatMoney(totalPrizePools)} />
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-14">
          <div className="mb-6">
            <p className="eyebrow">Save the date</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Coming up next</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => <TournamentCard key={event.id} tournament={event} />)}
          </div>
        </section>
      ) : null}

      <section className="mt-14">
        <div className="mb-6">
          <p className="eyebrow">The record book</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Completed tournaments</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((event) => <TournamentCard key={event.id} tournament={event} />)}
        </div>
      </section>
    </div>
  );
}
