import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import tournamentsJson from "@/data/tournaments.json";
import siteContentJson from "@/data/site-content.json";
import { EventDetailContent } from "@/components/event-detail-content";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatSignedMoney, formatTime } from "@/lib/format";
import { compareTournamentPlacements, formatTournamentPlacement } from "@/lib/poker-placement";
import type { SiteContent, Tournament } from "@/lib/poker-types";
import { isAnnouncementActive } from "@/lib/site-content";
import { cn } from "@/lib/utils";

const tournaments = tournamentsJson as Tournament[];
const siteContent = siteContentJson as SiteContent;

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
  const announcements = siteContent.announcements.filter(
    (announcement) =>
      announcement.eventId === tournament.id &&
      isAnnouncementActive(announcement),
  );

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
              {formatDate(tournament.date)}{tournament.startTime ? ` · ${formatTime(tournament.startTime)}` : ""}
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

      <EventDetailContent
        eventTitle={tournament.title}
        notes={tournament.notes}
        photos={tournament.photos}
        announcements={announcements}
      />

      {tournament.status === "completed" ? (
        <Card className="mt-8 overflow-hidden">
            <CardHeader className="border-b"><CardTitle className="text-lg">Results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table className="table-fixed min-w-[820px] [&_td]:px-2.5 [&_th]:px-2.5">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[17%]" />
                  <col className="w-[14%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Place</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Bought in</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead title="Elimination level">Level</TableHead>
                    <TableHead title="Elimination time">Out at</TableHead>
                    <TableHead title="Eliminated by">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCompletedPlayers.map((player) => {
                    const payout = player.placementPayout + player.bonusPayout;
                    const net = payout - player.totalBuyIn;
                    return (
                      <TableRow key={player.name}>
                        <TableCell className="numeric font-semibold">{formatTournamentPlacement(player.placement)}</TableCell>
                        <TableCell className="min-w-0"><div className="flex min-w-0 items-center gap-2"><PlayerAvatar name={player.name} className="size-8" /><span className="truncate font-semibold">{player.name}</span></div></TableCell>
                        <TableCell className="numeric font-medium">
                          {formatMoney(payout)}
                          {player.bonusPayout > 0 ? <span className="block whitespace-nowrap text-[11px] font-normal text-muted-foreground">Includes {formatMoney(player.bonusPayout)} bonus</span> : null}
                        </TableCell>
                        <TableCell className="numeric">{formatMoney(player.totalBuyIn)}</TableCell>
                        <TableCell className={cn("numeric font-semibold", net > 0 ? "text-positive" : net < 0 ? "text-negative" : "")}>{formatSignedMoney(net)}</TableCell>
                        <TableCell className="numeric">{player.eliminationLevel ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="numeric whitespace-nowrap">{player.eliminatedAt ? formatTime(player.eliminatedAt) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{player.eliminatedBy ?? <span className="text-muted-foreground">—</span>}</TableCell>
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
            {tournament.players.length > 0 ? tournament.players.map((player) => <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3"><PlayerAvatar name={player.name} /><div><p className="font-semibold">{player.name}</p><p className="numeric mt-1 text-xs text-muted-foreground">Buy-in: {formatMoney(player.totalBuyIn)}</p></div></div>) : <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No players registered yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
