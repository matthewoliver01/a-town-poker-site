import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readExcelFile from "read-excel-file/node";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultPublicDirectory = path.join(projectRoot, "public");

export const DEFAULT_WORKBOOK_PATH = path.join(
  projectRoot,
  "data/source/a-town-poker-data.xlsx",
);
export const DEFAULT_TOURNAMENTS_PATH = path.join(
  projectRoot,
  "data/tournaments.json",
);
export const DEFAULT_CASH_GAMES_PATH = path.join(
  projectRoot,
  "data/cash-games.json",
);
export const DEFAULT_SITE_CONTENT_PATH = path.join(
  projectRoot,
  "data/site-content.json",
);
export const DEFAULT_SITE_METADATA_PATH = path.join(
  projectRoot,
  "data/site-metadata.json",
);

const HEADER_ROW_INDEX = 3;
const DATA_ROW_INDEX = 4;

const TABLES = {
  tournaments: {
    sheet: "Tournaments",
    headers: [
      "Tournament ID",
      "Slug",
      "Title",
      "Date",
      "Host",
      "Status",
      "Start Time",
      "Initial Buy-In",
    ],
    optionalHeaders: ["Notes"],
  },
  tournamentResults: {
    sheet: "Tournament Results",
    headers: [
      "Tournament ID",
      "Player",
      "Total Buy-In",
      "Placement",
      "Placement Payout",
      "Bonus Payout",
    ],
    optionalHeaders: [
      "Elimination Level",
      "Eliminated At",
      "Eliminated By",
    ],
  },
  blindSchedules: {
    sheet: "Blind Schedules",
    headers: ["Tournament ID", "Level", "Duration", "Small Blind", "Big Blind"],
    optionalSheet: true,
  },
  cashGames: {
    sheet: "Cash Games",
    headers: [
      "Cash Game ID",
      "Slug",
      "Title",
      "Date",
      "Host",
      "Status",
      "Start Time",
      "Initial Buy-In",
    ],
    optionalHeaders: ["Notes"],
  },
  cashGameResults: {
    sheet: "Cash Game Results",
    headers: ["Cash Game ID", "Player", "Amount Buy-In", "Amount At End"],
  },
  eventPhotos: {
    sheet: "Event Photos",
    headers: ["Event ID", "Image Path", "Caption", "Show on Home", "Sort Order"],
    optionalSheet: true,
  },
  announcements: {
    sheet: "Announcements",
    headers: [
      "Announcement ID",
      "Date",
      "Title",
      "Body",
      "Event ID",
      "Expires",
      "Pinned",
    ],
    optionalSheet: true,
  },
};

const TOURNAMENT_ID_PATTERN =
  /^tournament-[0-9]{4}-[0-9]{2}(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const CASH_GAME_ID_PATTERN =
  /^cash-game-[0-9]{4}-[0-9]{2}(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const TIME_PATTERN = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
const TWELVE_HOUR_TIME_PATTERN = /^(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(AM|PM)$/i;
const TIED_PLACEMENT_PATTERN = /^T-([1-9][0-9]*)$/;
const ANNOUNCEMENT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTPS_URL_PATTERN = /^https:\/\/[^\s]+$/i;

export class PokerWorkbookError extends Error {
  constructor(message) {
    super(message);
    this.name = "PokerWorkbookError";
  }
}

const isBlank = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

const decodeXmlEntities = (value) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

const cleanCell = (value) =>
  typeof value === "string" ? decodeXmlEntities(value.trim()) : value;

const rowIsBlank = (row) => row.every(isBlank);

const fail = (row, column, message) => {
  throw new PokerWorkbookError(
    `${row.__sheet} row ${row.__row}, ${column}: ${message}`,
  );
};

const requireString = (row, column, { maxLength, pattern, example } = {}) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) fail(row, column, "a value is required.");
  if (typeof value !== "string") {
    fail(row, column, "enter this value as text.");
  }
  if (maxLength && value.length > maxLength) {
    fail(row, column, `must be ${maxLength} characters or fewer.`);
  }
  if (pattern && !pattern.test(value)) {
    fail(
      row,
      column,
      example ? `use the format ${example}.` : "the value format is invalid.",
    );
  }
  return value;
};

const optionalString = (row, column, { maxLength } = {}) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) return null;
  if (typeof value !== "string") {
    fail(row, column, "enter this value as text.");
  }
  if (maxLength && value.length > maxLength) {
    fail(row, column, `must be ${maxLength} characters or fewer.`);
  }
  return value;
};

const requireMoney = (row, column, minimum) => {
  const rawValue = cleanCell(row[column]);
  if (isBlank(rawValue)) fail(row, column, "a dollar amount is required.");

  let value = rawValue;
  if (typeof value === "string") {
    const normalized = value.replaceAll("$", "").replaceAll(",", "").trim();
    if (!/^-?[0-9]+(?:\.[0-9]{1,2})?$/.test(normalized)) {
      fail(row, column, "enter a dollar amount with no more than two decimal places.");
    }
    value = Number(normalized);
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-7 ||
    value < minimum
  ) {
    const qualifier = minimum === 0 ? "zero or more" : `${minimum} or more`;
    fail(
      row,
      column,
      `enter a dollar amount of ${qualifier} with no more than two decimal places.`,
    );
  }
  return Math.round(value * 100) / 100;
};

const toCents = (value) => Math.round(value * 100);

const formatDollarAmount = (cents) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);

const assertBlank = (row, column, reason) => {
  if (!isBlank(row[column])) fail(row, column, reason);
};

const formatDateParts = (year, month, day) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const isValidCalendarDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const requireDate = (row, column) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) fail(row, column, "a date is required.");

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }

  if (typeof value === "string") {
    const match = DATE_PATTERN.exec(value);
    if (match) {
      const [, yearText, monthText, dayText] = match;
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      if (isValidCalendarDate(year, month, day)) return value;
    }
  }

  fail(row, column, "enter a valid date in YYYY-MM-DD format.");
};

const optionalDate = (row, column) => {
  if (isBlank(cleanCell(row[column]))) return null;
  return requireDate(row, column);
};

const optionalBoolean = (row, column, defaultValue = false) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && (value === 0 || value === 1)) {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["yes", "true", "y", "1"].includes(normalized)) return true;
    if (["no", "false", "n", "0"].includes(normalized)) return false;
  }
  fail(row, column, "use Yes or No.");
};

const optionalPositiveInteger = (row, column, defaultValue) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) return defaultValue;
  if (
    (typeof value === "number" && Number.isInteger(value) && value > 0) ||
    (typeof value === "string" && /^[1-9][0-9]*$/.test(value))
  ) {
    return Number(value);
  }
  fail(row, column, "enter a positive whole number.");
};

const requireImagePath = (row, column) => {
  const value = requireString(row, column, { maxLength: 500 });
  if (HTTPS_URL_PATTERN.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) {
    return value;
  }
  if (
    !value.startsWith(".") &&
    !value.includes("..") &&
    !value.includes("\\") &&
    !value.includes(":")
  ) {
    const relativePath = value.startsWith("photos/") ? value : `photos/${value}`;
    return `/${relativePath}`;
  }
  fail(
    row,
    column,
    "use an HTTPS URL, /photos/filename.jpg, or a filename stored in public/photos.",
  );
};

const optionalStartTime = (row, column) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) return null;

  if (typeof value === "string" && TIME_PATTERN.test(value)) return value;

  if (typeof value === "string") {
    const match = TWELVE_HOUR_TIME_PATTERN.exec(value);
    if (match) {
      const [, hourText, minuteText = "00", meridiem] = match;
      const hour = (Number(hourText) % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0);
      return `${String(hour).padStart(2, "0")}:${minuteText}`;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const fractionalDay = ((value % 1) + 1) % 1;
    const totalMinutes = Math.round(fractionalDay * 24 * 60) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  }

  fail(row, column, "enter a time such as 18:30 or 8 PM.");
};

const optionalEliminationLevel = (row, column) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) return null;
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return String(value);
  }
  if (typeof value === "string") {
    if (value.length > 50) {
      fail(row, column, "must be 50 characters or fewer.");
    }
    return value;
  }
  fail(row, column, "enter a level number or short label.");
};

const requireBlindLevel = (row, column) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) fail(row, column, "a level is required.");

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  if (typeof value === "string" && value.length <= 50) return value;

  fail(row, column, "enter a positive level number or a short label such as Break.");
};

const requireBlindDuration = (row, column) => {
  const value = cleanCell(row[column]);
  if (isBlank(value)) fail(row, column, "a duration is required.");

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.length <= 50) return value;

  fail(row, column, "enter a positive duration or a short label.");
};

export const parseTournamentPlacementCell = (value) => {
  const cleaned = cleanCell(value);

  if (typeof cleaned === "number" && Number.isInteger(cleaned) && cleaned > 0) {
    return cleaned;
  }

  if (typeof cleaned === "string") {
    if (/^[1-9][0-9]*$/.test(cleaned)) return Number(cleaned);
    if (TIED_PLACEMENT_PATTERN.test(cleaned)) return cleaned;
  }

  throw new PokerWorkbookError(
    "Placement must be a positive whole number or a tie such as T-1.",
  );
};

const requirePlacement = (row, column) => {
  if (isBlank(row[column])) fail(row, column, "a placement is required.");
  try {
    return parseTournamentPlacementCell(row[column]);
  } catch (error) {
    fail(row, column, error.message);
  }
};

const placementRank = (placement) =>
  typeof placement === "number"
    ? placement
    : Number.parseInt(placement.slice(2), 10);

const parseStatus = (row) => {
  const status = requireString(row, "Status");
  if (status !== "completed" && status !== "upcoming") {
    fail(row, "Status", "use completed or upcoming exactly.");
  }
  return status;
};

const mapSheetRows = (sheet, definition) => {
  if (!sheet) {
    if (definition.optionalSheet) return [];
    throw new PokerWorkbookError(
      `Missing worksheet “${definition.sheet}”. Keep the core worksheet names unchanged.`,
    );
  }

  const headerRow = sheet.data[HEADER_ROW_INDEX] ?? [];
  const requiredHeaders = definition.headers;
  const optionalHeaders = definition.optionalHeaders ?? [];
  const actualHeaders = requiredHeaders.map((_, index) =>
    String(headerRow[index] ?? "").trim(),
  );
  if (
    actualHeaders.length !== requiredHeaders.length ||
    actualHeaders.some((header, index) => header !== requiredHeaders[index])
  ) {
    throw new PokerWorkbookError(
      `${definition.sheet} row 4 must keep these headers in order: ${requiredHeaders.join(", ")}.`,
    );
  }

  const presentOptionalHeaders = [];
  for (let index = 0; index < optionalHeaders.length; index += 1) {
    const header = String(headerRow[requiredHeaders.length + index] ?? "").trim();
    if (header === optionalHeaders[index]) {
      presentOptionalHeaders.push(header);
      continue;
    }
    if (header !== "") {
      throw new PokerWorkbookError(
        `${definition.sheet} row 4 may add these headers after the required columns: ${optionalHeaders.join(", ")}.`,
      );
    }
    break;
  }

  const mappedHeaders = [...requiredHeaders, ...presentOptionalHeaders];
  const extraHeader = headerRow
    .slice(mappedHeaders.length)
    .some((value) => !isBlank(value));
  if (extraHeader) {
    throw new PokerWorkbookError(
      `${definition.sheet} row 4 contains an unexpected extra column.`,
    );
  }

  return sheet.data.slice(DATA_ROW_INDEX).flatMap((sourceRow, index) => {
    const row = sourceRow ?? [];
    if (rowIsBlank(row)) return [];
    if (row.slice(mappedHeaders.length).some((value) => !isBlank(value))) {
      throw new PokerWorkbookError(
        `${definition.sheet} row ${DATA_ROW_INDEX + index + 1} contains data outside the expected columns.`,
      );
    }

    const mapped = Object.fromEntries(
      [...requiredHeaders, ...optionalHeaders].map((header, columnIndex) => [
        header,
        presentOptionalHeaders.includes(header) ? row[columnIndex] ?? null : (
          columnIndex < requiredHeaders.length ? row[columnIndex] ?? null : null
        ),
      ]),
    );
    return [
      {
        ...mapped,
        __sheet: definition.sheet,
        __row: DATA_ROW_INDEX + index + 1,
      },
    ];
  });
};

const assertUnique = (rows, property, label, column) => {
  const seen = new Map();
  for (const row of rows) {
    const value = row[property];
    const earlier = seen.get(value);
    if (earlier) {
      fail(
        row.__source,
        column,
        `${label} “${value}” is already used on row ${earlier.__row}.`,
      );
    }
    seen.set(value, row.__source);
  }
};

const groupPlayerRows = (rows, idColumn, validIds, onWarning) => {
  const grouped = new Map();
  for (const row of rows) {
    const eventId = requireString(row, idColumn);
    const otherValues = Object.entries(row)
      .filter(([column]) => column !== idColumn && !column.startsWith("__"))
      .map(([, value]) => value);
    if (otherValues.every(isBlank)) {
      onWarning(
        `${row.__sheet} row ${row.__row} was ignored because it only contains the unfinished event ID “${eventId}”.`,
      );
      continue;
    }
    if (!validIds.has(eventId)) {
      fail(row, idColumn, `“${eventId}” does not match an event on its event sheet.`);
    }
    const eventRows = grouped.get(eventId) ?? [];
    eventRows.push(row);
    grouped.set(eventId, eventRows);
  }
  return grouped;
};

const groupBlindScheduleRows = (rows, validTournamentIds) => {
  const grouped = new Map();

  for (const row of rows) {
    const tournamentId = requireString(row, "Tournament ID");
    if (!validTournamentIds.has(tournamentId)) {
      fail(
        row,
        "Tournament ID",
        `“${tournamentId}” does not match a tournament on the Tournaments sheet.`,
      );
    }

    const level = requireBlindLevel(row, "Level");
    const duration = requireBlindDuration(row, "Duration");
    const smallBlindIsBlank = isBlank(row["Small Blind"]);
    const bigBlindIsBlank = isBlank(row["Big Blind"]);

    if (smallBlindIsBlank !== bigBlindIsBlank) {
      fail(
        row,
        smallBlindIsBlank ? "Small Blind" : "Big Blind",
        "enter both blind amounts or leave both blank for a break.",
      );
    }

    const entry = {
      level,
      duration,
      ...(!smallBlindIsBlank
        ? {
            smallBlind: requireMoney(row, "Small Blind", 0.01),
            bigBlind: requireMoney(row, "Big Blind", 0.01),
          }
        : {}),
    };
    const schedule = grouped.get(tournamentId) ?? [];
    schedule.push(entry);
    grouped.set(tournamentId, schedule);
  }

  return grouped;
};

const assertPlayerRows = (event, playerRows, minimum = 2) => {
  if (playerRows.length < minimum) {
    fail(
      event.__source,
      event.__idColumn,
      "this event must have at least two player rows.",
    );
  }

  const seen = new Map();
  for (const row of playerRows) {
    const name = requireString(row, "Player");
    if (seen.has(name)) {
      fail(
        row,
        "Player",
        `${name} already appears for this event on row ${seen.get(name)}.`,
      );
    }
    seen.set(name, row.__row);
  }
};

const parseTournamentParents = (rows) =>
  rows.map((row) => {
    const status = parseStatus(row);
    const startTime = optionalStartTime(row, "Start Time");
    if (status === "upcoming" && startTime === null) {
      fail(row, "Start Time", "an upcoming tournament requires a start time.");
    }

    return {
      id: requireString(row, "Tournament ID", {
        pattern: TOURNAMENT_ID_PATTERN,
        example: "tournament-2026-07 or tournament-2026-07-weekly-2",
      }),
      slug: requireString(row, "Slug", {
        pattern: SLUG_PATTERN,
        example: "lowercase-hyphenated-text",
      }),
      title: requireString(row, "Title", { maxLength: 80 }),
      date: requireDate(row, "Date"),
      host: requireString(row, "Host"),
      status,
      startTime,
      initialBuyIn: requireMoney(row, "Initial Buy-In", 1),
      notes: optionalString(row, "Notes", { maxLength: 5000 }),
      __source: row,
      __idColumn: "Tournament ID",
    };
  });

const parseCashGameParents = (rows) =>
  rows.map((row) => {
    const status = parseStatus(row);
    const startTime = optionalStartTime(row, "Start Time");
    if (status === "upcoming" && startTime === null) {
      fail(row, "Start Time", "an upcoming cash game requires a start time.");
    }

    return {
      id: requireString(row, "Cash Game ID", {
        pattern: CASH_GAME_ID_PATTERN,
        example: "cash-game-2026-07 or cash-game-2026-07-weekly-2",
      }),
      slug: requireString(row, "Slug", {
        pattern: SLUG_PATTERN,
        example: "lowercase-hyphenated-text",
      }),
      title: requireString(row, "Title", { maxLength: 80 }),
      date: requireDate(row, "Date"),
      host: requireString(row, "Host"),
      status,
      startTime,
      initialBuyIn: requireMoney(row, "Initial Buy-In", 1),
      notes: optionalString(row, "Notes", { maxLength: 5000 }),
      __source: row,
      __idColumn: "Cash Game ID",
    };
  });

const parseEventPhotos = (rows, eventDirectory) =>
  rows.map((row, index) => {
    const eventId = requireString(row, "Event ID");
    if (!eventDirectory.has(eventId)) {
      fail(row, "Event ID", `“${eventId}” does not match a tournament or cash game.`);
    }
    return {
      eventId,
      src: requireImagePath(row, "Image Path"),
      caption: optionalString(row, "Caption", { maxLength: 240 }),
      showOnHome: optionalBoolean(row, "Show on Home"),
      sortOrder: optionalPositiveInteger(row, "Sort Order", index + 1),
      sourceOrder: index,
      __source: row,
    };
  });

const parseAnnouncements = (rows, eventDirectory) => {
  const announcements = rows.map((row, index) => {
    const eventId = optionalString(row, "Event ID");
    if (eventId && !eventDirectory.has(eventId)) {
      fail(row, "Event ID", `“${eventId}” does not match a tournament or cash game.`);
    }
    const date = requireDate(row, "Date");
    const expires = optionalDate(row, "Expires");
    if (expires && expires < date) {
      fail(row, "Expires", "must be the announcement date or later.");
    }
    return {
      id: requireString(row, "Announcement ID", {
        maxLength: 80,
        pattern: ANNOUNCEMENT_ID_PATTERN,
        example: "lowercase-hyphenated-text",
      }),
      date,
      title: requireString(row, "Title", { maxLength: 100 }),
      body: requireString(row, "Body", { maxLength: 2000 }),
      eventId,
      expires,
      pinned: optionalBoolean(row, "Pinned"),
      sourceOrder: index,
      __source: row,
    };
  });
  assertUnique(announcements, "id", "Announcement ID", "Announcement ID");
  return announcements;
};

const groupPhotos = (photos) => {
  const grouped = new Map();
  for (const photo of photos) {
    const eventPhotos = grouped.get(photo.eventId) ?? [];
    eventPhotos.push(photo);
    grouped.set(photo.eventId, eventPhotos);
  }
  for (const eventPhotos of grouped.values()) {
    eventPhotos.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.sourceOrder - b.sourceOrder,
    );
  }
  return grouped;
};

const cleanEventPhotos = (photos = []) =>
  photos.map((photo) => ({
    src: photo.src,
    ...(photo.caption ? { caption: photo.caption } : {}),
  }));

const buildTournaments = (parents, groupedRows, groupedPhotos, groupedBlindSchedules) => {
  assertUnique(parents, "id", "Tournament ID", "Tournament ID");
  assertUnique(parents, "slug", "tournament slug", "Slug");

  return parents.map((event) => {
    const playerRows = groupedRows.get(event.id) ?? [];
    assertPlayerRows(event, playerRows, event.status === "upcoming" ? 0 : 2);

    const players = playerRows.map((row) => {
      const name = requireString(row, "Player");
      const totalBuyIn = requireMoney(row, "Total Buy-In", 1);

      if (event.status === "upcoming") {
        assertBlank(row, "Placement", "leave this blank for an upcoming tournament.");
        assertBlank(
          row,
          "Elimination Level",
          "leave this blank for an upcoming tournament.",
        );
        assertBlank(
          row,
          "Eliminated At",
          "leave this blank for an upcoming tournament.",
        );
        assertBlank(
          row,
          "Eliminated By",
          "leave this blank for an upcoming tournament.",
        );
        assertBlank(
          row,
          "Placement Payout",
          "leave this blank for an upcoming tournament.",
        );
        assertBlank(row, "Bonus Payout", "leave this blank for an upcoming tournament.");
        return { name, totalBuyIn };
      }

      const eliminationLevel = optionalEliminationLevel(
        row,
        "Elimination Level",
      );
      const eliminatedAt = optionalStartTime(row, "Eliminated At");
      const eliminatedBy = optionalString(row, "Eliminated By", {
        maxLength: 100,
      });

      return {
        name,
        totalBuyIn,
        placement: requirePlacement(row, "Placement"),
        ...(eliminationLevel ? { eliminationLevel } : {}),
        ...(eliminatedAt ? { eliminatedAt } : {}),
        ...(eliminatedBy ? { eliminatedBy } : {}),
        placementPayout: requireMoney(row, "Placement Payout", 0),
        bonusPayout: requireMoney(row, "Bonus Payout", 0),
        __source: row,
      };
    });

    if (event.status === "completed") {
      const plainPlacements = new Map();
      for (const player of players) {
        if (placementRank(player.placement) > players.length) {
          fail(
            player.__source,
            "Placement",
            `the rank cannot exceed this ${players.length}-player field.`,
          );
        }
        if (typeof player.placement === "number") {
          if (plainPlacements.has(player.placement)) {
            fail(
              player.__source,
              "Placement",
              `plain placement ${player.placement} is duplicated; use T-${player.placement} for a tie.`,
            );
          }
          plainPlacements.set(player.placement, player.__source.__row);
        }
      }

      const totalBuyIn = players.reduce(
        (sum, player) => sum + toCents(player.totalBuyIn),
        0,
      );
      const totalPayout = players.reduce(
        (sum, player) =>
          sum + toCents(player.placementPayout) + toCents(player.bonusPayout),
        0,
      );
      if (totalBuyIn !== totalPayout) {
        fail(
          event.__source,
          "Tournament ID",
          `buy-ins total ${formatDollarAmount(totalBuyIn)}, but payouts total ${formatDollarAmount(totalPayout)}.`,
        );
      }
    }

    const cleanPlayers = players.map((player) => {
      const cleanPlayer = { ...player };
      delete cleanPlayer.__source;
      return cleanPlayer;
    });
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      date: event.date,
      host: event.host,
      status: event.status,
      ...(event.startTime !== null ? { startTime: event.startTime } : {}),
      initialBuyIn: event.initialBuyIn,
      ...(event.notes ? { notes: event.notes } : {}),
      ...(groupedPhotos.has(event.id)
        ? { photos: cleanEventPhotos(groupedPhotos.get(event.id)) }
        : {}),
      ...(groupedBlindSchedules.has(event.id)
        ? { blindSchedule: groupedBlindSchedules.get(event.id) }
        : {}),
      players: cleanPlayers,
    };
  });
};

const buildCashGames = (parents, groupedRows, groupedPhotos) => {
  assertUnique(parents, "id", "Cash Game ID", "Cash Game ID");
  assertUnique(parents, "slug", "cash-game slug", "Slug");

  return parents.map((event) => {
    const playerRows = groupedRows.get(event.id) ?? [];
    assertPlayerRows(event, playerRows);

    const players = playerRows.map((row) => {
      const name = requireString(row, "Player");
      const amountBuyIn = requireMoney(row, "Amount Buy-In", 1);

      if (event.status === "upcoming") {
        assertBlank(row, "Amount At End", "leave this blank for an upcoming cash game.");
        return { name, amountBuyIn };
      }

      return {
        name,
        amountBuyIn,
        amountAtEnd: requireMoney(row, "Amount At End", 0),
      };
    });

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      date: event.date,
      host: event.host,
      status: event.status,
      ...(event.startTime !== null ? { startTime: event.startTime } : {}),
      initialBuyIn: event.initialBuyIn,
      ...(event.notes ? { notes: event.notes } : {}),
      ...(groupedPhotos.has(event.id)
        ? { photos: cleanEventPhotos(groupedPhotos.get(event.id)) }
        : {}),
      players,
    };
  });
};

const buildSiteContent = (photos, announcements, eventDirectory) => {
  const slides = photos
    .filter((photo) => photo.showOnHome)
    .map((photo) => {
      const event = eventDirectory.get(photo.eventId);
      return {
        id: `${photo.eventId}-photo-${photo.sourceOrder + 1}`,
        src: photo.src,
        ...(photo.caption ? { caption: photo.caption } : {}),
        eventId: event.id,
        eventType: event.eventType,
        eventSlug: event.slug,
        eventTitle: event.title,
        eventDate: event.date,
        __sortOrder: photo.sortOrder,
        __sourceOrder: photo.sourceOrder,
      };
    })
    .sort(
      (a, b) =>
        b.eventDate.localeCompare(a.eventDate) ||
        a.__sortOrder - b.__sortOrder ||
        a.__sourceOrder - b.__sourceOrder,
    )
    .map((slide) => {
      const cleanSlide = { ...slide };
      delete cleanSlide.__sortOrder;
      delete cleanSlide.__sourceOrder;
      return cleanSlide;
    });

  const resolvedAnnouncements = announcements
    .map((announcement) => {
      const event = announcement.eventId
        ? eventDirectory.get(announcement.eventId)
        : null;
      return {
        id: announcement.id,
        date: announcement.date,
        title: announcement.title,
        body: announcement.body,
        ...(event
          ? {
              eventId: event.id,
              eventType: event.eventType,
              eventSlug: event.slug,
              eventTitle: event.title,
            }
          : {}),
        ...(announcement.expires ? { expires: announcement.expires } : {}),
        pinned: announcement.pinned,
        __sourceOrder: announcement.sourceOrder,
      };
    })
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.date.localeCompare(a.date) ||
        a.__sourceOrder - b.__sourceOrder,
    )
    .map((announcement) => {
      const cleanAnnouncement = { ...announcement };
      delete cleanAnnouncement.__sourceOrder;
      return cleanAnnouncement;
    });

  return { slides, announcements: resolvedAnnouncements };
};

export const loadWorkbookSheets = (workbookPath = DEFAULT_WORKBOOK_PATH) =>
  readExcelFile(workbookPath);

export const parsePokerSheets = (sheets, { onWarning = () => {} } = {}) => {
  const sheetMap = new Map(sheets.map((sheet) => [sheet.sheet, sheet]));
  const tournamentRows = mapSheetRows(
    sheetMap.get(TABLES.tournaments.sheet),
    TABLES.tournaments,
  );
  const tournamentResultRows = mapSheetRows(
    sheetMap.get(TABLES.tournamentResults.sheet),
    TABLES.tournamentResults,
  );
  const blindScheduleRows = mapSheetRows(
    sheetMap.get(TABLES.blindSchedules.sheet),
    TABLES.blindSchedules,
  );
  const cashGameRows = mapSheetRows(
    sheetMap.get(TABLES.cashGames.sheet),
    TABLES.cashGames,
  );
  const cashGameResultRows = mapSheetRows(
    sheetMap.get(TABLES.cashGameResults.sheet),
    TABLES.cashGameResults,
  );
  const eventPhotoRows = mapSheetRows(
    sheetMap.get(TABLES.eventPhotos.sheet),
    TABLES.eventPhotos,
  );
  const announcementRows = mapSheetRows(
    sheetMap.get(TABLES.announcements.sheet),
    TABLES.announcements,
  );

  const tournamentParents = parseTournamentParents(tournamentRows);
  const cashGameParents = parseCashGameParents(cashGameRows);
  const tournamentIds = new Set(tournamentParents.map((event) => event.id));
  const cashGameIds = new Set(cashGameParents.map((event) => event.id));
  const eventDirectory = new Map([
    ...tournamentParents.map((event) => [
      event.id,
      {
        id: event.id,
        eventType: "tournament",
        slug: event.slug,
        title: event.title,
        date: event.date,
      },
    ]),
    ...cashGameParents.map((event) => [
      event.id,
      {
        id: event.id,
        eventType: "cash-game",
        slug: event.slug,
        title: event.title,
        date: event.date,
      },
    ]),
  ]);
  if (eventDirectory.size !== tournamentParents.length + cashGameParents.length) {
    throw new PokerWorkbookError(
      "Tournament IDs and cash-game IDs must be unique across the entire workbook.",
    );
  }

  const tournamentPlayerRows = groupPlayerRows(
    tournamentResultRows,
    "Tournament ID",
    tournamentIds,
    onWarning,
  );
  const cashGamePlayerRows = groupPlayerRows(
    cashGameResultRows,
    "Cash Game ID",
    cashGameIds,
    onWarning,
  );
  const groupedBlindSchedules = groupBlindScheduleRows(
    blindScheduleRows,
    tournamentIds,
  );
  const photos = parseEventPhotos(eventPhotoRows, eventDirectory);
  const announcements = parseAnnouncements(announcementRows, eventDirectory);
  const groupedPhotos = groupPhotos(photos);

  return {
    tournaments: buildTournaments(
      tournamentParents,
      tournamentPlayerRows,
      groupedPhotos,
      groupedBlindSchedules,
    ),
    cashGames: buildCashGames(cashGameParents, cashGamePlayerRows, groupedPhotos),
    siteContent: buildSiteContent(photos, announcements, eventDirectory),
  };
};

export const validateLocalPhotoFiles = async (
  { tournaments, cashGames },
  publicDirectory = defaultPublicDirectory,
) => {
  const localPhotos = [...tournaments, ...cashGames].flatMap((event) =>
    (event.photos ?? [])
      .filter((photo) => photo.src.startsWith("/"))
      .map((photo) => ({ eventTitle: event.title, src: photo.src })),
  );

  await Promise.all(
    localPhotos.map(async ({ eventTitle, src }) => {
      const filePath = path.resolve(publicDirectory, src.slice(1));
      const publicRoot = `${path.resolve(publicDirectory)}${path.sep}`;
      if (!filePath.startsWith(publicRoot)) {
        throw new PokerWorkbookError(
          `Photo path “${src}” for ${eventTitle} must stay inside the public folder.`,
        );
      }

      try {
        const file = await fs.stat(filePath);
        if (!file.isFile()) throw new Error("not a file");
      } catch {
        throw new PokerWorkbookError(
          `Photo path “${src}” for ${eventTitle} does not match a file in public/.`,
        );
      }
    }),
  );
};

export const readPokerWorkbook = async (
  workbookPath = DEFAULT_WORKBOOK_PATH,
  options,
) => {
  const data = parsePokerSheets(await loadWorkbookSheets(workbookPath), options);
  await validateLocalPhotoFiles(data);
  return data;
};

export const serializePokerData = ({ tournaments, cashGames, siteContent }) => ({
  tournaments: `${JSON.stringify(tournaments, null, 2)}\n`,
  cashGames: `${JSON.stringify(cashGames, null, 2)}\n`,
  siteContent: `${JSON.stringify(siteContent, null, 2)}\n`,
});

export const createSiteMetadata = (updatedAt = new Date()) => {
  if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
    throw new PokerWorkbookError("The site update timestamp must be a valid date.");
  }

  return { lastUpdated: updatedAt.toISOString() };
};

export const serializeSiteMetadata = (siteMetadata) =>
  `${JSON.stringify(siteMetadata, null, 2)}\n`;

export const parseSiteMetadata = (contents) => {
  let value;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new PokerWorkbookError(
      "Site metadata is not valid JSON. Run npm run update-data to regenerate it.",
    );
  }

  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    Object.keys(value).length !== 1 ||
    typeof value.lastUpdated !== "string" ||
    Number.isNaN(Date.parse(value.lastUpdated)) ||
    new Date(value.lastUpdated).toISOString() !== value.lastUpdated
  ) {
    throw new PokerWorkbookError(
      "Site metadata must contain one valid ISO lastUpdated timestamp. Run npm run update-data to regenerate it.",
    );
  }

  return value;
};

const readExisting = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

const writeAtomicallyIfChanged = async (filePath, contents) => {
  const current = await readExisting(filePath);
  if (current === contents) return false;

  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, contents, "utf8");
  try {
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  return true;
};

export const generatePokerJson = async ({
  workbookPath = DEFAULT_WORKBOOK_PATH,
  tournamentsPath = DEFAULT_TOURNAMENTS_PATH,
  cashGamesPath = DEFAULT_CASH_GAMES_PATH,
  siteContentPath = DEFAULT_SITE_CONTENT_PATH,
  siteMetadataPath = DEFAULT_SITE_METADATA_PATH,
  check = false,
  now = () => new Date(),
} = {}) => {
  const warnings = [];
  const serialized = serializePokerData(
    await readPokerWorkbook(workbookPath, {
      onWarning: (warning) => warnings.push(warning),
    }),
  );
  const [
    currentTournaments,
    currentCashGames,
    currentSiteContent,
    currentSiteMetadata,
  ] = await Promise.all([
    readExisting(tournamentsPath),
    readExisting(cashGamesPath),
    readExisting(siteContentPath),
    readExisting(siteMetadataPath),
  ]);

  const tournamentsChanged = currentTournaments !== serialized.tournaments;
  const cashGamesChanged = currentCashGames !== serialized.cashGames;
  const siteContentChanged = currentSiteContent !== serialized.siteContent;

  if (check) {
    if (currentSiteMetadata === null) {
      throw new PokerWorkbookError(
        "Site metadata is missing. Run npm run update-data to generate it.",
      );
    }
    parseSiteMetadata(currentSiteMetadata);

    if (tournamentsChanged || cashGamesChanged || siteContentChanged) {
      throw new PokerWorkbookError(
        "Generated JSON is out of date. Run npm run data:generate and commit the refreshed JSON files.",
      );
    }
    return {
      tournamentsChanged: false,
      cashGamesChanged: false,
      siteContentChanged: false,
      siteMetadataChanged: false,
      warnings,
    };
  }

  const serializedSiteMetadata = serializeSiteMetadata(createSiteMetadata(now()));
  const [
    wroteTournaments,
    wroteCashGames,
    wroteSiteContent,
    wroteSiteMetadata,
  ] = await Promise.all([
    writeAtomicallyIfChanged(tournamentsPath, serialized.tournaments),
    writeAtomicallyIfChanged(cashGamesPath, serialized.cashGames),
    writeAtomicallyIfChanged(siteContentPath, serialized.siteContent),
    writeAtomicallyIfChanged(siteMetadataPath, serializedSiteMetadata),
  ]);
  return {
    tournamentsChanged: wroteTournaments,
    cashGamesChanged: wroteCashGames,
    siteContentChanged: wroteSiteContent,
    siteMetadataChanged: wroteSiteMetadata,
    warnings,
  };
};

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    const check = process.argv.includes("--check");
    const result = await generatePokerJson({ check });
    for (const warning of result.warnings) {
      console.warn(`Excel data warning: ${warning}`);
    }
    if (check) {
      console.log("A-Town Poker JSON is in sync with the Excel workbook.");
    } else if (
      result.tournamentsChanged ||
      result.cashGamesChanged ||
      result.siteContentChanged ||
      result.siteMetadataChanged
    ) {
      console.log(
        "Generated poker data, site content, and update metadata from the Excel workbook.",
      );
    } else {
      console.log("Poker data, site content, and update metadata are current.");
    }
  } catch (error) {
    console.error(`\nExcel data could not be converted:\n${error.message}\n`);
    process.exitCode = 1;
  }
}
