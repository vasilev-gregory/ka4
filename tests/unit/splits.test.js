// Splits: the week's next program, and what creating, removing and deleting programs does to splits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSplit, splitWeek } from "../../src/model/splits.js";
import { createSplit, dropEmptySplit, removeSplit, setActiveSplit } from "../../src/model/splitActions.js";
import { removeProgram } from "../../src/model/workoutActions.js";
import { programLoad } from "../../src/model/muscles.js";
import { migrate, seed } from "../../src/model/state.js";

const DAY = 864e5;
const MON = new Date(2026, 9, 5, 12).getTime(); // a Monday
const w = (programId, at) => ({ programId, startedAt: at });

test("the week of a split: done items in order, a program twice needs two workouts, the next is the first not done", () => {
  const split = { items: [{ programId: "a" }, { programId: "b" }, { programId: "a" }] };
  const workouts = [w("a", MON - 2 * DAY), w("b", MON + DAY), w("x", MON + DAY), w("a", MON + 2 * DAY)];
  const wk = splitWeek(split, workouts, MON + 3 * DAY);
  assert.deepEqual(wk.done.map((x) => x && x.startedAt), [MON + 2 * DAY, MON + DAY, null]); // last week's «a» doesn't count
  assert.equal(wk.next, 2);
  const all = splitWeek(split, [...workouts, w("a", MON + 3 * DAY)], MON + 3 * DAY + 1000);
  assert.equal(all.next, -1); // the week is complete
});

test("a fresh install has the I–IV split active; older data gets no splits", () => {
  const d = seed();
  assert.equal(activeSplit(d).items.length, 4);
  assert.deepEqual(activeSplit(d).items.map((it) => it.programId), d.programs.map((p) => p.id));
  const old = seed();
  delete old.splits; delete old.activeSplitId;
  migrate(old);
  assert.deepEqual([old.splits, old.activeSplitId], [[], null]);
});

test("the first split becomes active; deleting the active one passes it on; an empty one is dropped; a deleted program leaves splits", () => {
  const d = seed();
  d.splits = []; d.activeSplitId = null;
  createSplit(d, "s1");
  createSplit(d, "s2");
  assert.equal(d.activeSplitId, "s1");
  setActiveSplit(d, "s2");
  d.splits[1].items.push({ programId: d.programs[0].id }, { programId: d.programs[1].id });
  removeProgram(d, d.programs[0].id);
  assert.equal(d.splits[1].items.length, 1);
  removeSplit(d, "s2");
  assert.equal(d.activeSplitId, "s1");
  dropEmptySplit(d, "s1");
  assert.deepEqual([d.splits, d.activeSplitId], [[], null]);
});

test("a split's week of muscles: a program twice counts its sets and its workouts twice", () => {
  const exMap = { squat: { id: "squat", kind: "reps", muscles: { quads: 1, glutes: 0.5 } } };
  const p = { id: "a", items: [{ exerciseId: "squat", sets: 3 }] };
  const m = programLoad([p, p], exMap).muscles;
  assert.deepEqual([m.quads.sets, m.quads.freq, m.glutes.sets, m.glutes.freq], [6, 2, 3, 0]);
});
