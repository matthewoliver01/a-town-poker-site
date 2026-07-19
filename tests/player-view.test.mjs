import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProfitTimeline,
  parsePlayerViewMode,
  playerViewHref,
} from "../lib/player-view.ts";

test("buildProfitTimeline aggregates same-day events and orders dates", () => {
  const timeline = buildProfitTimeline([
    { date: "2026-03-08", netProfit: -10.25 },
    { date: "2026-01-04", netProfit: 40 },
    { date: "2026-03-08", netProfit: 5.5 },
  ]);

  assert.deepEqual(timeline, [
    {
      date: "2026-01-04",
      eventProfit: 40,
      cumulativeProfit: 40,
      eventCount: 1,
    },
    {
      date: "2026-03-08",
      eventProfit: -4.75,
      cumulativeProfit: 35.25,
      eventCount: 2,
    },
  ]);
});

test("player view defaults can vary by route without losing explicit modes", () => {
  assert.equal(parsePlayerViewMode(undefined), "overall");
  assert.equal(parsePlayerViewMode(undefined, "cash-games"), "cash-games");
  assert.equal(parsePlayerViewMode("tournaments", "cash-games"), "tournaments");
  assert.equal(playerViewHref("/players", "cash-games", "cash-games"), "/players");
  assert.equal(
    playerViewHref("/players", "overall", "cash-games"),
    "/players?mode=overall",
  );
});
