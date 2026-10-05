// Strength actions: what tapping, swiping and selecting sets does to the data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { liveRestKey, restBefore } from "../../src/model/workout.js";
import * as A from "../../src/model/workoutActions.js";

const T0 = 1_700_000_000_000;
const withWorkout = (sets) => {
  const d = seed();
  d.settings.restSec = 90;
  A.startWorkout(d, null, T0);
  d.active.exercises.push({ exerciseId: "squat", sets });
  return d;
};
const blank = (extra = {}) => ({ w: "", r: "", p: "", done: false, ...extra });

test("✓ without typing takes last time's values, stamps the time and starts the rest", () => {
  const d = withWorkout([blank({ hw: "80", hr: "6" }), blank()]);
  A.toggleSet(d, 0, 0, T0 + 1000);
  const s = d.active.exercises[0].sets[0];
  assert.deepEqual([s.done, s.w, s.r, s.at], [true, "80", "6", T0 + 1000]);
  assert.equal(d.active.lastSetAt, T0 + 1000);
  assert.equal(d.active.restEndsAt, T0 + 1000 + 90_000);
  A.toggleSet(d, 0, 0, T0 + 2000); // undo the tick
  assert.equal(s.done, false); assert.equal(s.at, undefined);
});

test("partial reps mean failure (RIR 0), but not on a warm-up", () => {
  const d = withWorkout([blank(), blank({ t: "w" })]);
  A.setSet(d, 0, 0, { p: "2" });
  A.setSet(d, 0, 1, { p: "2" });
  assert.equal(d.active.exercises[0].sets[0].rir, 0);
  assert.equal(d.active.exercises[0].sets[1].rir, undefined);
});

test("no rest countdown in the middle of a drop set, nor with the countdown off", () => {
  const d = withWorkout([blank({ g: "x" }), blank({ g: "x" }), blank()]);
  A.toggleSet(d, 0, 0, T0);
  assert.equal(d.active.restEndsAt, null);
  d.settings.countdown = false;
  A.toggleSet(d, 0, 2, T0);
  assert.equal(d.active.restEndsAt, null);
});

test("a set confirmed while paused resumes the workout with a new segment", () => {
  const d = withWorkout([blank()]);
  A.pauseWorkout(d, T0 + 10_000);
  assert.equal(d.active.paused, true);
  A.toggleSet(d, 0, 0, T0 + 50_000);
  assert.equal(d.active.paused, false);
  assert.deepEqual(d.active.segments, [{ start: T0, end: T0 + 10_000 }, { start: T0 + 50_000 }]);
});

test("merge moves the picked sets together at the first one's place; delete and undo", () => {
  const d = withWorkout([blank({ w: "a" }), blank({ w: "b" }), blank({ w: "c" }), blank({ w: "d" })]);
  A.mergeSets(d, 0, new Set([0, 2]));
  const ss = d.active.exercises[0].sets;
  assert.deepEqual(ss.map((s) => s.w), ["a", "c", "b", "d"]);
  assert.ok(ss[0].g && ss[0].g === ss[1].g); assert.equal(ss[2].g, undefined);
  const removed = structuredClone(ss[1]);
  A.deleteSet(d, 0, 1);
  assert.equal(d.active.exercises[0].sets[0].g, undefined, "a group of one is no group");
  A.restoreSet(d, 0, 1, removed);
  assert.deepEqual(d.active.exercises[0].sets.map((s) => s.w), ["a", "c", "b", "d"]);
});

test("warm-up toggle clears RIR; a new set takes hints from the last one", () => {
  const d = withWorkout([blank({ w: "60", r: "8", rir: 2 })]);
  A.toggleWarmup(d, 0, 0);
  assert.deepEqual([d.active.exercises[0].sets[0].t, d.active.exercises[0].sets[0].rir], ["w", null]);
  A.addSet(d, 0);
  const s = d.active.exercises[0].sets[1];
  assert.deepEqual([s.hw, s.hr, s.done], ["60", "8", false]);
});

test("moving a column keeps hidden ones in place", () => {
  const settings = { columns: [{ key: "w", on: true }, { key: "r", on: true }, { key: "p", on: false }, { key: "rir", on: true }, { key: "rest", on: true }] };
  A.moveColumn(settings, 2, 0); // rir to the front
  assert.deepEqual(settings.columns.map((c) => c.key), ["rir", "w", "p", "r", "rest"]);
});

test("the running rest stopwatch sits on the next unconfirmed set, also in the next exercise", () => {
  const d = withWorkout([blank(), blank()]);
  d.active.exercises.push({ exerciseId: "dips", sets: [blank()] });
  assert.equal(liveRestKey(d.active), null);
  A.toggleSet(d, 0, 0, T0);
  assert.equal(liveRestKey(d.active), "0:1");
  A.toggleSet(d, 0, 1, T0 + 1);
  assert.equal(liveRestKey(d.active), "1:0");
  A.pauseWorkout(d, T0 + 2);
  assert.equal(liveRestKey(d.active), null);
});

test("yesterday's program update: apply or dismiss", () => {
  const d = seed();
  const p = d.programs[0];
  d.pendingProgramUpdate = { programId: p.id, items: [{ exerciseId: "squat", sets: 5 }] };
  A.resolvePendingProgramUpdate(d, true);
  assert.deepEqual(p.items, [{ exerciseId: "squat", sets: 5 }]);
  assert.equal(d.pendingProgramUpdate, undefined);
});

test("a workout opens with a warm-up; finishing it starts the rest before the first set", () => {
  const d = withWorkout([blank(), blank()]);
  assert.deepEqual(d.active.warmup, { doneAt: null });
  assert.equal(liveRestKey(d.active), null);
  A.finishWarmup(d, T0 + 300_000);
  assert.equal(d.active.warmup.doneAt, T0 + 300_000);
  assert.equal(d.active.restEndsAt, T0 + 300_000 + 90_000);
  assert.equal(liveRestKey(d.active), "0:0"); // stopwatch on the first set
  A.toggleSet(d, 0, 0, T0 + 360_000);
  assert.equal(restBefore(d.active)["0:0"], 60_000); // rest before the first set counts from the warm-up
  assert.equal(liveRestKey(d.active), "0:1");
});

test("ticking a set before finishing the warm-up ends it", () => {
  const d = withWorkout([blank()]);
  A.toggleSet(d, 0, 0, T0 + 5000);
  assert.equal(d.active.warmup.doneAt, T0 + 5000);
});

test("a removed exercise comes back where it was", () => {
  const d = withWorkout([blank()]);
  d.active.exercises.push({ exerciseId: "dips", sets: [] });
  const [removed] = d.active.exercises.slice(0, 1);
  A.removeExercise(d, 0);
  A.restoreExercise(d, 0, removed);
  assert.deepEqual(d.active.exercises.map((e) => e.exerciseId), ["squat", "dips"]);
});
