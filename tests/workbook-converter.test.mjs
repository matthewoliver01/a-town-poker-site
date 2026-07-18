import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_CASH_GAMES_PATH,
  DEFAULT_TOURNAMENTS_PATH,
  generatePokerJson,
  loadWorkbookSheets,
  parsePokerSheets,
  parseTournamentPlacementCell,
  readPokerWorkbook,
} from "../scripts/generate-poker-data.mjs";

const readJson = (filePath) =>
  fs.readFile(filePath, "utf8").then((contents) => JSON.parse(contents));

test("the workbook round-trips to the committed tournament and cash-game JSON", async () => {
  const [workbookData, tournaments, cashGames] = await Promise.all([
    readPokerWorkbook(),
    readJson(DEFAULT_TOURNAMENTS_PATH),
    readJson(DEFAULT_CASH_GAMES_PATH),
  ]);

  assert.deepEqual(workbookData.tournaments, tournaments);
  assert.deepEqual(workbookData.cashGames, cashGames);
  assert.ok(workbookData.tournaments.length > 0);
  assert.ok(workbookData.cashGames.length > 0);
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
  assert.ok(Array.isArray(result.warnings));
});
