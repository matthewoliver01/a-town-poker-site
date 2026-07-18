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
import {
  formatTournamentWinLabel,
  formatTournamentWins,
} from "../lib/format.ts";

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
  assert.equal(alice.wins, 1.5);

  assert.equal(bob.highestFinish, "T-1");
  assert.equal(bob.lowestFinish, 2);
  assert.equal(bob.averageFinish, 1.8);
  assert.equal(bob.wins, 0.5);
});

test("splits one tournament win evenly across co-winners", () => {
  const coWinners = ["Alice", "Bob", "Carla", "Drew"];
  const standings = getTournamentStandings([
    {
      id: "four-way-chop",
      slug: "four-way-chop",
      title: "Four-way chop",
      date: "2026-03-01",
      host: "Alice",
      venue: "A-Town",
      initialBuyIn: 20,
      status: "completed",
      players: [
        ...coWinners.map((name) => ({
          name,
          totalBuyIn: 20,
          placement: "T-1",
          eliminationRound: "Final",
          placementPayout: 20,
          bonusPayout: 0,
        })),
        {
          name: "Evan",
          totalBuyIn: 20,
          placement: 5,
          eliminationRound: "Final",
          placementPayout: 0,
          bonusPayout: 0,
        },
      ],
    },
  ]);

  for (const name of coWinners) {
    assert.equal(standings.find((player) => player.name === name)?.wins, 0.25);
  }
  assert.equal(standings.find((player) => player.name === "Evan")?.wins, 0);
  assert.equal(
    standings.reduce((sum, player) => sum + player.wins, 0),
    1,
  );
});

test("formats fractional tournament wins without repeating decimals", () => {
  assert.equal(formatTournamentWins(1), "1");
  assert.equal(formatTournamentWins(0.5), "0.5");
  assert.equal(formatTournamentWins(0.25), "0.25");
  assert.equal(formatTournamentWins(1 / 3), "0.33");
  assert.equal(formatTournamentWinLabel(1), "1 win");
  assert.equal(formatTournamentWinLabel(0.25), "0.25 wins");
});
