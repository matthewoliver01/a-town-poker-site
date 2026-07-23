import assert from "node:assert/strict";
import test from "node:test";

import { getCashGameStandings } from "../lib/poker-data.ts";

function cashGame(id, date, aliceProfit, bobProfit) {
  return {
    id,
    slug: id,
    title: id,
    date,
    host: "Alice",
    venue: "A-Town",
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
