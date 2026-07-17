import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, Coins, House, MapPin, Scale, TrendingUp, Users } from "lucide-react";
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

function SummaryCard({ icon: Icon, label, value, subvalue }: { icon: typeof Scale; label: string; value: string; subvalue?: string }) {
  return (
    <Card><CardContent className="flex gap-3 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="numeric mt-1 truncate text-lg font-semibold">{value}</p>{subvalue ? <p className="mt-0.5 text-xs text-muted-foreground">{subvalue}</p> : null}</div></CardContent></Card>
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
        <header className="rounded-3xl border bg-primary px-6 py-9 text-primary-foreground subtle-grid sm:px-10"><Badge className="mb-5 bg-white/12 text-white">Upcoming session</Badge><h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{game.title}</h1><p className="mt-5 text-white/70">{formatDate(game.date)} · {game.startTime} · {game.venue}</p></header>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard icon={House} label="Host" value={game.host} /><SummaryCard icon={CircleDollarSign} label="Initial buy-in" value={formatMoney(game.initialBuyIn)} /><SummaryCard icon={Users} label="Seats claimed" value={String(game.players.length)} /><SummaryCard icon={Coins} label="Committed" value={formatMoney(totalBuyIn)} /></section>
        <Card className="mt-10"><CardHeader><CardTitle>Registered players</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{game.players.map((player) => <div key={player.name} className="flex items-center gap-3 rounded-xl border p-3"><PlayerAvatar name={player.name} /><div><p className="font-semibold">{player.name}</p><p className="numeric mt-1 text-xs text-muted-foreground">{formatMoney(player.amountBuyIn)} committed</p></div></div>)}</CardContent></Card>
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

      <header className="relative overflow-hidden rounded-3xl border bg-primary px-6 py-8 text-primary-foreground shadow-xl shadow-primary/10 subtle-grid sm:px-10 sm:py-10">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div><Badge className="mb-5 bg-white/12 text-white ring-1 ring-inset ring-white/15">Session complete</Badge><h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{game.title}</h1><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> {formatDate(game.date)}</span><span className="inline-flex items-center gap-2"><MapPin className="size-4" /> {game.venue}</span>{game.startTime ? <span className="inline-flex items-center gap-2"><Clock3 className="size-4" /> {game.startTime}</span> : null}</div></div>
          {biggestWinner ? <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><span className="grid size-11 place-items-center rounded-xl bg-[#d4ad56] text-[#2e2512]"><TrendingUp className="size-5" /></span><div><p className="text-xs font-medium text-white/60">Biggest winner</p><p className="mt-1 font-semibold">{biggestWinner.name} <span className="numeric ml-1 text-[#c7e7d4]">{formatSignedMoney(biggestWinner.profit)}</span></p></div></div> : null}
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Cash game details">
        <SummaryCard icon={House} label="Host" value={game.host} />
        <SummaryCard icon={Users} label="Players" value={String(game.players.length)} />
        <SummaryCard icon={Coins} label="Total action" value={formatMoney(totalBuyIn)} subvalue={`${formatMoney(averageBuyIn)} avg. buy-in`} />
        <SummaryCard icon={Scale} label="Ledger check" value={ledgerBalanced ? "Balanced" : "Review needed"} subvalue={`${formatMoney(totalCashedOut)} cashed out`} />
      </section>

      <Card className="mt-10 overflow-hidden">
        <CardHeader className="border-b bg-muted/35"><CardTitle className="text-lg">Session results</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead className="w-16 text-center">Rank</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Bought in</TableHead><TableHead className="text-right">Cashed out</TableHead><TableHead className="text-right">Profit / loss</TableHead><TableHead className="text-right">ROI</TableHead></TableRow></TableHeader>
            <TableBody>
              {results.map((player, index) => {
                const roi = player.amountBuyIn ? (player.profit / player.amountBuyIn) * 100 : 0;
                return (
                  <TableRow key={player.name} className={index === 0 ? "bg-[#f3f8f5] hover:bg-[#edf5f0]" : undefined}>
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
