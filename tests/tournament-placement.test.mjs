import assert from "node:assert/strict";
import test from "node:test";

import {
  compareTournamentPlacements,
  formatTournamentPlacement,
  isTiedPlacement,
  placementRank,
  placementSortValue,
} from "../lib/poker-placement.ts";
import { getTournamentStandings } from "../lib/poker-data.ts";

test("orders an outright finish before its tie, then the next rank", () => {
  const placements = ["T-2", 2, "T-1", 1, 3];

  assert.deepEqual(placements.toSorted(compareTournamentPlacements), [
    1,
    "T-1",
    2,
    "T-2",
    3,
  ]);
});

test("uses the base rank for tied wins and top-three finishes", () => {
  assert.equal(placementRank("T-1"), 1);
  assert.equal(placementRank("T-3"), 3);
  assert.equal(placementSortValue("T-1"), 1.5);
  assert.equal(placementSortValue(2), 2);
  assert.equal(isTiedPlacement("T-1"), true);
});

test("formats ordinary placements as ordinals and preserves tie labels", () => {
  assert.equal(formatTournamentPlacement(1), "1st");
  assert.equal(formatTournamentPlacement(2), "2nd");
  assert.equal(formatTournamentPlacement(11), "11th");
  assert.equal(formatTournamentPlacement("T-1"), "T-1");
});

test("rejects malformed or non-positive placement values", () => {
  assert.throws(() => placementRank(0), RangeError);
  assert.throws(() => placementRank("T-0"), RangeError);
  assert.throws(() => placementRank("T-1.5"), RangeError);
});

test("calculates best, worst, average, and wins with tie-aware rankings", () => {
  const tournament = (id, date, alicePlacement, bobPlacement) => ({
    id,
    slug: id,
    title: id,
    date,
    host: "Alice",
    venue: "A-Town",
    initialBuyIn: 20,
    status: "completed",
    players: [
      {
        name: "Alice",
        totalBuyIn: 20,
        placement: alicePlacement,
        eliminationRound: "Final",
        placementPayout: 20,
        bonusPayout: 0,
      },
      {
        name: "Bob",
        totalBuyIn: 20,
        placement: bobPlacement,
        eliminationRound: "Final",
        placementPayout: 20,
        bonusPayout: 0,
      },
    ],
  });

  const standings = getTournamentStandings([
    tournament("event-one", "2026-01-01", 1, "T-1"),
    tournament("event-two", "2026-02-01", "T-1", 2),
  ]);
  const alice = standings.find((player) => player.name === "Alice");
  const bob = standings.find((player) => player.name === "Bob");

  assert.equal(alice.highestFinish, 1);
  assert.equal(alice.lowestFinish, "T-1");
  assert.equal(alice.averageFinish, 1.3);
  assert.equal(alice.wins, 2);

  assert.equal(bob.highestFinish, "T-1");
  assert.equal(bob.lowestFinish, 2);
  assert.equal(bob.averageFinish, 1.8);
  assert.equal(bob.wins, 1);
});
