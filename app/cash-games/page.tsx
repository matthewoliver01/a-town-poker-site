import type { Metadata } from "next";
import gamesJson from "@/data/cash-games.json";
import { CashGameCard } from "@/components/event-cards";
import { PageIntro } from "@/components/page-intro";
import { getCompletedCashGames, getUpcomingCashGames } from "@/lib/poker-data";
import type { CashGame } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Cash Games",
  description: "Cash-game schedule and results.",
};

const games = gamesJson as CashGame[];

export default function CashGamesPage() {
  const events = [
    ...getUpcomingCashGames(games),
    ...getCompletedCashGames(games),
  ];

  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="[&>div]:border-b-0 [&>div]:pb-6">
        <PageIntro title="Cash games" />
      </div>
      <section aria-label="Cash-game events">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((game) => <CashGameCard key={game.id} game={game} />)}
        </div>
      </section>
    </div>
  );
}
