import assert from "node:assert/strict";
import test from "node:test";
import { getTiedMetricLeaders } from "../lib/superlatives.ts";

test("returns every player tied on the highest primary metric", () => {
  assert.deepEqual(
    getTiedMetricLeaders([
      { name: "Charlie", value: 25 },
      { name: "Alice", value: 40 },
      { name: "Bob", value: 40 },
    ]),
    { names: ["Alice", "Bob"], value: 40 },
  );
});

test("supports lowest-value superlatives and de-duplicates player names", () => {
  assert.deepEqual(
    getTiedMetricLeaders(
      [
        { name: "Alice", value: 8 },
        { name: "Bob", value: 3 },
        { name: "Bob", value: 3 },
        { name: "Charlie", value: 3 },
      ],
      "lowest",
    ),
    { names: ["Bob", "Charlie"], value: 3 },
  );
});

test("normalizes insignificant floating-point differences when finding ties", () => {
  assert.deepEqual(
    getTiedMetricLeaders([
      { name: "Alice", value: 10.0000000001 },
      { name: "Bob", value: 10.0000000002 },
      { name: "Charlie", value: 9.5 },
    ]),
    { names: ["Alice", "Bob"], value: 10 },
  );
});
