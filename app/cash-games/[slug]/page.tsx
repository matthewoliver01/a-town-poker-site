import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import cashGamesJson from "@/data/cash-games.json";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import type { CashGame } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

const cashGames = cashGamesJson as CashGame[];

export function generateStaticParams() {
  return cashGames.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = cashGames.find((event) => event.slug === slug);
  return game ? { title: game.title, description: `${formatDate(game.date)} cash game hosted by ${game.host}.` } : {};
}

function SummaryStat({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 truncate text-base font-semibold">{value}</p>
      {subvalue ? <p className="mt-0.5 text-xs text-muted-foreground">{subvalue}</p> : null}
    </div>
  );
}

export default async function CashGameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = cashGames.find((event) => event.slug === slug);
  if (!game) notFound();

  const totalBuyIn = game.players.reduce((total, player) => total + player.amountBuyIn, 0);

  if (game.status === "upcoming") {
    return (
      <div className="page-shell py-8 sm:py-12">
        <Link href="/cash-games" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All cash games</Link>
        <header className="border-b pb-6">
          <Badge variant="secondary" className="mb-3">Upcoming</Badge>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{game.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{formatDate(game.date)} · {game.venue} · {game.startTime}</p>
        </header>
        <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-4" aria-label="Cash game details">
          <SummaryStat label="Host" value={game.host} />
          <SummaryStat label="Initial buy-in" value={formatMoney(game.initialBuyIn)} />
          <SummaryStat label="Players" value={String(game.players.length)} />
          <SummaryStat label="Total buy-ins" value={formatMoney(totalBuyIn)} />
        </section>
        <Card className="mt-8">
          <CardHeader className="border-b"><CardTitle>Registered players</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {game.players.map((player) => <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3"><PlayerAvatar name={player.name} /><div><p className="font-semibold">{player.name}</p><p className="numeric mt-1 text-xs text-muted-foreground">Buy-in: {formatMoney(player.amountBuyIn)}</p></div></div>)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const results = game.players.map((player) => ({ ...player, profit: player.amountAtEnd - player.amountBuyIn })).toSorted((a, b) => b.profit - a.profit);
  const biggestWinner = results[0];
  const averageBuyIn = totalBuyIn / game.players.length;
  const totalCashedOut = game.players.reduce((total, player) => total + player.amountAtEnd, 0);
  const ledgerBalanced = Math.round(totalBuyIn * 100) === Math.round(totalCashedOut * 100);

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href="/cash-games" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> All cash games</Link>

      <header className="border-b pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Completed</Badge>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{game.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{formatDate(game.date)} · {game.venue}{game.startTime ? ` · ${game.startTime}` : ""}</p>
          </div>
          {biggestWinner ? (
            <div className="lg:text-right">
              <p className="text-xs text-muted-foreground">Highest net</p>
              <p className="mt-1 font-semibold">{biggestWinner.name} <span className="numeric ml-1 text-positive">{formatSignedMoney(biggestWinner.profit)}</span></p>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-4" aria-label="Cash game details">
        <SummaryStat label="Host" value={game.host} />
        <SummaryStat label="Players" value={String(game.players.length)} />
        <SummaryStat label="Total buy-ins" value={formatMoney(totalBuyIn)} subvalue={`Average: ${formatMoney(averageBuyIn)}`} />
        <SummaryStat label="Ledger" value={ledgerBalanced ? "Balanced" : "Review needed"} subvalue={`Total at end: ${formatMoney(totalCashedOut)}`} />
      </section>

      <Card className="mt-8 overflow-hidden">
        <CardHeader className="border-b"><CardTitle className="text-lg">Results</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead className="w-16 text-center">Rank</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Bought in</TableHead><TableHead className="text-right">Amount at end</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">ROI</TableHead></TableRow></TableHeader>
            <TableBody>
              {results.map((player, index) => {
                const roi = player.amountBuyIn ? (player.profit / player.amountBuyIn) * 100 : 0;
                return (
                  <TableRow key={player.name}>
                    <TableCell className="numeric text-center font-medium">{index + 1}</TableCell>
                    <TableCell><div className="flex min-w-40 items-center gap-3"><PlayerAvatar name={player.name} className="size-9" /><span className="font-semibold">{player.name}</span></div></TableCell>
                    <TableCell className="numeric text-right">{formatMoney(player.amountBuyIn)}</TableCell>
                    <TableCell className="numeric text-right">{formatMoney(player.amountAtEnd)}</TableCell>
                    <TableCell className={cn("numeric text-right font-semibold", player.profit > 0 ? "text-positive" : player.profit < 0 ? "text-negative" : "")}>{formatSignedMoney(player.profit)}</TableCell>
                    <TableCell className={cn("numeric text-right", roi > 0 ? "text-positive" : roi < 0 ? "text-negative" : "")}>{roi > 0 ? "+" : ""}{roi.toFixed(0)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
