import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [tournaments, cashGames] = await Promise.all([
  readFile(new URL("../data/tournaments.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
  readFile(new URL("../data/cash-games.json", import.meta.url), "utf8").then(
    JSON.parse,
  ),
]);

const latestCompletedTournament = tournaments
  .filter((event) => event.status === "completed")
  .sort((a, b) => b.date.localeCompare(a.date))[0];
const detailTournament =
  tournaments.find((event) => event.status === "upcoming") ?? tournaments[0];
const latestCompletedCashGame = cashGames
  .filter((event) => event.status === "completed")
  .sort((a, b) => b.date.localeCompare(a.date))[0];
const completedTournaments = tournaments.filter(
  (event) => event.status === "completed",
);
const completedCashGames = cashGames.filter(
  (event) => event.status === "completed",
);
const cashGamePlayerNames = new Set(
  completedCashGames.flatMap((event) =>
    event.players.map((player) => player.name),
  ),
);
const mixedFormatPlayerName = completedTournaments
  .flatMap((event) => event.players)
  .find((player) => cashGamePlayerNames.has(player.name))?.name;

assert.ok(
  mixedFormatPlayerName,
  "The player page test needs a player with completed results in both formats",
);

const mixedFormatPlayerSlug = mixedFormatPlayerName
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const mixedPlayerCashGame = completedCashGames.find((event) =>
  event.players.some((player) => player.name === mixedFormatPlayerName),
);

function textContent(markup) {
  return markup
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function assertPlayerModeTabs(html, selectedLabel) {
  const tabs = [
    ...html.matchAll(
      /<button\b(?=[^>]*role="tab")([^>]*)>([\s\S]*?)<\/button>/g,
    ),
  ];
  const labels = tabs.map((match) => textContent(match[2]));
  const selectedLabels = tabs
    .filter((match) => /aria-selected="true"/.test(match[1]))
    .map((match) => textContent(match[2]));

  for (const label of ["Overall", "Tournaments", "Cash games"]) {
    assert.ok(labels.includes(label), `Expected a ${label} player mode tab`);
  }
  assert.deepEqual(selectedLabels, [selectedLabel]);
}

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the A-Town Poker home page with generated event data", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>A-Town Poker(?: · A-Town Poker)?<\/title>/i);
  assert.match(html, /The ledger behind/);
  assert.ok(html.includes(latestCompletedTournament.title));
  assert.ok(html.includes(latestCompletedCashGame.title));
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working/i);
});

test("server-renders generated tournament and cash-game detail routes", async () => {
  const [tournamentResponse, cashGameResponse] = await Promise.all([
    render(`/tournaments/${detailTournament.slug}`),
    render(`/cash-games/${latestCompletedCashGame.slug}`),
  ]);

  assert.equal(tournamentResponse.status, 200);
  assert.equal(cashGameResponse.status, 200);

  const [tournamentHtml, cashGameHtml] = await Promise.all([
    tournamentResponse.text(),
    cashGameResponse.text(),
  ]);
  assert.ok(tournamentHtml.includes(detailTournament.title));
  if (detailTournament.startTime) {
    assert.ok(tournamentHtml.includes(detailTournament.startTime));
  }
  assert.ok(cashGameHtml.includes(latestCompletedCashGame.title));
  assert.ok(cashGameHtml.includes(latestCompletedCashGame.players[0].name));
  const buyInTotal = latestCompletedCashGame.players.reduce(
    (sum, player) => sum + player.amountBuyIn,
    0,
  );
  const endingTotal = latestCompletedCashGame.players.reduce(
    (sum, player) => sum + player.amountAtEnd,
    0,
  );
  if (Math.round(buyInTotal * 100) !== Math.round(endingTotal * 100)) {
    assert.match(cashGameHtml, /Review needed/);
  }
});

test("server-renders player mode controls and selects modes from the query string", async () => {
  const [playersResponse, tournamentPlayersResponse] = await Promise.all([
    render("/players"),
    render("/players?mode=tournaments"),
  ]);

  assert.equal(playersResponse.status, 200);
  assert.equal(tournamentPlayersResponse.status, 200);

  const [playersHtml, tournamentPlayersHtml] = await Promise.all([
    playersResponse.text(),
    tournamentPlayersResponse.text(),
  ]);
  assertPlayerModeTabs(playersHtml, "Overall");
  assert.match(playersHtml, /All players/i);
  assert.match(playersHtml, /Combined net/i);

  assertPlayerModeTabs(tournamentPlayersHtml, "Tournaments");
  assert.match(tournamentPlayersHtml, /All players/i);
  assert.match(tournamentPlayersHtml, /Tournament (?:net|wins)/i);
});

test("server-renders a mixed-format player with overall and cash-game views", async () => {
  const [overallResponse, cashGameResponse] = await Promise.all([
    render(`/players/${mixedFormatPlayerSlug}`),
    render(`/players/${mixedFormatPlayerSlug}?mode=cash-games`),
  ]);

  assert.equal(overallResponse.status, 200);
  assert.equal(cashGameResponse.status, 200);

  const [overallHtml, cashGameHtml] = await Promise.all([
    overallResponse.text(),
    cashGameResponse.text(),
  ]);
  assertPlayerModeTabs(overallHtml, "Overall");
  assert.ok(overallHtml.includes(mixedFormatPlayerName));
  assert.match(overallHtml, /Complete event history/i);

  assertPlayerModeTabs(cashGameHtml, "Cash games");
  assert.ok(cashGameHtml.includes(mixedFormatPlayerName));
  assert.match(cashGameHtml, /Cash[- ]game snapshot/i);
  assert.match(cashGameHtml, /Cash[- ]game history/i);
  assert.ok(cashGameHtml.includes(mixedPlayerCashGame.title));
  assert.doesNotMatch(cashGameHtml, /Tournament snapshot/i);
  assert.doesNotMatch(cashGameHtml, /Tournament history/i);
});
