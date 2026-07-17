import type { Metadata } from "next";
import { CircleDollarSign, Scale, TrendingUp, Users } from "lucide-react";
import gamesJson from "@/data/cash-games.json";
import { CashGameCard } from "@/components/event-cards";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { CashGame } from "@/lib/poker-types";

export const metadata: Metadata = {
  title: "Cash Games",
  description: "Cash-game sessions, buy-ins, cash-outs, and player profit and loss.",
};

const games = gamesJson as CashGame[];

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Scale; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4.5" /></span>
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="numeric mt-1 text-xl font-semibold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

export default function CashGamesPage() {
  const completed = games.filter((game) => game.status === "completed").toSorted((a, b) => b.date.localeCompare(a.date));
  const upcoming = games.filter((game) => game.status === "upcoming").toSorted((a, b) => a.date.localeCompare(b.date));
  const uniquePlayers = new Set(completed.flatMap((game) => game.players.map((player) => player.name))).size;
  const totalAction = completed.reduce((total, game) => total + game.players.reduce((sum, player) => sum + player.amountBuyIn, 0), 0);
  const biggestWin = completed.reduce((best, game) => {
    const gameBest = Math.max(...game.players.map((player) => player.amountAtEnd - player.amountBuyIn));
    return Math.max(best, gameBest);
  }, 0);

  return (
    <div className="page-shell py-10 sm:py-14">
      <PageIntro
        eyebrow="Cash-game ledger"
        title="Buy in. Cash out. Settle up."
        description="Every completed session in one clean ledger, with buy-ins, cash-outs, and the stories the numbers tell."
      />

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Cash game summary">
        <SummaryStat icon={Scale} label="Sessions" value={String(completed.length)} />
        <SummaryStat icon={Users} label="Players" value={String(uniquePlayers)} />
        <SummaryStat icon={CircleDollarSign} label="Total action" value={formatMoney(totalAction)} />
        <SummaryStat icon={TrendingUp} label="Biggest win" value={formatMoney(biggestWin)} />
      </section>

      {upcoming.length > 0 ? (
        <section className="mt-14">
          <div className="mb-6"><p className="eyebrow">Next session</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Coming up</h2></div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((game) => <CashGameCard key={game.id} game={game} />)}</div>
        </section>
      ) : null}

      <section className="mt-14">
        <div className="mb-6"><p className="eyebrow">Session history</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">All cash games</h2></div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((game) => <CashGameCard key={game.id} game={game} />)}
        </div>
      </section>
    </div>
  );
}
