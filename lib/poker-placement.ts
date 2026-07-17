import type { TournamentPlacement } from "./poker-types";

const TIED_PLACEMENT_PATTERN = /^T-([1-9]\d*)$/;

const isPositiveInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;

export const isTiedPlacement = (
  value: TournamentPlacement,
): value is `T-${number}` =>
  typeof value === "string" && TIED_PLACEMENT_PATTERN.test(value);

const assertValidPlacement = (value: TournamentPlacement): void => {
  if (
    (typeof value === "number" && isPositiveInteger(value)) ||
    isTiedPlacement(value)
  ) {
    return;
  }

  throw new RangeError(
    `Invalid tournament placement: ${String(value)}. Expected a positive integer or T-{positive integer}.`,
  );
};

/** Returns the underlying finishing rank, treating `T-2` as second place. */
export const placementRank = (value: TournamentPlacement): number => {
  assertValidPlacement(value);
  return typeof value === "number"
    ? value
    : Number.parseInt(value.slice(2), 10);
};

/**
 * Returns a chart/sort-friendly value. A tied placement follows the equivalent
 * outright placement: `2` sorts at `2`, while `T-2` sorts at `2.5`.
 */
export const placementSortValue = (value: TournamentPlacement): number =>
  placementRank(value) + (isTiedPlacement(value) ? 0.5 : 0);

/** Comparator ordering best tournament finishes first. */
export const compareTournamentPlacements = (
  a: TournamentPlacement,
  b: TournamentPlacement,
): number => placementSortValue(a) - placementSortValue(b);

export const formatTournamentPlacement = (
  value: TournamentPlacement,
): string => {
  const rank = placementRank(value);
  if (isTiedPlacement(value)) return value;

  const modulo100 = rank % 100;
  const modulo10 = rank % 10;
  const suffix =
    modulo100 >= 11 && modulo100 <= 13
      ? "th"
      : modulo10 === 1
        ? "st"
        : modulo10 === 2
          ? "nd"
          : modulo10 === 3
            ? "rd"
            : "th";

  return `${rank}${suffix}`;
};
