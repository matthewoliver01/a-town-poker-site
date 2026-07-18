export const PLAYER_VIEW_MODES = [
  { value: "overall", label: "Overall" },
  { value: "tournaments", label: "Tournaments" },
  { value: "cash-games", label: "Cash games" },
] as const;

export type PlayerViewMode = (typeof PLAYER_VIEW_MODES)[number]["value"];

export function isPlayerViewMode(value: unknown): value is PlayerViewMode {
  return PLAYER_VIEW_MODES.some((mode) => mode.value === value);
}

export function parsePlayerViewMode(value: unknown): PlayerViewMode {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isPlayerViewMode(candidate) ? candidate : "overall";
}

export function playerViewHref(pathname: string, mode: PlayerViewMode): string {
  return mode === "overall" ? pathname : `${pathname}?mode=${mode}`;
}
