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

const updateDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const compactUpdateDate = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  timeZone: "America/New_York",
});

const updateTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
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

export function formatTime(value: string) {
  const trimmedValue = value.trim();
  const twentyFourHourTime = trimmedValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (twentyFourHourTime) {
    const hour = Number(twentyFourHourTime[1]);
    const minute = Number(twentyFourHourTime[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
    }
  }

  const twelveHourTime = trimmedValue.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);

  if (twelveHourTime) {
    const hour = Number(twelveHourTime[1]);
    const minute = Number(twelveHourTime[2] ?? "0");

    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      return `${hour}:${String(minute).padStart(2, "0")} ${twelveHourTime[3].toUpperCase()}M`;
    }
  }

  return trimmedValue;
}

export function formatUpdatedAt(value: string, compact = false) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return "Unavailable";

  const date = (compact ? compactUpdateDate : updateDate).format(timestamp);
  return `${date} · ${updateTime.format(timestamp)}`;
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
