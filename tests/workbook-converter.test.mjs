import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_CASH_GAMES_PATH,
  DEFAULT_SITE_CONTENT_PATH,
  DEFAULT_SITE_METADATA_PATH,
  DEFAULT_TOURNAMENTS_PATH,
  createSiteMetadata,
  generatePokerJson,
  loadWorkbookSheets,
  parseSiteMetadata,
  parsePokerSheets,
  parseTournamentPlacementCell,
  readPokerWorkbook,
  validateLocalPhotoFiles,
} from "../scripts/generate-poker-data.mjs";

const readJson = (filePath) =>
  fs.readFile(filePath, "utf8").then((contents) => JSON.parse(contents));

test("the workbook round-trips to every committed generated JSON file", async () => {
  const [workbookData, tournaments, cashGames, siteContent, siteMetadata] = await Promise.all([
    readPokerWorkbook(),
    readJson(DEFAULT_TOURNAMENTS_PATH),
    readJson(DEFAULT_CASH_GAMES_PATH),
    readJson(DEFAULT_SITE_CONTENT_PATH),
    fs.readFile(DEFAULT_SITE_METADATA_PATH, "utf8").then(parseSiteMetadata),
  ]);

  assert.deepEqual(workbookData.tournaments, tournaments);
  assert.deepEqual(workbookData.cashGames, cashGames);
  assert.deepEqual(workbookData.siteContent, siteContent);
  assert.ok(workbookData.tournaments.length > 0);
  assert.ok(workbookData.cashGames.length > 0);
  assert.equal(typeof siteMetadata.lastUpdated, "string");
});

test("the converter attaches notes and photos to events and builds homepage slides", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const tournaments = sheets.find((sheet) => sheet.sheet === "Tournaments");
  const tournamentId = tournaments.data[4][0];

  tournaments.data[3][8] = "Notes";
  tournaments.data[4][8] = "A long heads-up battle closed out the night.";
  sheets.push({
    sheet: "Event Photos",
    data: [
      [],
      [],
      [],
      ["Event ID", "Image Path", "Caption", "Show on Home", "Sort Order"],
      [tournamentId, "second-photo.jpg", "Final table", "Yes", 2],
      [tournamentId, "/photos/first-photo.jpg", "Cards in the air", "No", 1],
    ],
  });

  const parsed = parsePokerSheets(sheets);
  const tournament = parsed.tournaments.find((event) => event.id === tournamentId);
  assert.equal(
    tournament?.notes,
    "A long heads-up battle closed out the night.",
  );
  assert.deepEqual(tournament?.photos, [
    { src: "/photos/first-photo.jpg", caption: "Cards in the air" },
    { src: "/photos/second-photo.jpg", caption: "Final table" },
  ]);
  assert.deepEqual(parsed.siteContent.slides, [
    {
      id: `${tournamentId}-photo-1`,
      src: "/photos/second-photo.jpg",
      caption: "Final table",
      eventId: tournamentId,
      eventType: "tournament",
      eventSlug: tournament?.slug,
      eventTitle: tournament?.title,
      eventDate: tournament?.date,
    },
  ]);
});

test("the converter resolves general and event announcements", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const cashGames = sheets.find((sheet) => sheet.sheet === "Cash Games");
  const gameId = cashGames.data[4][0];
  const game = {
    slug: cashGames.data[4][1],
    title: cashGames.data[4][2],
  };
  sheets.push({
    sheet: "Announcements",
    data: [
      [],
      [],
      [],
      [
        "Announcement ID",
        "Date",
        "Title",
        "Body",
        "Event ID",
        "Expires",
        "Pinned",
      ],
      [
        "next-game-update",
        "2026-07-20",
        "Seat update",
        "Two seats remain.",
        gameId,
        "2026-07-31",
        "Yes",
      ],
      [
        "general-reminder",
        "2026-07-19",
        "Reminder",
        "Bring small bills.",
        null,
        null,
        "No",
      ],
    ],
  });

  const parsed = parsePokerSheets(sheets);
  assert.deepEqual(parsed.siteContent.announcements[0], {
    id: "next-game-update",
    date: "2026-07-20",
    title: "Seat update",
    body: "Two seats remain.",
    eventId: gameId,
    eventType: "cash-game",
    eventSlug: game.slug,
    eventTitle: game.title,
    expires: "2026-07-31",
    pinned: true,
  });
  assert.deepEqual(parsed.siteContent.announcements[1], {
    id: "general-reminder",
    date: "2026-07-19",
    title: "Reminder",
    body: "Bring small bills.",
    pinned: false,
  });
});

test("local event photos must exist under the public directory", async (t) => {
  const publicDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "atown-poker-photos-"),
  );
  t.after(() => fs.rm(publicDirectory, { force: true, recursive: true }));
  await fs.mkdir(path.join(publicDirectory, "photos"));
  await fs.writeFile(
    path.join(publicDirectory, "photos", "game-night.jpg"),
    "image fixture",
  );

  const data = {
    tournaments: [
      {
        title: "Game night",
        photos: [{ src: "/photos/game-night.jpg" }],
      },
    ],
    cashGames: [],
  };

  await validateLocalPhotoFiles(data, publicDirectory);
  data.tournaments[0].photos[0].src = "/photos/typo.jpg";
  await assert.rejects(
    () => validateLocalPhotoFiles(data, publicDirectory),
    /does not match a file in public/,
  );
});

test("the converter preserves tied placements from Excel as T-n strings", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const results = sheets.find((sheet) => sheet.sheet === "Tournament Results");
  const [tournamentId, playerName] = results.data[4];
  results.data[4][3] = "T-1";

  const parsed = parsePokerSheets(sheets);
  const tournament = parsed.tournaments.find((event) => event.id === tournamentId);
  const player = tournament?.players.find((entry) => entry.name === playerName);
  assert.equal(player?.placement, "T-1");
  assert.equal(parseTournamentPlacementCell("T-2"), "T-2");
  assert.equal(parseTournamentPlacementCell("3"), 3);
});

test("the converter includes available elimination details and omits missing ones", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const results = sheets.find((sheet) => sheet.sheet === "Tournament Results");
  const optionalHeaders = [
    "Elimination Level",
    "Eliminated At",
    "Eliminated By",
  ];
  if (results.data[3].length === 6) {
    results.data[3].push(...optionalHeaders);
  } else {
    assert.deepEqual(results.data[3].slice(6, 9), optionalHeaders);
  }

  const resultIndex = results.data.findIndex(
    (row, index) => index >= 4 && typeof row?.[3] === "number" && row[3] > 1,
  );
  assert.notEqual(resultIndex, -1);
  const [tournamentId, playerName] = results.data[resultIndex];
  results.data[resultIndex][6] = 8;
  results.data[resultIndex][7] = "9:47 PM";
  results.data[resultIndex][8] = "Nate F.";

  const parsed = parsePokerSheets(sheets);
  const tournament = parsed.tournaments.find((event) => event.id === tournamentId);
  const player = tournament?.players.find((entry) => entry.name === playerName);
  assert.equal(player?.eliminationLevel, "8");
  assert.equal(player?.eliminatedAt, "21:47");
  assert.equal(player?.eliminatedBy, "Nate F.");

  const incompletePlayer = tournament?.players.find(
    (entry) => entry.name !== playerName,
  );
  assert.ok(incompletePlayer);
  assert.equal("eliminationLevel" in incompletePlayer, false);
  assert.equal("eliminatedAt" in incompletePlayer, false);
  assert.equal("eliminatedBy" in incompletePlayer, false);
});

test("the converter accepts tournament results without optional elimination columns", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const results = sheets.find((sheet) => sheet.sheet === "Tournament Results");
  results.data = results.data.map((row) => row.slice(0, 6));

  const parsed = parsePokerSheets(sheets);
  const completedTournament = parsed.tournaments.find(
    (event) => event.status === "completed",
  );
  assert.ok(completedTournament);
  assert.ok(completedTournament.players.length > 0);
  assert.equal("eliminationLevel" in completedTournament.players[0], false);
  assert.equal("eliminatedAt" in completedTournament.players[0], false);
  assert.equal("eliminatedBy" in completedTournament.players[0], false);
});

test("an upcoming tournament can have no registered players", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const tournaments = sheets.find((sheet) => sheet.sheet === "Tournaments");
  tournaments.data.push([
    "tournament-2026-09",
    "tournament-2026-09",
    "September 2026 Tournament",
    "2026-09-12",
    "Nate F.",
    "upcoming",
    "7:00 PM",
    20,
    null,
  ]);

  const parsed = parsePokerSheets(sheets);
  const upcomingTournament = parsed.tournaments.find(
    (event) => event.id === "tournament-2026-09",
  );
  assert.ok(upcomingTournament);
  assert.equal(upcomingTournament.status, "upcoming");
  assert.deepEqual(upcomingTournament.players, []);
});

test("a completed tournament still requires at least two players", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const tournaments = sheets.find((sheet) => sheet.sheet === "Tournaments");
  const results = sheets.find((sheet) => sheet.sheet === "Tournament Results");
  tournaments.data.push([
    "tournament-2026-10",
    "tournament-2026-10",
    "October 2026 Tournament",
    "2026-10-10",
    "Nate F.",
    "completed",
    null,
    20,
    null,
  ]);
  results.data.push([
    "tournament-2026-10",
    "Only Player",
    20,
    1,
    20,
    0,
    null,
    null,
    null,
  ]);

  assert.throws(
    () => parsePokerSheets(sheets),
    /this event must have at least two player rows/,
  );
});

test("the converter safely skips an event-ID-only draft result row", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const results = sheets.find((sheet) => sheet.sheet === "Tournament Results");
  const warnings = [];
  results.data.push([results.data[4][0]]);

  parsePokerSheets(sheets, { onWarning: (warning) => warnings.push(warning) });
  assert.match(warnings.at(-1), /only contains the unfinished event ID/);
});

test("the converter rejects duplicate slugs with a sheet and row reference", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const tournaments = sheets.find((sheet) => sheet.sheet === "Tournaments");
  tournaments.data[5][1] = tournaments.data[4][1];

  assert.throws(
    () => parsePokerSheets(sheets),
    /Tournaments row 6, Slug: tournament slug .* is already used on row 5/,
  );
});

test("the converter preserves an unbalanced cash ledger for the site review check", async () => {
  const sheets = structuredClone(await loadWorkbookSheets());
  const results = sheets.find((sheet) => sheet.sheet === "Cash Game Results");
  results.data[4][3] += 0.01;

  const parsed = parsePokerSheets(sheets);
  const firstGame = parsed.cashGames[0];
  const totalBuyIn = firstGame.players.reduce(
    (sum, player) => sum + player.amountBuyIn,
    0,
  );
  const totalAtEnd = firstGame.players.reduce(
    (sum, player) => sum + player.amountAtEnd,
    0,
  );
  assert.notEqual(Math.round(totalBuyIn * 100), Math.round(totalAtEnd * 100));
});

test("the generated JSON is deterministic and current", async () => {
  const result = await generatePokerJson({ check: true });
  assert.equal(result.tournamentsChanged, false);
  assert.equal(result.cashGamesChanged, false);
  assert.equal(result.siteContentChanged, false);
  assert.equal(result.siteMetadataChanged, false);
  assert.ok(Array.isArray(result.warnings));
});

test("a successful generation records its injected completion time", async (t) => {
  const outputDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "atown-poker-metadata-"),
  );
  t.after(() => fs.rm(outputDirectory, { force: true, recursive: true }));
  const siteMetadataPath = path.join(outputDirectory, "site-metadata.json");
  const fixedTime = new Date("2026-08-02T19:24:31.456Z");

  const result = await generatePokerJson({
    tournamentsPath: path.join(outputDirectory, "tournaments.json"),
    cashGamesPath: path.join(outputDirectory, "cash-games.json"),
    siteContentPath: path.join(outputDirectory, "site-content.json"),
    siteMetadataPath,
    now: () => fixedTime,
  });

  assert.equal(result.siteMetadataChanged, true);
  assert.deepEqual(await readJson(siteMetadataPath), createSiteMetadata(fixedTime));
});

test("check mode validates saved metadata without consulting the current clock", async (t) => {
  const siteMetadataPath = path.join(
    await fs.mkdtemp(path.join(os.tmpdir(), "atown-poker-check-metadata-")),
    "site-metadata.json",
  );
  t.after(() =>
    fs.rm(path.dirname(siteMetadataPath), { force: true, recursive: true }),
  );
  await fs.writeFile(
    siteMetadataPath,
    `${JSON.stringify(createSiteMetadata(new Date("2026-01-01T00:00:00.000Z")), null, 2)}\n`,
  );

  const result = await generatePokerJson({
    check: true,
    siteMetadataPath,
    now: () => {
      throw new Error("check mode should not read the clock");
    },
  });

  assert.equal(result.siteMetadataChanged, false);

  await fs.writeFile(siteMetadataPath, '{"lastUpdated":"not-a-date"}\n');
  await assert.rejects(
    () => generatePokerJson({ check: true, siteMetadataPath }),
    /valid ISO lastUpdated timestamp/,
  );
});

test("a failed workbook validation never writes update metadata", async (t) => {
  const outputDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "atown-poker-failed-metadata-"),
  );
  t.after(() => fs.rm(outputDirectory, { force: true, recursive: true }));
  const siteMetadataPath = path.join(outputDirectory, "site-metadata.json");
  let readClock = false;

  await assert.rejects(() =>
    generatePokerJson({
      workbookPath: path.join(outputDirectory, "missing.xlsx"),
      tournamentsPath: path.join(outputDirectory, "tournaments.json"),
      cashGamesPath: path.join(outputDirectory, "cash-games.json"),
      siteContentPath: path.join(outputDirectory, "site-content.json"),
      siteMetadataPath,
      now: () => {
        readClock = true;
        return new Date();
      },
    }),
  );

  assert.equal(readClock, false);
  await assert.rejects(() => fs.access(siteMetadataPath), { code: "ENOENT" });
});
