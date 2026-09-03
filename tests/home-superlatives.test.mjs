import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { formatMoney, formatSignedMoney } from "../lib/format.ts";
import {
  getPlayerProfiles,
  getQualifiedCashGameStandings,
  getTournamentStandings,
} from "../lib/poker-data.ts";

globalThis.React = React;

const { default: Home } = await import("../app/page.tsx");
const tournaments = JSON.parse(
  await readFile(new URL("../data/tournaments.json", import.meta.url), "utf8"),
);
const cashGames = JSON.parse(
  await readFile(new URL("../data/cash-games.json", import.meta.url), "utf8"),
);

function collectSuperlativeCards(node, cards = []) {
  if (Array.isArray(node)) {
    for (const child of node) collectSuperlativeCards(child, cards);
    return cards;
  }
  if (!node || typeof node !== "object") return cards;

  if (
    typeof node.type === "function" &&
    node.type.name === "SuperlativeCard"
  ) {
    cards.push(node.props);
  }
  collectSuperlativeCards(node.props?.children, cards);
  return cards;
}

test("homepage orders the leading superlatives and uses tournament net for Tournament King", () => {
  const cards = collectSuperlativeCards(Home());
  assert.equal(cards[0]?.label, "Cash specialist");
  assert.equal(cards[1]?.label, "Tournament king");
  assert.match(cards[2]?.label ?? "", / leader$/i);

  const standings = getTournamentStandings(tournaments);
  const winningNet = Math.max(...standings.map((player) => player.netProfit));
  const expectedNames = standings
    .filter((player) => player.netProfit === winningNet)
    .map((player) => player.name)
    .sort((a, b) => a.localeCompare(b));
  const tournamentKing = cards.find((card) => card.label === "Tournament king");

  assert.ok(tournamentKing);
  assert.deepEqual(tournamentKing.names, expectedNames);
  assert.equal(tournamentKing.value, formatSignedMoney(winningNet));
  assert.equal(tournamentKing.caption, "All-time tournament profit");
});

test("monthly leader uses only the latest month of completed cash games", () => {
  const cards = collectSuperlativeCards(Home());
  const completedCashGames = cashGames.filter((game) => game.status === "completed");
  const latestCashGameDate = completedCashGames
    .map((game) => game.date)
    .sort()
    .at(-1);

  assert.ok(latestCashGameDate);
  const latestMonth = latestCashGameDate.slice(0, 7);
  const latestMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${latestCashGameDate}T12:00:00Z`));
  const playerTotals = new Map();

  for (const game of completedCashGames.filter((event) =>
    event.date.startsWith(latestMonth),
  )) {
    for (const player of game.players) {
      playerTotals.set(
        player.name,
        (playerTotals.get(player.name) ?? 0) +
          player.amountAtEnd -
          player.amountBuyIn,
      );
    }
  }

  const winningProfit = Math.max(...playerTotals.values());
  const expectedNames = [...playerTotals]
    .filter(([, profit]) => profit === winningProfit)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
  const monthlyLeader = cards.find(
    (card) => card.label === `${latestMonthLabel} leader`,
  );

  assert.ok(monthlyLeader);
  assert.deepEqual(monthlyLeader.names, expectedNames);
  assert.equal(monthlyLeader.value, formatSignedMoney(winningProfit));
  assert.equal(
    monthlyLeader.caption,
    `Cash-game profit in ${latestMonthLabel}`,
  );
});

test("Best night uses only a single cash-game result", () => {
  const cards = collectSuperlativeCards(Home());
  const profits = cashGames
    .filter((game) => game.status === "completed")
    .flatMap((game) =>
      game.players.map((player) => ({
        name: player.name,
        profit: player.amountAtEnd - player.amountBuyIn,
      })),
    );
  const winningProfit = Math.max(...profits.map((player) => player.profit));
  const expectedNames = [
    ...new Set(
      profits
        .filter((player) => player.profit === winningProfit)
        .map((player) => player.name),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const bestNight = cards.find((card) => card.label === "Best night");

  assert.ok(bestNight);
  assert.deepEqual(bestNight.names, expectedNames);
  assert.equal(bestNight.value, formatSignedMoney(winningProfit));
  assert.equal(bestNight.caption, "Highest single cash-game profit");
});

test("cash volatility superlatives use only standings-qualified players", () => {
  const cards = collectSuperlativeCards(Home());
  const qualified = getQualifiedCashGameStandings(cashGames).filter(
    (player) => player.profitLossStandardDeviation !== null,
  );
  const highestVariance = Math.max(
    ...qualified.map((player) => player.profitLossStandardDeviation),
  );
  const lowestVariance = Math.min(
    ...qualified.map((player) => player.profitLossStandardDeviation),
  );
  const closestToEven = Math.min(
    ...qualified.map((player) => Math.abs(player.netProfit)),
  );
  const closestPlayer = qualified.find(
    (player) => Math.abs(player.netProfit) === closestToEven,
  );

  const expectations = [
    ["Most volatile", highestVariance],
    ["Least volatile", lowestVariance],
    ["Most average", closestToEven],
  ];

  for (const [label, value] of expectations) {
    const card = cards.find((candidate) => candidate.label === label);
    assert.ok(card);
    assert.equal(
      card.value,
      label === "Most average"
        ? formatSignedMoney(closestPlayer.netProfit)
        : formatMoney(value),
    );
  }
});

test("Most badges counts every earned badge and preserves ties", () => {
  const cards = collectSuperlativeCards(Home());
  const profiles = getPlayerProfiles(tournaments, cashGames);
  const highestCount = Math.max(...profiles.map((player) => player.badgeCount));
  const expectedNames = profiles
    .filter((player) => player.badgeCount === highestCount)
    .map((player) => player.name)
    .sort((a, b) => a.localeCompare(b));
  const mostBadges = cards.find((card) => card.label === "Most badges");

  assert.ok(mostBadges);
  assert.deepEqual(mostBadges.names, expectedNames);
  assert.equal(mostBadges.value, String(highestCount));
});
