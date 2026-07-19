const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const signedWholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: "always",
});

const signedDecimalMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const tournamentWins = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function hasFractionalDollars(value: number) {
  return Math.abs(Math.round(value * 100)) % 100 !== 0;
}

export function formatMoney(value: number) {
  return (hasFractionalDollars(value) ? decimalMoney : wholeMoney).format(value);
}

export function formatSignedMoney(value: number) {
  if (value === 0) return wholeMoney.format(0);
  return (hasFractionalDollars(value) ? signedDecimalMoney : signedWholeMoney).format(value);
}

export function formatCompactMoney(value: number) {
  return compactMoney.format(value);
}

export function formatTournamentWins(value: number) {
  return tournamentWins.format(value);
}

export function formatTournamentWinLabel(value: number) {
  return `${formatTournamentWins(value)} ${value === 1 ? "win" : "wins"}`;
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatShortDate(value: string) {
  return formatDate(value, { month: "short", day: "numeric" });
}

export function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}

export function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
