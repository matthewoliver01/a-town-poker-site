import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readExcelFile from "read-excel-file/node";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_WORKBOOK_PATH = path.join(
  projectRoot,
  "data/source/a-town-poker-results.xlsx",
);
export const DEFAULT_TOURNAMENTS_PATH = path.join(
  projectRoot,
  "data/tournaments.json",
);
export const DEFAULT_CASH_GAMES_PATH = path.join(
  projectRoot,
  "data/cash-games.json",
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
      "Venue",
      "Status",
      "Start Time",
      "Initial Buy-In",
    ],
  },
  tournamentResults: {
    sheet: "Tournament Results",
    headers: [
      "Tournament ID",
      "Player",
      "Total Buy-In",
      "Placement",
      "Elimination Round",
      "Placement Payout",
      "Bonus Payout",
    ],
  },
  cashGames: {
    sheet: "Cash Games",
    headers: [
      "Cash Game ID",
      "Slug",
      "Title",
      "Date",
      "Host",
      "Venue",
      "Status",
      "Start Time",
      "Initial Buy-In",
    ],
  },
  cashGameResults: {
    sheet: "Cash Game Results",
    headers: ["Cash Game ID", "Player", "Amount Buy-In", "Amount At End"],
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

const requireEliminationRound = (row, column) => {
  const value = cleanCell(row[column]);
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return requireString(row, column);
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
    throw new PokerWorkbookError(
      `Missing worksheet “${definition.sheet}”. Keep all five worksheet names unchanged.`,
    );
  }

  const headerRow = sheet.data[HEADER_ROW_INDEX] ?? [];
  const actualHeaders = definition.headers.map((_, index) =>
    String(headerRow[index] ?? "").trim(),
  );
  if (
    actualHeaders.length !== definition.headers.length ||
    actualHeaders.some((header, index) => header !== definition.headers[index])
  ) {
    throw new PokerWorkbookError(
      `${definition.sheet} row 4 must keep these headers in order: ${definition.headers.join(", ")}.`,
    );
  }

  const extraHeader = headerRow
    .slice(definition.headers.length)
    .some((value) => !isBlank(value));
  if (extraHeader) {
    throw new PokerWorkbookError(
      `${definition.sheet} row 4 contains an unexpected extra column.`,
    );
  }

  return sheet.data.slice(DATA_ROW_INDEX).flatMap((sourceRow, index) => {
    const row = sourceRow ?? [];
    if (rowIsBlank(row)) return [];
    if (row.slice(definition.headers.length).some((value) => !isBlank(value))) {
      throw new PokerWorkbookError(
        `${definition.sheet} row ${DATA_ROW_INDEX + index + 1} contains data outside the expected columns.`,
      );
    }

    const mapped = Object.fromEntries(
      definition.headers.map((header, columnIndex) => [header, row[columnIndex] ?? null]),
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

const assertPlayerRows = (event, playerRows) => {
  if (playerRows.length < 2) {
    fail(
      event.__source,
      event.__idColumn,
      "every event must have at least two player rows.",
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
      venue: requireString(row, "Venue"),
      status,
      startTime,
      initialBuyIn: requireMoney(row, "Initial Buy-In", 1),
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
      venue: requireString(row, "Venue"),
      status,
      startTime,
      initialBuyIn: requireMoney(row, "Initial Buy-In", 1),
      __source: row,
      __idColumn: "Cash Game ID",
    };
  });

const buildTournaments = (parents, groupedRows) => {
  assertUnique(parents, "id", "Tournament ID", "Tournament ID");
  assertUnique(parents, "slug", "tournament slug", "Slug");

  return parents.map((event) => {
    const playerRows = groupedRows.get(event.id) ?? [];
    assertPlayerRows(event, playerRows);

    const players = playerRows.map((row) => {
      const name = requireString(row, "Player");
      const totalBuyIn = requireMoney(row, "Total Buy-In", 1);

      if (event.status === "upcoming") {
        assertBlank(row, "Placement", "leave this blank for an upcoming tournament.");
        assertBlank(
          row,
          "Elimination Round",
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

      return {
        name,
        totalBuyIn,
        placement: requirePlacement(row, "Placement"),
        eliminationRound: requireEliminationRound(row, "Elimination Round"),
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
      venue: event.venue,
      status: event.status,
      ...(event.startTime !== null ? { startTime: event.startTime } : {}),
      initialBuyIn: event.initialBuyIn,
      players: cleanPlayers,
    };
  });
};

const buildCashGames = (parents, groupedRows) => {
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
      venue: event.venue,
      status: event.status,
      ...(event.startTime !== null ? { startTime: event.startTime } : {}),
      initialBuyIn: event.initialBuyIn,
      players,
    };
  });
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
  const cashGameRows = mapSheetRows(
    sheetMap.get(TABLES.cashGames.sheet),
    TABLES.cashGames,
  );
  const cashGameResultRows = mapSheetRows(
    sheetMap.get(TABLES.cashGameResults.sheet),
    TABLES.cashGameResults,
  );

  const tournamentParents = parseTournamentParents(tournamentRows);
  const cashGameParents = parseCashGameParents(cashGameRows);
  const tournamentIds = new Set(tournamentParents.map((event) => event.id));
  const cashGameIds = new Set(cashGameParents.map((event) => event.id));

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

  return {
    tournaments: buildTournaments(tournamentParents, tournamentPlayerRows),
    cashGames: buildCashGames(cashGameParents, cashGamePlayerRows),
  };
};

export const readPokerWorkbook = async (
  workbookPath = DEFAULT_WORKBOOK_PATH,
  options,
) => parsePokerSheets(await loadWorkbookSheets(workbookPath), options);

export const serializePokerData = ({ tournaments, cashGames }) => ({
  tournaments: `${JSON.stringify(tournaments, null, 2)}\n`,
  cashGames: `${JSON.stringify(cashGames, null, 2)}\n`,
});

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
  check = false,
} = {}) => {
  const warnings = [];
  const serialized = serializePokerData(
    await readPokerWorkbook(workbookPath, {
      onWarning: (warning) => warnings.push(warning),
    }),
  );
  const [currentTournaments, currentCashGames] = await Promise.all([
    readExisting(tournamentsPath),
    readExisting(cashGamesPath),
  ]);

  const tournamentsChanged = currentTournaments !== serialized.tournaments;
  const cashGamesChanged = currentCashGames !== serialized.cashGames;

  if (check) {
    if (tournamentsChanged || cashGamesChanged) {
      throw new PokerWorkbookError(
        "Generated JSON is out of date. Run npm run data:generate and commit the refreshed JSON files.",
      );
    }
    return { tournamentsChanged: false, cashGamesChanged: false, warnings };
  }

  const [wroteTournaments, wroteCashGames] = await Promise.all([
    writeAtomicallyIfChanged(tournamentsPath, serialized.tournaments),
    writeAtomicallyIfChanged(cashGamesPath, serialized.cashGames),
  ]);
  return {
    tournamentsChanged: wroteTournaments,
    cashGamesChanged: wroteCashGames,
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
    } else if (result.tournamentsChanged || result.cashGamesChanged) {
      console.log("Generated tournament and cash-game JSON from the Excel workbook.");
    } else {
      console.log("Tournament and cash-game JSON already match the Excel workbook.");
    }
  } catch (error) {
    console.error(`\nExcel data could not be converted:\n${error.message}\n`);
    process.exitCode = 1;
  }
}
