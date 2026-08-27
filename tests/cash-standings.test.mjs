import assert from "node:assert/strict";
import test from "node:test";

import {
  getCashGameQualificationMinimum,
  getCashGameStandings,
  getCashGameStandingsForMonth,
  getQualifiedCashGameStandings,
} from "../lib/poker-data.ts";

function cashGame(id, date, aliceProfit, bobProfit) {
  return {
    id,
    slug: id,
    title: id,
    date,
    host: "Alice",
    initialBuyIn: 100,
    status: "completed",
    players: [
      { name: "Alice", amountBuyIn: 100, amountAtEnd: 100 + aliceProfit },
      { name: "Bob", amountBuyIn: 100, amountAtEnd: 100 + bobProfit },
    ],
  };
}

test("calculates dollar-scaled cash-game variance from session results", () => {
  const standings = getCashGameStandings([
    cashGame("one", "2026-01-01", -10, 5),
    cashGame("two", "2026-02-01", 0, 5),
    cashGame("three", "2026-03-01", 10, 5),
  ]);

  const alice = standings.find((player) => player.name === "Alice");
  const bob = standings.find((player) => player.name === "Bob");

  assert.ok(
    Math.abs(alice.profitLossStandardDeviation - Math.sqrt(200 / 3)) < 1e-10,
  );
  assert.equal(bob?.profitLossStandardDeviation, 0);
});

test("requires two sessions before reporting cash-game variance", () => {
  const [alice] = getCashGameStandings([
    cashGame("one", "2026-01-01", 10, -10),
  ]);

  assert.equal(alice.profitLossStandardDeviation, null);
});

test("cash standings require attendance at 25% of completed games", () => {
  const games = [
    cashGame("one", "2026-01-01", 10, -10),
    cashGame("two", "2026-01-08", 10, -10),
    cashGame("three", "2026-01-15", 10, -10),
    cashGame("four", "2026-01-22", 10, -10),
    cashGame("five", "2026-01-29", 10, -10),
  ];
  games[1].players = games[1].players.filter((player) => player.name !== "Bob");
  games[2].players = games[2].players.filter((player) => player.name !== "Bob");
  games[3].players = games[3].players.filter((player) => player.name !== "Bob");
  games[4].players = games[4].players.filter((player) => player.name !== "Bob");

  assert.equal(getCashGameQualificationMinimum(games), 2);
  assert.deepEqual(
    getQualifiedCashGameStandings(games).map((player) => player.name),
    ["Alice"],
  );
});

test("monthly standings keep globally qualified players who skipped that month", () => {
  const games = [
    cashGame("july-one", "2026-07-01", 10, -10),
    cashGame("july-two", "2026-07-08", 10, -10),
    cashGame("august-one", "2026-08-01", 20, -20),
    cashGame("august-two", "2026-08-08", 20, -20),
  ];
  games[2].players = games[2].players.filter((player) => player.name !== "Bob");
  games[3].players = games[3].players.filter((player) => player.name !== "Bob");

  const august = getCashGameStandingsForMonth(games, "2026-08", true);
  const bob = august.find((player) => player.name === "Bob");

  assert.ok(bob);
  assert.equal(bob.gamesPlayed, 0);
  assert.equal(bob.netProfit, 0);
});
