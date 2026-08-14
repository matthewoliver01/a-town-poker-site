import assert from "node:assert/strict";
import test from "node:test";

import { calculatePlayerBadges } from "../lib/player-badges.ts";

function tournament(id, date, players) {
  return {
    id,
    slug: id,
    title: id,
    date,
    host: "Host",
    initialBuyIn: 20,
    status: "completed",
    players,
  };
}

function tournamentPlayer(name, placement, netProfit = 0) {
  return {
    name,
    totalBuyIn: 20,
    placement,
    placementPayout: 20 + netProfit,
    bonusPayout: 0,
  };
}

function cashGame(id, date, results) {
  return {
    id,
    slug: id,
    title: id,
    date,
    host: "Host",
    initialBuyIn: 20,
    status: "completed",
    players: results.map(([name, profit]) => ({
      name,
      amountBuyIn: 100,
      amountAtEnd: 100 + profit,
    })),
  };
}

function badgeCount(badges, playerName, kind) {
  return badges.get(playerName)?.find((badge) => badge.kind === kind)?.count ?? 0;
}

test("awards tournament medals and replaces split first with co-champion badges", () => {
  const badges = calculatePlayerBadges(
    [
      tournament("outright", "2026-01-01", [
        tournamentPlayer("Alice", 1),
        tournamentPlayer("Bob", 2),
        tournamentPlayer("Carla", 3),
      ]),
      tournament("split", "2026-02-01", [
        tournamentPlayer("Alice", "T-1"),
        tournamentPlayer("Bob", "T-1"),
        tournamentPlayer("Carla", 3),
      ]),
    ],
    [],
    "2026-08-14",
  );

  assert.equal(badgeCount(badges, "Alice", "tournament-champion"), 1);
  assert.equal(badgeCount(badges, "Alice", "tournament-co-champion"), 1);
  assert.equal(badgeCount(badges, "Bob", "tournament-co-champion"), 1);
  assert.equal(badgeCount(badges, "Bob", "tournament-runner-up"), 1);
  assert.equal(badgeCount(badges, "Carla", "tournament-third-place"), 2);
});

test("awards tied cash wins and waits until a month ends for monthly leaders", () => {
  const badges = calculatePlayerBadges(
    [],
    [
      cashGame("july-one", "2026-07-10", [
        ["Alice", 20],
        ["Bob", 20],
        ["Carla", -40],
      ]),
      cashGame("july-two", "2026-07-20", [
        ["Alice", -10],
        ["Bob", 0],
        ["Carla", 10],
      ]),
      cashGame("august", "2026-08-05", [
        ["Alice", 0],
        ["Bob", -50],
        ["Carla", 50],
      ]),
    ],
    "2026-08-14",
  );

  assert.equal(badgeCount(badges, "Alice", "cash-game-winner"), 1);
  assert.equal(badgeCount(badges, "Bob", "cash-game-winner"), 1);
  assert.equal(badgeCount(badges, "Carla", "cash-game-winner"), 2);
  assert.equal(badgeCount(badges, "Bob", "monthly-cash-leader"), 1);
  assert.equal(badgeCount(badges, "Carla", "monthly-cash-leader"), 0);
});

test("awards annual cash leaders only after the year ends", () => {
  const badges = calculatePlayerBadges(
    [],
    [
      cashGame("2025-cash", "2025-08-01", [
        ["Alice", 30],
        ["Bob", -30],
      ]),
      cashGame("2026-cash", "2026-01-10", [
        ["Alice", -100],
        ["Bob", 100],
      ]),
    ],
    "2026-08-14",
  );

  assert.equal(badgeCount(badges, "Alice", "annual-cash-leader"), 1);
  assert.equal(badgeCount(badges, "Bob", "annual-cash-leader"), 0);
});

test("tracks only cash-win streaks of four or more", () => {
  const winners = [
    "Alice",
    "Alice",
    "Alice",
    "Alice",
    "Bob",
    "Alice",
    "Alice",
    "Alice",
    "Bob",
    "Alice",
    "Alice",
    "Alice",
  ];
  const games = winners.map((winner, index) =>
    cashGame(`game-${index + 1}`, `2026-07-${String(index + 1).padStart(2, "0")}`, [
      ["Alice", winner === "Alice" ? 20 : -20],
      ["Bob", winner === "Bob" ? 20 : -20],
    ]),
  );
  const badges = calculatePlayerBadges([], games, "2026-08-14");
  const streakBadges = badges
    .get("Alice")
    ?.filter((badge) => badge.kind === "cash-win-streak");

  assert.deepEqual(streakBadges, [
    { kind: "cash-win-streak", count: 1, streakLength: 4 },
  ]);
});

test("cash streaks use profitable sessions and remain after a later loss", () => {
  const games = [1, 2, 3, 4, 5].map((day) =>
    cashGame(`game-${day}`, `2026-07-${String(day).padStart(2, "0")}`, [
      ["Sofia", day <= 4 ? 5 : -5],
      ["Carla", 10],
      ["Bob", day <= 4 ? -15 : -5],
    ]),
  );
  const badges = calculatePlayerBadges([], games, "2026-08-14");

  assert.deepEqual(
    badges
      .get("Sofia")
      ?.filter((badge) => badge.kind === "cash-win-streak"),
    [{ kind: "cash-win-streak", count: 1, streakLength: 4 }],
  );
  assert.equal(badgeCount(badges, "Sofia", "cash-game-winner"), 0);
});
