// Splits: the week's next program, and what creating, removing and deleting programs does to splits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSplit, splitOf, splitWeek } from "../../src/model/splits.js";
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
  createSplit(d, "s2", ["p1", "p2"]); // made of programs picked on the workout tab
  assert.deepEqual(d.splits[1].items, [{ programId: "p1" }, { programId: "p2" }]);
  d.splits[1].items = [];
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

test("a program's split: the active one when it holds the program, else the first that does", () => {
  const d = { splits: [{ id: "s1", items: [{ programId: "a" }] }, { id: "s2", items: [{ programId: "a" }, { programId: "b" }] }], activeSplitId: "s2" };
  assert.equal(splitOf(d, "a").id, "s2");
  d.activeSplitId = "s1";
  assert.equal(splitOf(d, "b").id, "s2");
  assert.equal(splitOf(d, "c"), null);
});

test("several programs deleted at once leave the splits; the undo puts back the programs and their places in splits", async () => {
  const { removePrograms, restorePrograms } = await import("../../src/model/workoutActions.js");
  const d = seed();
  const was = structuredClone({ programs: d.programs, splits: d.splits });
  const ids = [d.programs[0].id, d.programs[2].id];
  removePrograms(d, ids);
  assert.equal(d.programs.length, 2);
  assert.equal(d.splits[0].items.length, 2);
  restorePrograms(d, was);
  assert.deepEqual(d.splits[0].items.map((it) => it.programId), was.programs.map((p) => p.id));
});
