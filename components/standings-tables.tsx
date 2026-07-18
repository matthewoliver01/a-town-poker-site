"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatSignedMoney, formatTournamentWins } from "@/lib/format";
import type { CashGameStanding, TournamentStanding } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

function Value({ value, signed = false }: { value: number; signed?: boolean }) {
  return (
    <span className={cn("numeric font-semibold", signed && value > 0 && "text-positive", signed && value < 0 && "text-negative")}>
      {signed ? formatSignedMoney(value) : formatMoney(value)}
    </span>
  );
}

export function StandingsTables({
  tournamentStandings,
  cashGameStandings,
}: {
  tournamentStandings: TournamentStanding[];
  cashGameStandings: CashGameStanding[];
}) {
  return (
    <Tabs defaultValue="tournaments" className="gap-6">
      <TabsList className="w-full sm:w-fit" aria-label="Standings type">
        <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
        <TabsTrigger value="cash-games">Cash games</TabsTrigger>
      </TabsList>

      <TabsContent value="tournaments">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Payouts</TableHead>
                <TableHead className="text-center">Played</TableHead>
                <TableHead className="text-center">Wins</TableHead>
                <TableHead className="text-center">ITM</TableHead>
                <TableHead className="text-center">Avg. finish</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournamentStandings.map((player, index) => (
                <TableRow key={player.name}>
                  <TableCell className="text-center">
                    <span className="numeric text-muted-foreground">{index + 1}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{player.name}</span>
                  </TableCell>
                  <TableCell className="text-right"><Value value={player.netProfit} signed /></TableCell>
                  <TableCell className="numeric text-right">{formatMoney(player.amountWon)}</TableCell>
                  <TableCell className="numeric text-center">{player.tournamentsPlayed}</TableCell>
                  <TableCell className="numeric text-center font-medium">{formatTournamentWins(player.wins)}</TableCell>
                  <TableCell className="numeric text-center">{player.cashRate.toFixed(0)}%</TableCell>
                  <TableCell className="numeric text-center">{player.averageFinish === null ? "—" : player.averageFinish.toFixed(1)}</TableCell>
                  <TableCell className={cn("numeric text-right font-medium", player.returnOnInvestment >= 0 ? "text-positive" : "text-negative")}>{player.returnOnInvestment.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Ranked by net. Split wins are divided evenly among co-winners. ITM = in the money.</p>
      </TabsContent>

      <TabsContent value="cash-games">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
                <TableHead className="text-center">Win rate</TableHead>
                <TableHead className="text-right">Avg. P/L</TableHead>
                <TableHead className="text-right">Biggest win</TableHead>
                <TableHead className="text-right">Biggest loss</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashGameStandings.map((player, index) => (
                <TableRow key={player.name}>
                  <TableCell className="text-center">
                    <span className="numeric text-muted-foreground">{index + 1}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{player.name}</span>
                  </TableCell>
                  <TableCell className="text-right"><Value value={player.netProfit} signed /></TableCell>
                  <TableCell className="numeric text-center">{player.gamesPlayed}</TableCell>
                  <TableCell className="numeric text-center">{player.winRate.toFixed(0)}%</TableCell>
                  <TableCell className="text-right"><Value value={player.averageProfitLoss} signed /></TableCell>
                  <TableCell className="numeric text-right text-positive">{player.biggestWin === null ? "—" : formatSignedMoney(player.biggestWin)}</TableCell>
                  <TableCell className="numeric text-right text-negative">{player.biggestLoss === null ? "—" : formatSignedMoney(player.biggestLoss)}</TableCell>
                  <TableCell className={cn("numeric text-right font-medium", player.returnOnInvestment >= 0 ? "text-positive" : "text-negative")}>{player.returnOnInvestment.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Ranked by net.</p>
      </TabsContent>
    </Tabs>
  );
}
