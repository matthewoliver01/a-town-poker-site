import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleDollarSign, Crown, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <Link href={`/tournaments/${tournament.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-[#36785e] to-[#9fc4ad] opacity-90" />
        <CardHeader className="gap-4 pb-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={completed ? "secondary" : "success"}>
              <span className={completed ? "size-1.5 rounded-full bg-muted-foreground" : "size-1.5 rounded-full bg-primary"} />
              {completed ? "Completed" : "Upcoming"}
            </Badge>
            <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.025em]">{tournament.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Hosted by <span className="font-medium text-foreground">{tournament.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(tournament.date)}</Meta>
            <Meta icon={MapPin}>{tournament.venue}</Meta>
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/75 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Players</div>
            <p className="numeric mt-1.5 text-lg font-semibold">{tournament.players.length}</p>
          </div>
          <div className="rounded-xl bg-muted/75 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDollarSign className="size-3.5" /> {completed ? "Prize pool" : "Buy-in"}</div>
            <p className="numeric mt-1.5 text-lg font-semibold">{formatMoney(completed ? prizePool : tournament.initialBuyIn)}</p>
          </div>
        </CardContent>
        <CardFooter className="border-t py-4 text-sm">
          {champions.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-[#f4ead2] text-[#86621c]"><Crown className="size-3.5" /></span>
              <span className="min-w-0"><span className="text-muted-foreground">{champions.length > 1 ? "Co-champions" : "Champion"}</span> <span className="ml-1 font-semibold">{champions.map((player) => player.name).join(", ")}</span></span>
            </div>
          ) : (
            <span className="font-medium text-primary">Registration open · {"startTime" in tournament ? tournament.startTime : "TBD"}</span>
          )}
        </CardFooter>
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
    <Link href={`/cash-games/${game.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
        <div className="h-1 w-full bg-gradient-to-r from-[#295a46] via-[#768c80] to-[#d8b25e] opacity-90" />
        <CardHeader className="gap-4 pb-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={completed ? "secondary" : "success"}>
              <span className={completed ? "size-1.5 rounded-full bg-muted-foreground" : "size-1.5 rounded-full bg-primary"} />
              {completed ? "Completed" : "Upcoming"}
            </Badge>
            <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.025em]">{game.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Hosted by <span className="font-medium text-foreground">{game.host}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Meta icon={CalendarDays}>{formatDate(game.date)}</Meta>
            <Meta icon={MapPin}>{game.venue}</Meta>
          </div>
        </CardHeader>
        <CardContent className="mt-auto grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/75 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Players</div>
            <p className="numeric mt-1.5 text-lg font-semibold">{game.players.length}</p>
          </div>
          <div className="rounded-xl bg-muted/75 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDollarSign className="size-3.5" /> {completed ? "On table" : "Buy-in"}</div>
            <p className="numeric mt-1.5 text-lg font-semibold">{formatMoney(completed ? tableTotal : game.initialBuyIn)}</p>
          </div>
        </CardContent>
        <CardFooter className="border-t py-4 text-sm">
          {biggestWinner ? (
            <div className="flex w-full items-center justify-between gap-3">
              <span><span className="text-muted-foreground">Biggest winner</span> <span className="ml-1 font-semibold">{biggestWinner.name}</span></span>
              <span className="numeric font-semibold text-positive">{formatSignedMoney(biggestWinner.profit)}</span>
            </div>
          ) : (
            <span className="font-medium text-primary">Seats open · {"startTime" in game ? game.startTime : "TBD"}</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
