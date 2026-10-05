// Stretching domain logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, stExMap } from "../../src/model/stretch.js";
import { seed } from "../../src/model/state.js";

test("stretch timeline: circuit, sides, no trailing rest, prep each round", () => {
  const d = seed();
  const p = { timing: { prep: 10, work: 30, sw: 5, rest: 15, rounds: 2, roundRest: 60, mode: "circuit" },
    items: [{ exerciseId: "st-figure-four" }, { exerciseId: "st-pizza" }] };
  const tl = buildTimeline(p, stExMap(d));
  assert.deepEqual(tl.map((x) => x.k).join(","),
    "prep,work,switch,work,rest,prep,work,roundRest,prep,work,switch,work,rest,prep,work");
});
