import Link from "next/link";
import { CalendarDays, CircleDollarSign, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import { compareTournamentPlacements } from "@/lib/poker-placement";
import type { CashGame, Tournament } from "@/lib/poker-types";

function Meta({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const completed = tournament.status === "completed";
  const rankedPlayers = completed
    ? tournament.players.toSorted((a, b) => compareTournamentPlacements(a.placement, b.placement))
    : [];
  const bestPlacement = rankedPlayers[0]?.placement;
  const champions = bestPlacement === undefined
    ? []
    : rankedPlayers.filter((player) => compareTournamentPlacements(player.placement, bestPlacement) === 0);
  const prizePool = tournament.players.reduce((total, player) => total + player.totalBuyIn, 0);

  return (
    <Link href={`/tournaments/${tournament.slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-primary/30">
        <CardHeader className="gap-3 p-5 pb-4">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">{tournament.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Host: <span className="font-medium text-foreground">{tournament.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(tournament.date)}</Meta>
            <Meta icon={MapPin}>{tournament.venue}</Meta>
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid grid-cols-2 gap-2 px-5 pb-5">
          <div className="rounded-lg bg-muted/75 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Players</div>
            <p className="numeric mt-1 text-base font-semibold">{tournament.players.length}</p>
          </div>
          <div className="rounded-lg bg-muted/75 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDollarSign className="size-3.5" /> {completed ? "Total buy-ins" : "Buy-in"}</div>
            <p className="numeric mt-1 text-base font-semibold">{formatMoney(completed ? prizePool : tournament.initialBuyIn)}</p>
          </div>
        </CardContent>
        {champions.length > 0 ? (
          <CardFooter className="border-t px-5 py-3 text-sm">
            <span className="min-w-0"><span className="text-muted-foreground">{champions.length > 1 ? "Tied 1st" : "1st place"}</span> <span className="ml-1 font-semibold">{champions.map((player) => player.name).join(", ")}</span></span>
          </CardFooter>
        ) : tournament.status === "upcoming" && tournament.startTime ? (
          <CardFooter className="border-t px-5 py-3 text-sm text-muted-foreground">Starts {tournament.startTime}</CardFooter>
        ) : null}
      </Card>
    </Link>
  );
}

export function CashGameCard({ game }: { game: CashGame }) {
  const completed = game.status === "completed";
  const results = completed
    ? game.players.map((player) => ({ ...player, profit: player.amountAtEnd - player.amountBuyIn }))
    : [];
  const biggestWinner = results.toSorted((a, b) => b.profit - a.profit)[0];
  const tableTotal = game.players.reduce((total, player) => total + player.amountBuyIn, 0);

  return (
    <Link href={`/cash-games/${game.slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-primary/30">
        <CardHeader className="gap-3 p-5 pb-4">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.02em]">{game.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Host: <span className="font-medium text-foreground">{game.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(game.date)}</Meta>
            <Meta icon={MapPin}>{game.venue}</Meta>
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid grid-cols-2 gap-2 px-5 pb-5">
          <div className="rounded-lg bg-muted/75 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Players</div>
            <p className="numeric mt-1 text-base font-semibold">{game.players.length}</p>
          </div>
          <div className="rounded-lg bg-muted/75 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDollarSign className="size-3.5" /> {completed ? "Total buy-ins" : "Buy-in"}</div>
            <p className="numeric mt-1 text-base font-semibold">{formatMoney(completed ? tableTotal : game.initialBuyIn)}</p>
          </div>
        </CardContent>
        {biggestWinner ? (
          <CardFooter className="border-t px-5 py-3 text-sm">
            <div className="flex w-full items-center justify-between gap-3">
              <span><span className="text-muted-foreground">Highest net</span> <span className="ml-1 font-semibold">{biggestWinner.name}</span></span>
              <span className="numeric font-semibold text-positive">{formatSignedMoney(biggestWinner.profit)}</span>
            </div>
          </CardFooter>
        ) : game.status === "upcoming" && game.startTime ? (
          <CardFooter className="border-t px-5 py-3 text-sm text-muted-foreground">Starts {game.startTime}</CardFooter>
        ) : null}
      </Card>
    </Link>
  );
}
