export interface NamedMetric {
  name: string;
  value: number;
}

export interface TiedMetricLeaders {
  names: string[];
  value: number;
}

/**
 * Finds every player tied on a superlative's primary metric. Values are
 * normalized to avoid tiny floating-point differences splitting a true tie.
 */
export function getTiedMetricLeaders(
  candidates: readonly NamedMetric[],
  direction: "highest" | "lowest" = "highest",
  precision = 9,
): TiedMetricLeaders | undefined {
  const factor = 10 ** precision;
  const normalize = (value: number) => Math.round(value * factor) / factor;
  const eligible = candidates
    .filter(({ name, value }) => name.trim().length > 0 && Number.isFinite(value))
    .map(({ name, value }) => ({ name, value: normalize(value) }));

  if (eligible.length === 0) return undefined;

  const winningValue = eligible.reduce(
    (best, candidate) =>
      direction === "highest"
        ? Math.max(best, candidate.value)
        : Math.min(best, candidate.value),
    eligible[0].value,
  );

  return {
    names: [
      ...new Set(
        eligible
          .filter(({ value }) => value === winningValue)
          .map(({ name }) => name),
      ),
    ].sort((a, b) => a.localeCompare(b)),
    value: winningValue,
  };
}
