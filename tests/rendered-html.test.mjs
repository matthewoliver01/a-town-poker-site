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
