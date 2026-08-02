import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMoney,
  formatSignedMoney,
  formatTime,
  formatUpdatedAt,
} from "../lib/format.ts";

test("formats whole-dollar amounts without decimal places", () => {
  assert.equal(formatMoney(125), "$125");
  assert.equal(formatMoney(125.0000001), "$125");
  assert.equal(formatSignedMoney(125), "+$125");
  assert.equal(formatSignedMoney(0), "$0");
});

test("formats fractional-dollar amounts with exactly two decimal places", () => {
  assert.equal(formatMoney(125.5), "$125.50");
  assert.equal(formatMoney(125.678), "$125.68");
  assert.equal(formatSignedMoney(-25.5), "-$25.50");
});

test("formats event times with a 12-hour clock", () => {
  assert.equal(formatTime("18:30"), "6:30 PM");
  assert.equal(formatTime("00:05"), "12:05 AM");
  assert.equal(formatTime("8 PM"), "8:00 PM");
});

test("formats generated update timestamps in A-Town's local time", () => {
  assert.equal(
    formatUpdatedAt("2026-08-02T22:15:00.000Z"),
    "Aug 2, 2026 · 6:15 PM",
  );
  assert.equal(
    formatUpdatedAt("2026-08-02T22:15:00.000Z", true),
    "8/2/26 · 6:15 PM",
  );
  assert.equal(formatUpdatedAt("not-a-date"), "Unavailable");
});
