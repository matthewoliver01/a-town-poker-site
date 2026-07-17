"use client";

import { useId, useMemo } from "react";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import {
  formatTournamentPlacement,
  placementRank,
  placementSortValue,
} from "@/lib/poker-placement";
import type { TournamentPlacement } from "@/lib/poker-types";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

const POSITIVE = "#166534";
const POSITIVE_LIGHT = "#22c55e";
const NEGATIVE = "#dc2626";
const GRID = "var(--border, #e5e7eb)";
const MUTED = "var(--muted-foreground, #64748b)";

export type MonthlyProfitPoint = {
  /** Short display label, such as "Jan" or "Jul '26". */
  month: string;
  /** Net result for the month. Positive values are wins; negative values are losses. */
  profit: number;
  /** Optional count shown in the tooltip. */
  games?: number;
};

export type MonthlyProfitChartProps = {
  data: readonly MonthlyProfitPoint[];
  className?: string;
  height?: number;
  currency?: string;
  locale?: string;
  ariaLabel?: string;
  emptyLabel?: string;
};

export type TournamentFinishPoint = {
  /** Tournament name or a compact date label for the horizontal axis. */
  tournament: string;
  /** One-based finishing position. */
  placement: TournamentPlacement;
  /** Number of entrants. Supplying it makes performances comparable across field sizes. */
  fieldSize?: number;
  payout?: number;
  date?: string;
};

export type TournamentFinishesChartProps = {
  data: readonly TournamentFinishPoint[];
  className?: string;
  height?: number;
  currency?: string;
  locale?: string;
  ariaLabel?: string;
  emptyLabel?: string;
};

type ProfitTooltipProps = TooltipContentProps<number, string> & {
  currency: string;
  locale: string;
};

type TournamentChartPoint = Omit<TournamentFinishPoint, "fieldSize"> & {
  fieldSize: number;
  rank: number;
  sortValue: number;
  performance: number;
};

type TournamentTooltipProps = TooltipContentProps<number, string> & {
  currency: string;
  locale: string;
};

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function chartClassName(className?: string) {
  return ["w-full min-w-0", className].filter(Boolean).join(" ");
}

function axisDomain(values: readonly number[]): [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);

  if (min === 0 && max === 0) return [-1, 1];

  const range = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const padding = range * 0.12;

  return [Math.floor(min - padding), Math.ceil(max + padding)];
}

function ChartEmptyState({
  label,
  height,
}: {
  label: string;
  height: number;
}) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center dark:border-slate-800 dark:bg-slate-900/30"
      style={{ height: Math.max(height, 180) }}
      role="status"
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <ChartNoAxesColumnIncreasing aria-hidden="true" className="size-4" />
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function ProfitTooltip({
  active,
  payload,
  currency,
  locale,
}: ProfitTooltipProps) {
  if (!active || !payload.length) return null;

  const point = payload[0]?.payload as MonthlyProfitPoint | undefined;

  if (!point) return null;

  const positive = point.profit >= 0;

  return (
    <div className="min-w-32 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <p className="mb-1 font-medium text-slate-900 dark:text-slate-100">
        {point.month}
      </p>
      <div className="flex items-center justify-between gap-5">
        <span className="text-slate-500 dark:text-slate-400">Net result</span>
        <span
          className={
            positive
              ? "font-semibold tabular-nums text-green-700 dark:text-green-400"
              : "font-semibold tabular-nums text-red-600 dark:text-red-400"
          }
        >
          {positive ? "+" : ""}
          {formatMoney(point.profit, currency, locale)}
        </span>
      </div>
      {typeof point.games === "number" ? (
        <div className="mt-1 flex items-center justify-between gap-5">
          <span className="text-slate-500 dark:text-slate-400">Games played</span>
          <span className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
            {point.games}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TournamentTooltip({
  active,
  payload,
  currency,
  locale,
}: TournamentTooltipProps) {
  if (!active || !payload.length) return null;

  const point = payload[0]?.payload as TournamentChartPoint | undefined;

  if (!point) return null;

  return (
    <div className="min-w-36 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {point.tournament}
      </p>
      {point.date ? (
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {point.date}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-5">
        <span className="text-slate-500 dark:text-slate-400">Finish</span>
        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          {formatTournamentPlacement(point.placement)}
          {point.fieldSize ? ` of ${point.fieldSize}` : ""}
        </span>
      </div>
      {typeof point.payout === "number" ? (
        <div className="mt-1 flex items-center justify-between gap-5">
          <span className="text-slate-500 dark:text-slate-400">Payout</span>
          <span className="font-semibold tabular-nums text-green-700 dark:text-green-400">
            {formatMoney(point.payout, currency, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Monthly net poker results. The line and area switch from green to red at zero,
 * so profitable and losing months remain legible without a separate legend.
 */
export function MonthlyProfitChart({
  data,
  className,
  height = 280,
  currency = "USD",
  locale = "en-US",
  ariaLabel = "Monthly poker profit and loss",
  emptyLabel = "Monthly results will appear after games are recorded.",
}: MonthlyProfitChartProps) {
  const rawId = useId();
  const gradientId = `profit-gradient-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fillId = `${gradientId}-fill`;
  const safeData = useMemo(
    () =>
      data.filter(
        (point) =>
          point.month.trim().length > 0 && Number.isFinite(point.profit),
      ),
    [data],
  );

  if (!safeData.length) {
    return (
      <div className={chartClassName(className)}>
        <ChartEmptyState label={emptyLabel} height={height} />
      </div>
    );
  }

  const values = safeData.map((point) => point.profit);
  const domain = axisDomain(values);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const zeroOffset = max === min ? 0.5 : max / (max - min);
  const accessibleSummary = safeData
    .map(
      (point) =>
        `${point.month}: ${point.profit >= 0 ? "profit" : "loss"} ${formatMoney(
          Math.abs(point.profit),
          currency,
          locale,
        )}`,
    )
    .join("; ");

  return (
    <div
      className={chartClassName(className)}
      style={{ height: Math.max(height, 180) }}
      role="img"
      aria-label={`${ariaLabel}. ${accessibleSummary}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={safeData}
          margin={{ top: 12, right: 8, bottom: 2, left: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={POSITIVE} />
              <stop offset={zeroOffset} stopColor={POSITIVE} />
              <stop offset={zeroOffset} stopColor={NEGATIVE} />
              <stop offset="1" stopColor={NEGATIVE} />
            </linearGradient>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={POSITIVE_LIGHT} stopOpacity={0.24} />
              <stop
                offset={zeroOffset}
                stopColor={POSITIVE_LIGHT}
                stopOpacity={0.06}
              />
              <stop
                offset={zeroOffset}
                stopColor={NEGATIVE}
                stopOpacity={0.06}
              />
              <stop offset="1" stopColor={NEGATIVE} stopOpacity={0.18} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={GRID}
            strokeDasharray="3 3"
            opacity={0.75}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 11 }}
            minTickGap={24}
            interval="preserveStartEnd"
            tickMargin={10}
          />
          <YAxis
            width={54}
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickFormatter={(value: number) =>
              formatCompactMoney(value, currency, locale)
            }
            domain={domain}
            tickMargin={8}
          />
          <ReferenceLine
            y={0}
            stroke={MUTED}
            strokeDasharray="4 4"
            strokeOpacity={0.55}
          />
          <Tooltip
            cursor={{ stroke: GRID, strokeWidth: 1 }}
            content={(tooltipProps) => (
              <ProfitTooltip
                {...(tooltipProps as TooltipContentProps<number, string>)}
                currency={currency}
                locale={locale}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Net result"
            stroke={`url(#${gradientId})`}
            strokeWidth={2.25}
            fill={`url(#${fillId})`}
            activeDot={{ r: 4, strokeWidth: 2, fill: "white" }}
            dot={safeData.length === 1 ? { r: 3, fill: POSITIVE } : false}
            isAnimationActive="auto"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Tournament results normalized to a 0–100 performance score. First place is
 * always a full-height bar, while finishes in differently sized fields stay comparable.
 */
export function TournamentFinishesChart({
  data,
  className,
  height = 280,
  currency = "USD",
  locale = "en-US",
  ariaLabel = "Tournament finish performance",
  emptyLabel = "Tournament finishes will appear after results are recorded.",
}: TournamentFinishesChartProps) {
  const safeData = useMemo(() => {
    const valid = data.flatMap((point) => {
      if (point.tournament.trim().length === 0) return [];

      try {
        const rank = placementRank(point.placement);
        const sortValue = placementSortValue(point.placement);

        if (!Number.isFinite(rank) || !Number.isFinite(sortValue)) return [];

        return [{ ...point, rank, sortValue }];
      } catch {
        return [];
      }
    });
    const inferredFieldSize = Math.max(
      1,
      ...valid.map((point) => Math.ceil(point.sortValue)),
    );

    return valid.map<TournamentChartPoint>((point) => {
      const fieldSize = Math.max(
        Math.ceil(point.sortValue),
        point.fieldSize && Number.isFinite(point.fieldSize)
          ? Math.ceil(point.fieldSize)
          : inferredFieldSize,
      );

      return {
        ...point,
        fieldSize,
        performance: Math.max(
          0,
          Math.min(100, ((fieldSize - point.sortValue + 1) / fieldSize) * 100),
        ),
      };
    });
  }, [data]);

  if (!safeData.length) {
    return (
      <div className={chartClassName(className)}>
        <ChartEmptyState label={emptyLabel} height={height} />
      </div>
    );
  }

  const accessibleSummary = safeData
    .map(
      (point) =>
        `${point.tournament}: ${formatTournamentPlacement(point.placement)} of ${point.fieldSize}`,
    )
    .join("; ");

  return (
    <div
      className={chartClassName(className)}
      style={{ height: Math.max(height, 180) }}
      role="img"
      aria-label={`${ariaLabel}. ${accessibleSummary}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={safeData}
          margin={{ top: 12, right: 8, bottom: 2, left: 0 }}
          accessibilityLayer
          barCategoryGap={safeData.length < 4 ? "42%" : "28%"}
        >
          <CartesianGrid
            vertical={false}
            stroke={GRID}
            strokeDasharray="3 3"
            opacity={0.75}
          />
          <XAxis
            dataKey="tournament"
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 11 }}
            minTickGap={24}
            interval="preserveStartEnd"
            tickMargin={10}
          />
          <YAxis
            width={42}
            axisLine={false}
            tickLine={false}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickFormatter={(value: number) => `${Math.round(value)}%`}
            ticks={[0, 25, 50, 75, 100]}
            domain={[0, 100]}
            tickMargin={8}
          />
          <Tooltip
            cursor={{ fill: "var(--muted, #f1f5f9)", opacity: 0.55 }}
            content={(tooltipProps) => (
              <TournamentTooltip
                {...(tooltipProps as TooltipContentProps<number, string>)}
                currency={currency}
                locale={locale}
              />
            )}
          />
          <Bar
            dataKey="performance"
            name="Field beaten"
            radius={[5, 5, 2, 2]}
            maxBarSize={44}
            isAnimationActive="auto"
          >
            {safeData.map((point, index) => (
              <Cell
                key={`${point.tournament}-${point.date ?? index}`}
                fill={
                  point.sortValue === 1
                    ? POSITIVE
                    : point.rank <= 3
                      ? POSITIVE_LIGHT
                      : "#86a38c"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
