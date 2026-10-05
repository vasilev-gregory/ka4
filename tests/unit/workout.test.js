// Strength domain logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { setLabels, normalizeGroups, stats, makeBodyWeightAt, restBefore, closeStaleWorkout, fmtSets, setColumns, weekAnalysis } from "../../src/model/workout.js";
import { weekStartOf } from "../../src/core/util.js";

test("set labels and group normalization", () => {
  const ss = [{}, { g: "a" }, { g: "a" }, { g: "b" }, {}];
  normalizeGroups(ss);
  assert.equal(ss[3].g, undefined);
  assert.deepEqual(setLabels(ss), ["1", "2a", "2b", "3", "4"]);
});

test("volume: partials 30%, warm-ups excluded, drop set = one set, bodyweight share", () => {
  const exMap = { pu: { id: "pu", kind: "reps", bw: 1 }, sq: { id: "sq", kind: "reps" } };
  const w = { startedAt: Date.now(), exercises: [
    { exerciseId: "sq", sets: [{ w: "40", r: "10", t: "w", done: true }, { w: "100", r: "10", p: "5", done: true, g: "x" }, { w: "80", r: "5", done: true, g: "x" }] },
    { exerciseId: "pu", sets: [{ w: "", r: "10", done: true }] },
  ] };
  const st = stats(w, exMap, makeBodyWeightAt([{ date: Date.now(), values: { weight: "80" } }], 0));
  assert.equal(st.sets, 2);
  assert.equal(Math.round(st.vol), 100 * 11.5 + 80 * 5 + 80 * 10);
});

test("body weight: latest same-day entry wins, fallback when none", () => {
  const t = new Date(2026, 9, 5, 12).getTime();
  const at = makeBodyWeightAt([{ date: t, values: { weight: "70" } }, { date: t, values: { weight: "85" } }], 60);
  assert.equal(at(t), 85);
  assert.equal(makeBodyWeightAt([], 60)(t), 60);
});

test("rest before set skips drop steps and pauses", () => {
  const w = { startedAt: 0, segments: [{ start: 0, end: 50 }, { start: 100 }], exercises: [
    { exerciseId: "a", sets: [{ done: true, at: 10 }, { done: true, at: 40, g: "z" }, { done: true, at: 45, g: "z" }, { done: true, at: 120 }] },
  ] };
  const r = restBefore(w);
  assert.equal(r["0:1"], 30); assert.equal(r["0:2"], "drop"); assert.equal(r["0:3"], undefined);
});

test("paused workout from yesterday gets closed on load", () => {
  const d = seed();
  const y = Date.now() - 864e5 * 1.2;
  d.active = { id: "a", programId: d.programs[0].id, name: "x", startedAt: y, paused: true, segments: [{ start: y, end: y + 1000 }],
    exercises: [{ exerciseId: "squat", sets: [{ w: "1", r: "1", done: true }] }] };
  const out = closeStaleWorkout(d);
  assert.equal(out.active, null); assert.equal(out.workouts.length, 1); assert.ok(out.pendingProgramUpdate);
});

test("running workout abandoned since yesterday ends at its last set", () => {
  const mk = (start, lastSet) => {
    const d = seed();
    d.active = { id: "a", programId: null, name: "x", startedAt: start, paused: false, segments: [{ start }],
      exercises: [{ exerciseId: "squat", sets: [{ w: "1", r: "1", done: true, at: lastSet }, { w: "", r: "", done: false }] }] };
    return d;
  };
  const start = new Date(2026, 4, 9, 19, 0).getTime(), lastSet = start + 40 * 60e3;
  const out = closeStaleWorkout(mk(start, lastSet), new Date(2026, 4, 10, 9, 0).getTime());
  assert.equal(out.active, null);
  const w = out.workouts[0];
  assert.equal(w.finishedAt, lastSet); assert.equal(w.segments[0].end, lastSet); assert.equal(w.exercises[0].sets.length, 1);
  // same day, hours later: still running
  const d1 = mk(start, lastSet);
  assert.equal(closeStaleWorkout(d1, new Date(2026, 4, 9, 23, 0).getTime()), d1);
  // past midnight but only a short while after the last set: still the same workout
  const d2 = mk(new Date(2026, 4, 9, 23, 0).getTime(), new Date(2026, 4, 9, 23, 50).getTime());
  assert.equal(closeStaleWorkout(d2, new Date(2026, 4, 10, 0, 30).getTime()), d2);
});

test("columns: rest is never a real column, w/r always on", () => {
  assert.deepEqual(setColumns({ columns: [{ key: "rir", on: true }, { key: "w", on: false }, { key: "rest", on: true }] }), ["rir", "w", "r", "p"]);
});

test("formatting of sets", () => {
  assert.equal(fmtSets([{ w: "80", r: "6", rir: 0, g: "a" }, { w: "60", r: "6", g: "a" }, { w: "40", r: "10", t: "w" }], "reps"), "80×6 отказ → 60×6, разм. 40×10");
});

test("weekly analysis counts hard sets and days", () => {
  const exMap = { sq: { id: "sq", group: "ноги" } };
  const now = Date.now();
  const an = weekAnalysis([{ startedAt: now, exercises: [{ exerciseId: "sq", sets: [{ done: true }, { done: true, rir: 4 }, { done: true, t: "w" }] }] }], exMap, weekStartOf(now));
  assert.equal(an.groups["ноги"].sets, 1); assert.equal(an.days, 1);
});
