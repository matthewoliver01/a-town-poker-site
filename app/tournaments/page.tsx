import type { Metadata } from "next";
import tournamentsJson from "@/data/tournaments.json";
import { TournamentCard } from "@/components/event-cards";
import { PageIntro } from "@/components/page-intro";
import { getCompletedTournaments, getUpcomingTournaments } from "@/lib/poker-data";
import type { Tournament } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Tournament schedule and results.",
};

const tournaments = tournamentsJson as Tournament[];

export default function TournamentsPage() {
  const events = [
    ...getUpcomingTournaments(tournaments),
    ...getCompletedTournaments(tournaments),
  ];

  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="[&>div]:border-b-0 [&>div]:pb-6">
        <PageIntro title="Tournaments" />
      </div>
      <section aria-label="Tournament events">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
        </div>
      </section>
    </div>
  );
}
