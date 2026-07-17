import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, Crown, House, MapPin, Trophy, Users } from "lucide-react";
import tournamentsJson from "@/data/tournaments.json";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

function SummaryCard({ icon: Icon, label, value, subvalue }: { icon: typeof Trophy; label: string; value: string; subvalue?: string }) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="numeric mt-1 truncate text-lg font-semibold">{value}</p>{subvalue ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subvalue}</p> : null}</div>
      </CardContent>
    </Card>
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

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href="/tournaments" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> All tournaments</Link>

      <header className="relative overflow-hidden rounded-3xl border bg-primary px-6 py-8 text-primary-foreground shadow-xl shadow-primary/10 sm:px-10 sm:py-10 subtle-grid">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-5 bg-white/12 text-white ring-1 ring-inset ring-white/15 hover:bg-white/12">
              {tournament.status === "completed" ? "Official result" : "Upcoming tournament"}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{tournament.title}</h1>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> {formatDate(tournament.date)}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="size-4" /> {tournament.venue}</span>
              {tournament.startTime ? <span className="inline-flex items-center gap-2"><Clock3 className="size-4" /> {tournament.startTime}</span> : null}
            </div>
          </div>
          {tournament.status === "completed" ? (() => {
            return topFinishers.length > 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-[#d4ad56] text-[#2e2512]"><Crown className="size-5" /></span>
                <div><p className="text-xs font-medium text-white/60">{topFinishers.length > 1 ? "Co-champions" : "Champion"}</p><p className="mt-1 font-semibold">{topFinishers.map((player) => player.name).join(", ")}</p></div>
              </div>
            ) : null;
          })() : null}
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tournament details">
        <SummaryCard icon={House} label="Host" value={tournament.host} />
        <SummaryCard icon={CircleDollarSign} label="Initial buy-in" value={formatMoney(tournament.initialBuyIn)} />
        <SummaryCard icon={Users} label="Field size" value={`${tournament.players.length} players`} />
        <SummaryCard icon={Trophy} label={tournament.status === "completed" ? "Prize pool" : "Committed"} value={formatMoney(prizePool)} />
      </section>

      {tournament.status === "completed" ? (
        <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_20rem]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/35"><CardTitle className="text-lg">Final results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 text-center">Place</TableHead><TableHead>Player</TableHead><TableHead>Exit</TableHead><TableHead className="text-right">Bought in</TableHead><TableHead className="text-right">Placement</TableHead><TableHead className="text-right">Bonuses</TableHead><TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCompletedPlayers.map((player) => {
                    const payout = player.placementPayout + player.bonusPayout;
                    const net = payout - player.totalBuyIn;
                    const isTopFinisher = topFinisher
                      ? compareTournamentPlacements(player.placement, topFinisher.placement) === 0
                      : false;
                    return (
                      <TableRow key={player.name} className={isTopFinisher ? "bg-[#fbf8ef] hover:bg-[#f8f2e2]" : undefined}>
                        <TableCell className="numeric text-center font-semibold">{isTopFinisher ? <span className="inline-flex items-center gap-1 text-[#8b671e]"><Crown className="size-3.5" /> {formatTournamentPlacement(player.placement)}</span> : formatTournamentPlacement(player.placement)}</TableCell>
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

          <Card className="h-fit">
            <CardHeader><CardTitle className="text-lg">Payout breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {tournament.players.filter((player) => player.placementPayout + player.bonusPayout > 0).toSorted((a, b) => (b.placementPayout + b.bonusPayout) - (a.placementPayout + a.bonusPayout)).map((player) => {
                const payout = player.placementPayout + player.bonusPayout;
                const maxPayout = Math.max(...tournament.players.map((entry) => entry.placementPayout + entry.bonusPayout));
                return <div key={player.name}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{player.name}</span><span className="numeric text-muted-foreground">{formatMoney(payout)}</span></div><Progress value={(payout / maxPayout) * 100} /></div>;
              })}
              <div className="border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Total paid out</span><span className="numeric font-semibold">{formatMoney(tournament.players.reduce((sum, player) => sum + player.placementPayout + player.bonusPayout, 0))}</span></div></div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="mt-10 overflow-hidden">
          <CardHeader className="border-b bg-muted/35"><CardTitle className="text-lg">Registered players</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.players.map((player) => <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3"><PlayerAvatar name={player.name} /><div><p className="font-semibold">{player.name}</p><p className="numeric mt-1 text-xs text-muted-foreground">Committed {formatMoney(player.totalBuyIn)}</p></div></div>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
