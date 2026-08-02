import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { formatSignedMoney } from "../lib/format.ts";
import { getTournamentStandings } from "../lib/poker-data.ts";

globalThis.React = React;

const { default: Home } = await import("../app/page.tsx");
const tournaments = JSON.parse(
  await readFile(new URL("../data/tournaments.json", import.meta.url), "utf8"),
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
