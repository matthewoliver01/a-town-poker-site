import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, formatSignedMoney } from "../lib/format.ts";

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
