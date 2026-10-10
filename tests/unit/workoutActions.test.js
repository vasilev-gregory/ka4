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

test("partial reps can't be planned: typed, the set is done to failure (RIR 0) at once; not on a warm-up", () => {
  const d = withWorkout([blank({ hw: "80", r: "8" }), blank({ t: "w" })]);
  A.setSet(d, 0, 0, { p: "2" }, T0 + 1000);
  A.setSet(d, 0, 1, { p: "2" }, T0 + 2000);
  const [s, w] = d.active.exercises[0].sets;
  assert.deepEqual([s.done, s.rir, s.w, s.r, s.at], [true, 0, "80", "8", T0 + 1000]);
  A.setSet(d, 0, 0, { p: "25" }, T0 + 3000); // typing on: still the same tick
  assert.equal(s.at, T0 + 1000);
  assert.deepEqual([w.done, w.rir], [false, undefined]);
});

test("the dial on ✓ marks the set done with the RIR picked (over the RIR 0 of partials); on a done set only the RIR changes", () => {
  const d = withWorkout([blank({ hw: "80", hr: "6", p: "2" })]);
  A.markSetRir(d, 0, 0, 2, T0 + 1000);
  const s = d.active.exercises[0].sets[0];
  assert.deepEqual([s.done, s.w, s.rir, s.at], [true, "80", 2, T0 + 1000]);
  A.markSetRir(d, 0, 0, 4, T0 + 5000);
  assert.deepEqual([s.done, s.rir, s.at], [true, 4, T0 + 1000]);
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
  const settings = { columns: [{ key: "w", on: true }, { key: "rir", on: true }, { key: "r", on: true }, { key: "p", on: true }, { key: "rest", on: true }] };
  A.moveColumn(settings, 2, 0); // partials to the front; RIR (in ✓, not a column) stays where it was
  assert.deepEqual(settings.columns.map((c) => c.key), ["p", "rir", "w", "r", "rest"]);
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

test("finishing a workout: only done sets, at the given time, into history; program updated only when asked", () => {
  const d = seed();
  const p = d.programs[0];
  A.startWorkout(d, p, 1000);
  d.active.exercises[0].sets[0].done = true;
  d.active.exercises[0].sets.push({ w: "", r: "", p: "", done: false });
  const before = p.items.length;
  A.addExercises(d, [d.exercises.find((e) => e.id === "barbell-curl")], 1500);
  const id = A.finishWorkout(d, false, 5000);
  const w = d.workouts.find((x) => x.id === id);
  assert.equal(d.active, null);
  assert.equal(w.finishedAt, 5000);
  assert.ok(w.exercises.every((e) => e.sets.every((s) => s.done)));
  assert.equal(p.items.length, before); // not asked: the program stays
});

test("finishing as a bad day files the workout «не в зачёт»", () => {
  const d = withWorkout([blank({ w: "80", r: "5", done: true }), blank()]);
  const id = A.finishWorkout(d, false, T0 + 60e3, true);
  assert.equal(d.workouts.find((x) => x.id === id).off, true);
});

test("programs: create, items added with their kind's plan, replaced keeping sets within a kind, removed", () => {
  const d = seed();
  const exMap = Object.fromEntries(d.exercises.map((e) => [e.id, e]));
  A.createProgram(d, "p1");
  const p = d.programs.find((x) => x.id === "p1");
  A.addProgramItems(p, [exMap.squat, exMap.elliptical]);
  assert.equal(p.items[1].min, 20);
  p.items[0].sets = 5;
  A.replaceProgramItem(p, 0, exMap["leg-press"], exMap);
  assert.deepEqual(p.items[0], { exerciseId: "leg-press", sets: 5 }); // the same kind keeps its sets
  A.replaceProgramItem(p, 1, exMap.squat, exMap);
  assert.equal(p.items[1].min, undefined); // cardio -> strength starts from the defaults
  A.removeProgram(d, "p1");
  assert.equal(d.programs.some((x) => x.id === "p1"), false);
});

test("turning the countdown off drops the one going on; workouts and the running one can be removed", () => {
  const d = seed();
  A.startWorkout(d, null, 1000);
  d.active.restEndsAt = 5000;
  A.setCountdown(d, false);
  assert.equal(d.active.restEndsAt, null);
  assert.equal(d.settings.countdown, false);
  A.discardWorkout(d);
  assert.equal(d.active, null);
  d.workouts = [{ id: "a" }, { id: "b" }];
  A.removeWorkout(d, "a");
  assert.deepEqual(d.workouts.map((w) => w.id), ["b"]);
});

test("a program left empty and unnamed is dropped, one with a name or an exercise stays", async () => {
  const S = await import("../../src/model/stretchActions.js");
  const d = seed();
  A.createProgram(d, "e");
  A.createProgram(d, "n");
  d.programs.find((p) => p.id === "n").name = "Ноги";
  A.dropEmptyProgram(d, "e");
  A.dropEmptyProgram(d, "n");
  assert.deepEqual(d.programs.filter((p) => ["e", "n"].includes(p.id)).map((p) => p.id), ["n"]);
  const s = d.stretch;
  S.createProgram(s, "x");
  S.dropEmptyProgram(s, "x");
  assert.equal(s.programs.some((p) => p.id === "x"), false);
});

test("one session at a time: a workout doesn't start while a stretching run goes on", async () => {
  const { runningSession } = await import("../../src/model/workout.js");
  const d = seed();
  assert.equal(runningSession(d), null);
  d.stretch.active = { programId: "p", done: false };
  assert.equal(runningSession(d), "stretch");
  A.startWorkout(d, d.programs[0], 1000);
  assert.equal(d.active, null);
  d.stretch.active.done = true; // a finished run waiting to be closed doesn't count
  A.startWorkout(d, d.programs[0], 1000);
  assert.equal(runningSession(d), "strength");
});

test("the hidden rest countdown comes back counted from the last set; not while paused", () => {
  const d = withWorkout([blank({ w: "80", r: "5" }), blank()]);
  A.toggleSet(d, 0, 0, T0 + 1000);
  A.clearRest(d);
  assert.equal(d.active.restEndsAt, null);
  A.showRest(d, T0 + 30e3);
  assert.equal(d.active.restEndsAt, T0 + 1000 + 90e3);
  A.clearRest(d);
  d.active.paused = true;
  A.showRest(d, T0 + 40e3);
  assert.equal(d.active.restEndsAt, null);
});

test("✓ with only partials typed: full reps are 0, not last time's", () => {
  const d = withWorkout([blank({ hw: "80", hr: "6", p: "3" }), blank({ hw: "80", hr: "6" })]);
  A.toggleSet(d, 0, 0, T0 + 1000);
  A.toggleSet(d, 0, 1, T0 + 2000);
  const [a, b] = d.active.exercises[0].sets;
  assert.deepEqual([a.w, a.r, a.p], ["80", "0", "3"]);
  assert.deepEqual([b.w, b.r], ["80", "6"]); // nothing typed: last time's
});

test("a program from a finished workout: its exercises in order, working sets (at least 1), cardio at its minutes", () => {
  const d = seed();
  const exMap = { squat: { id: "squat", kind: "reps" }, run: { id: "run", kind: "cardio" } };
  const w = { name: "Ноги", exercises: [
    { exerciseId: "squat", sets: [blank({ t: "w", done: true }), blank({ done: true }), blank({ done: true })] },
    { exerciseId: "dips", sets: [blank({ t: "w", done: true })] },
    { exerciseId: "run", sets: [blank({ r: "12,5", done: true }), blank({ r: "10", done: true })] },
  ] };
  A.programFromWorkout(d, w, "p1", exMap);
  assert.deepEqual(d.programs.find((p) => p.id === "p1"), { id: "p1", name: "Ноги", items: [
    { exerciseId: "squat", sets: 2 }, { exerciseId: "dips", sets: 1 }, { exerciseId: "run", sets: 1, min: 23 },
  ] });
});

test("ticks in any order: each set keeps the rest fixed at its tick; unticking steps the running rest back", () => {
  const d = withWorkout([blank(), blank(), blank()]);
  d.active.exercises.push({ exerciseId: "dips", sets: [blank()] });
  A.toggleSet(d, 0, 0, T0 + 30e3); // the first tick: no rest before it
  A.toggleSet(d, 0, 2, T0 + 70e3); // set 3 before set 2
  assert.equal(liveRestKey(d.active), "0:1", "the stopwatch waits on the skipped set 2");
  A.toggleSet(d, 0, 1, T0 + 120e3);
  assert.deepEqual(restBefore(d.active), { "0:1": 50e3, "0:2": 40e3 });
  A.toggleSet(d, 0, 2, T0 + 125e3); // untick set 3: set 2 keeps its 50 s
  assert.deepEqual(restBefore(d.active), { "0:1": 50e3 });
  assert.equal(d.active.lastSetAt, T0 + 120e3);
  A.toggleSet(d, 0, 1, T0 + 130e3); // untick set 2, the last tick: back to set 1's, its countdown gone
  assert.equal(d.active.lastSetAt, T0 + 30e3);
  assert.equal(d.active.restEndsAt, null);
  assert.equal(liveRestKey(d.active), "0:1");
});

test("every step of a drop set is to failure: RIR 0 at the tick unless one was given; a lone set is left alone", () => {
  const d = withWorkout([blank({ w: "60", g: "x" }), blank({ w: "45", g: "x" }), blank({ w: "30", g: "x", rir: 2 }), blank({ w: "40" })]);
  [0, 1, 2, 3].forEach((si) => A.toggleSet(d, 0, si, T0 + si * 1000));
  assert.deepEqual(d.active.exercises[0].sets.map((s) => s.rir), [0, 0, 2, undefined]);
  // merged after: every step is done, to failure — the unticked ones get ticked by the merge
  const e = withWorkout([blank({ w: "60" }), blank({ w: "45" }), blank({ w: "30", rir: 1 }), blank({ w: "20", t: "w" })]);
  A.toggleSet(e, 0, 0, T0);
  A.mergeSets(e, 0, new Set([0, 1, 2]), T0 + 5000);
  const es = e.active.exercises[0].sets;
  assert.deepEqual(es.map((x) => [x.done, x.rir]), [[true, 0], [true, 0], [true, 1], [false, undefined]]);
  assert.equal(es[1].at, T0 + 5000);
});

test("partials are never hinted nor filled from last time", () => {
  const d = withWorkout([blank({ hw: "80", hr: "6" })]);
  d.active.exercises[0].sets[0].p = "3";
  A.addSet(d, 0);
  const s = d.active.exercises[0].sets[1];
  assert.equal(s.hp, undefined);
  A.toggleSet(d, 0, 1, T0 + 1000);
  assert.equal(s.p, "");
});
