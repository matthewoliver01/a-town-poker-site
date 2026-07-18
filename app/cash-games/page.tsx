import type { Metadata } from "next";
import gamesJson from "@/data/cash-games.json";
import { CashGameCard } from "@/components/event-cards";
import { PageIntro } from "@/components/page-intro";
import { formatMoney } from "@/lib/format";
import type { CashGame } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Cash Games",
  description: "Cash-game results.",
};

const games = gamesJson as CashGame[];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function CashGamesPage() {
  const completed = games.filter((game) => game.status === "completed").toSorted((a, b) => b.date.localeCompare(a.date));
  const upcoming = games.filter((game) => game.status === "upcoming").toSorted((a, b) => a.date.localeCompare(b.date));
  const uniquePlayers = new Set(games.flatMap((game) => game.players.map((player) => player.name))).size;
  const totalAction = completed.reduce((total, game) => total + game.players.reduce((sum, player) => sum + player.amountBuyIn, 0), 0);
  const biggestWin = completed.reduce((best, game) => {
    const gameBest = Math.max(...game.players.map((player) => player.amountAtEnd - player.amountBuyIn));
    return Math.max(best, gameBest);
  }, 0);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro title="Cash games" />

      <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-4" aria-label="Cash game summary">
        <SummaryStat label="Sessions" value={String(completed.length)} />
        <SummaryStat label="Players" value={String(uniquePlayers)} />
        <SummaryStat label="Total buy-ins" value={formatMoney(totalAction)} />
        <SummaryStat label="Biggest win" value={formatMoney(biggestWin)} />
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">Upcoming</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((game) => <CashGameCard key={game.id} game={game} />)}</div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Completed</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((game) => <CashGameCard key={game.id} game={game} />)}
        </div>
      </section>
    </div>
  );
}
