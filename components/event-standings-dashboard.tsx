"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatSignedMoney, formatTournamentWins } from "@/lib/format";
import { playerViewHref } from "@/lib/player-view";
import { toPlayerSlug } from "@/lib/poker-data";
import type { CashGameStanding, TournamentStanding } from "@/lib/poker-types";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";
type SortValue = number | string | null;

interface Column<Row> {
  key: string;
  label: string;
  value: (row: Row) => SortValue;
  render: (row: Row) => ReactNode;
  align?: "left" | "center" | "right";
}

export interface CashStandingsPeriod {
  key: string;
  label: string;
  all: CashGameStanding[];
  qualified: CashGameStanding[];
}

function PlayerLink({ name, mode }: { name: string; mode: "cash-games" | "tournaments" }) {
  return (
    <Link
      href={playerViewHref(`/players/${toPlayerSlug(name)}`, mode)}
      className="font-semibold underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {name}
    </Link>
  );
}

function SignedMoney({ value }: { value: number }) {
  return (
    <span className={cn("numeric font-semibold", value > 0 && "text-positive", value < 0 && "text-negative")}>
      {formatSignedMoney(value)}
    </span>
  );
}

function compareSortValues(left: SortValue, right: SortValue, direction: SortDirection) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  const result = typeof left === "string" && typeof right === "string"
    ? left.localeCompare(right)
    : Number(left) - Number(right);
  return direction === "asc" ? result : -result;
}

function SortableStandingsTable<Row extends { name: string }>({
  rows,
  columns,
  defaultSortKey = "netProfit",
  emptyMessage,
}: {
  rows: Row[];
  columns: Column<Row>[];
  defaultSortKey?: string;
  emptyMessage: string;
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [direction, setDirection] = useState<SortDirection>("desc");
  const sortedRows = useMemo(() => {
    const column = columns.find((entry) => entry.key === sortKey) ?? columns[0];
    return [...rows].sort((left, right) =>
      compareSortValues(column.value(left), column.value(right), direction) ||
      left.name.localeCompare(right.name),
    );
  }, [columns, direction, rows, sortKey]);

  function changeSort(column: Column<Row>) {
    if (column.key === sortKey) {
      setDirection((current) => current === "desc" ? "asc" : "desc");
      return;
    }
    setSortKey(column.key);
    setDirection(column.key === "name" ? "asc" : "desc");
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/55">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 text-center">#</TableHead>
            {columns.map((column) => {
              const active = column.key === sortKey;
              const Icon = !active ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp;
              return (
                <TableHead key={column.key} className={cn(column.align === "center" && "text-center", column.align === "right" && "text-right")} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    onClick={() => changeSort(column)}
                    className={cn(
                      "inline-flex w-full items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end",
                    )}
                  >
                    {column.label}
                    <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden="true" />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.length > 0 ? sortedRows.map((row, index) => (
            <TableRow key={row.name}>
              <TableCell className="numeric text-center text-muted-foreground">{index + 1}</TableCell>
              {columns.map((column) => (
                <TableCell key={column.key} className={cn(column.align === "center" && "text-center", column.align === "right" && "text-right")}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const cashColumns: Column<CashGameStanding>[] = [
  { key: "name", label: "Player", value: (row) => row.name, render: (row) => <PlayerLink name={row.name} mode="cash-games" /> },
  { key: "netProfit", label: "Net", value: (row) => row.netProfit, render: (row) => <SignedMoney value={row.netProfit} />, align: "right" },
  { key: "gamesPlayed", label: "Sessions", value: (row) => row.gamesPlayed, render: (row) => <span className="numeric">{row.gamesPlayed}</span>, align: "center" },
  { key: "winRate", label: "Win rate", value: (row) => row.winRate, render: (row) => <span className="numeric">{row.winRate.toFixed(0)}%</span>, align: "center" },
  { key: "averageProfitLoss", label: "Avg. P/L", value: (row) => row.averageProfitLoss, render: (row) => <SignedMoney value={row.averageProfitLoss} />, align: "right" },
  { key: "variance", label: "Variance", value: (row) => row.profitLossStandardDeviation, render: (row) => <span className="numeric">{row.profitLossStandardDeviation === null ? "—" : formatMoney(row.profitLossStandardDeviation)}</span>, align: "right" },
  { key: "biggestWin", label: "Biggest win", value: (row) => row.biggestWin, render: (row) => <span className="numeric text-positive">{row.biggestWin === null ? "—" : formatSignedMoney(row.biggestWin)}</span>, align: "right" },
  { key: "biggestLoss", label: "Biggest loss", value: (row) => row.biggestLoss, render: (row) => <span className="numeric text-negative">{row.biggestLoss === null ? "—" : formatSignedMoney(row.biggestLoss)}</span>, align: "right" },
  { key: "roi", label: "ROI", value: (row) => row.returnOnInvestment, render: (row) => <span className={cn("numeric font-medium", row.returnOnInvestment >= 0 ? "text-positive" : "text-negative")}>{row.returnOnInvestment.toFixed(1)}%</span>, align: "right" },
];

const tournamentColumns: Column<TournamentStanding>[] = [
  { key: "name", label: "Player", value: (row) => row.name, render: (row) => <PlayerLink name={row.name} mode="tournaments" /> },
  { key: "netProfit", label: "Net", value: (row) => row.netProfit, render: (row) => <SignedMoney value={row.netProfit} />, align: "right" },
  { key: "amountWon", label: "Payouts", value: (row) => row.amountWon, render: (row) => <span className="numeric">{formatMoney(row.amountWon)}</span>, align: "right" },
  { key: "tournamentsPlayed", label: "Played", value: (row) => row.tournamentsPlayed, render: (row) => <span className="numeric">{row.tournamentsPlayed}</span>, align: "center" },
  { key: "wins", label: "Wins", value: (row) => row.wins, render: (row) => <span className="numeric font-medium">{formatTournamentWins(row.wins)}</span>, align: "center" },
  { key: "cashRate", label: "ITM", value: (row) => row.cashRate, render: (row) => <span className="numeric">{row.cashRate.toFixed(0)}%</span>, align: "center" },
  { key: "averageFinish", label: "Avg. finish", value: (row) => row.averageFinish, render: (row) => <span className="numeric">{row.averageFinish === null ? "—" : row.averageFinish.toFixed(1)}</span>, align: "center" },
  { key: "roi", label: "ROI", value: (row) => row.returnOnInvestment, render: (row) => <span className={cn("numeric font-medium", row.returnOnInvestment >= 0 ? "text-positive" : "text-negative")}>{row.returnOnInvestment.toFixed(1)}%</span>, align: "right" },
];

function CashGameStandings({ periods, completedGameCount, minimumGames }: { periods: CashStandingsPeriod[]; completedGameCount: number; minimumGames: number }) {
  const [periodKey, setPeriodKey] = useState("overall");
  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const period = periods.find((entry) => entry.key === periodKey) ?? periods[0];
  const rows = qualifiedOnly ? period.qualified : period.all;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={periodKey} onValueChange={setPeriodKey} className="min-w-0 gap-0">
          <TabsList className="max-w-full justify-start overflow-x-auto" aria-label="Cash-game standings period">
            {periods.map((entry) => <TabsTrigger key={entry.key} value={entry.key}>{entry.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1" aria-label="Cash-game standings eligibility">
          <SlidersHorizontal className="ml-2 size-3.5 text-muted-foreground" aria-hidden="true" />
          <button type="button" aria-pressed={qualifiedOnly} onClick={() => setQualifiedOnly(true)} className={cn("h-8 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", qualifiedOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Qualified</button>
          <button type="button" aria-pressed={!qualifiedOnly} onClick={() => setQualifiedOnly(false)} className={cn("h-8 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", !qualifiedOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>All players</button>
        </div>
      </div>
      <SortableStandingsTable rows={rows} columns={cashColumns} emptyMessage="No cash-game results for this period." />
      <p className="mt-3 text-xs text-muted-foreground">Qualified players attended at least 25% of completed cash games—currently {minimumGames} of {completedGameCount}. Monthly standings use results from that month; qualification always uses the full schedule. Variance is the standard deviation of session P/L.</p>
    </>
  );
}

function TournamentStandings({ standings }: { standings: TournamentStanding[] }) {
  return (
    <>
      <SortableStandingsTable rows={standings} columns={tournamentColumns} emptyMessage="No completed tournament results." />
      <p className="mt-3 text-xs text-muted-foreground">Split wins are divided evenly among co-winners. ITM = in the money.</p>
    </>
  );
}

export type StandingsMode = "cash-games" | "tournaments";

export function StandingsDashboard({
  periods,
  tournamentStandings,
  completedGameCount,
  minimumGames,
  initialMode = "cash-games",
}: {
  periods: CashStandingsPeriod[];
  tournamentStandings: TournamentStanding[];
  completedGameCount: number;
  minimumGames: number;
  initialMode?: StandingsMode;
}) {
  const router = useRouter();

  function changeMode(value: string) {
    if (value !== "cash-games" && value !== "tournaments") return;
    router.replace(value === "cash-games" ? "/standings" : "/standings?mode=tournaments", { scroll: false });
  }

  return (
    <Tabs defaultValue={initialMode} onValueChange={changeMode} className="gap-0">
      <TabsList className="mb-6 w-full sm:w-fit" aria-label="Standings type">
        <TabsTrigger value="cash-games">Cash games</TabsTrigger>
        <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
      </TabsList>
      <TabsContent value="cash-games">
        <CashGameStandings periods={periods} completedGameCount={completedGameCount} minimumGames={minimumGames} />
      </TabsContent>
      <TabsContent value="tournaments">
        <TournamentStandings standings={tournamentStandings} />
      </TabsContent>
    </Tabs>
  );
}
