import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import tournamentsJson from "@/data/tournaments.json";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import { compareTournamentPlacements, formatTournamentPlacement } from "@/lib/poker-placement";
import type { Tournament } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

const tournaments = tournamentsJson as Tournament[];

export function generateStaticParams() {
  return tournaments.map((tournament) => ({ slug: tournament.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = tournaments.find((event) => event.slug === slug);
  return tournament ? { title: tournament.title, description: `${formatDate(tournament.date)} tournament hosted by ${tournament.host}.` } : {};
}

function SummaryStat({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 truncate text-base font-semibold">{value}</p>
      {subvalue ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subvalue}</p> : null}
    </div>
  );
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = tournaments.find((event) => event.slug === slug);
  if (!tournament) notFound();

  const prizePool = tournament.players.reduce((total, player) => total + player.totalBuyIn, 0);
  const sortedCompletedPlayers = tournament.status === "completed"
    ? tournament.players.toSorted((a, b) => compareTournamentPlacements(a.placement, b.placement))
    : [];
  const topFinisher = sortedCompletedPlayers[0];
  const topFinishers = topFinisher
    ? sortedCompletedPlayers.filter((player) => compareTournamentPlacements(player.placement, topFinisher.placement) === 0)
    : [];
  const totalPaidOut = tournament.status === "completed"
    ? tournament.players.reduce((sum, player) => sum + player.placementPayout + player.bonusPayout, 0)
    : 0;

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href="/tournaments" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> All tournaments</Link>

      <header className="border-b pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-3">
              {tournament.status === "completed" ? "Completed" : "Upcoming"}
            </Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{tournament.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {formatDate(tournament.date)} · {tournament.venue}{tournament.startTime ? ` · ${tournament.startTime}` : ""}
            </p>
          </div>
          {tournament.status === "completed" && topFinishers.length > 0 ? (
            <div className="lg:text-right">
              <p className="text-xs text-muted-foreground">{topFinishers.length > 1 ? "Tied 1st" : "1st place"}</p>
              <p className="mt-1 font-semibold">{topFinishers.map((player) => player.name).join(", ")}</p>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Tournament details">
        <SummaryStat label="Host" value={tournament.host} />
        <SummaryStat label="Initial buy-in" value={formatMoney(tournament.initialBuyIn)} />
        <SummaryStat label="Players" value={String(tournament.players.length)} />
        <SummaryStat label="Total buy-ins" value={formatMoney(prizePool)} />
        {tournament.status === "completed" ? <SummaryStat label="Total paid out" value={formatMoney(totalPaidOut)} /> : null}
      </section>

      {tournament.status === "completed" ? (
        <Card className="mt-8 overflow-hidden">
            <CardHeader className="border-b"><CardTitle className="text-lg">Results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 text-center">Place</TableHead><TableHead>Player</TableHead><TableHead>Eliminated</TableHead><TableHead className="text-right">Bought in</TableHead><TableHead className="text-right">Placement payout</TableHead><TableHead className="text-right">Bonuses</TableHead><TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCompletedPlayers.map((player) => {
                    const payout = player.placementPayout + player.bonusPayout;
                    const net = payout - player.totalBuyIn;
                    return (
                      <TableRow key={player.name}>
                        <TableCell className="numeric text-center font-semibold">{formatTournamentPlacement(player.placement)}</TableCell>
                        <TableCell><div className="flex min-w-40 items-center gap-3"><PlayerAvatar name={player.name} className="size-9" /><span className="font-semibold">{player.name}</span></div></TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{player.eliminationRound}</TableCell>
                        <TableCell className="numeric text-right">{formatMoney(player.totalBuyIn)}</TableCell>
                        <TableCell className="numeric text-right">{formatMoney(player.placementPayout)}</TableCell>
                        <TableCell className="numeric text-right">{formatMoney(player.bonusPayout)}</TableCell>
                        <TableCell className={cn("numeric text-right font-semibold", net > 0 ? "text-positive" : net < 0 ? "text-negative" : "")}>{formatSignedMoney(net)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <CardHeader className="border-b"><CardTitle className="text-lg">Registered players</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.players.map((player) => <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3"><PlayerAvatar name={player.name} /><div><p className="font-semibold">{player.name}</p><p className="numeric mt-1 text-xs text-muted-foreground">Buy-in: {formatMoney(player.totalBuyIn)}</p></div></div>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
