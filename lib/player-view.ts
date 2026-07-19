import type { PlayerHistoryItem } from "@/lib/poker-types";

export const PLAYER_VIEW_MODES = [
  { value: "overall", label: "Overall" },
  { value: "tournaments", label: "Tournaments" },
  { value: "cash-games", label: "Cash games" },
] as const;

export type PlayerViewMode = (typeof PLAYER_VIEW_MODES)[number]["value"];

export function isPlayerViewMode(value: unknown): value is PlayerViewMode {
  return PLAYER_VIEW_MODES.some((mode) => mode.value === value);
}

export function parsePlayerViewMode(
  value: unknown,
  fallback: PlayerViewMode = "overall",
): PlayerViewMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isPlayerViewMode(candidate) ? candidate : fallback;
}

export function playerViewHref(
  pathname: string,
  mode: PlayerViewMode,
  defaultMode: PlayerViewMode = "overall",
): string {
  return mode === defaultMode ? pathname : `${pathname}?mode=${mode}`;
}

export type ProfitTimelinePoint = {
  /** Event date in YYYY-MM-DD format. */
  date: string;
  /** Net result from all recorded events on this date. */
  eventProfit: number;
  /** Running net result through this date. */
  cumulativeProfit: number;
  eventCount: number;
};

const roundToCents = (value: number) => Math.round(value * 100) / 100;

/** Builds a chronological, date-based running-profit series for player charts. */
export function buildProfitTimeline(
  history: readonly Pick<PlayerHistoryItem, "date" | "netProfit">[],
): ProfitTimelinePoint[] {
  const profitByDate = new Map<
    string,
    { eventProfit: number; eventCount: number }
  >();

  for (const event of history) {
    const current = profitByDate.get(event.date) ?? {
      eventProfit: 0,
      eventCount: 0,
    };
    profitByDate.set(event.date, {
      eventProfit: roundToCents(current.eventProfit + event.netProfit),
      eventCount: current.eventCount + 1,
    });
  }

  let cumulativeProfit = 0;
  return [...profitByDate.entries()]
    .toSorted(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, point]) => {
      cumulativeProfit = roundToCents(
        cumulativeProfit + point.eventProfit,
      );
      return { date, ...point, cumulativeProfit };
    });
}
