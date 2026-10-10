// Strength domain logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { setLabels, normalizeGroups, stats, makeBodyWeightAt, restBefore, fmtSets, setColumns, restShown, rirShown } from "../../src/model/workout.js";
import { closeStaleWorkout } from "../../src/model/workoutActions.js";

test("set labels and group normalization", () => {
  const ss = [{}, { g: "a" }, { g: "a" }, { g: "b" }, {}];
  normalizeGroups(ss);
  assert.equal(ss[3].g, undefined);
  assert.deepEqual(setLabels(ss), ["1", "2a", "2b", "3", "4"]);
  assert.deepEqual(setLabels([{ t: "w" }, {}, {}]), ["", "1", "2"]); // warm-ups aren't numbered
});

test("starting sets: last time's warm-ups come on top of the planned working sets", async () => {
  const { buildSets } = await import("../../src/model/workout.js");
  const d = { workouts: [{ startedAt: 1, exercises: [{ exerciseId: "sq", sets: [
    { w: "40", r: "10", t: "w", done: true }, { w: "100", r: "5", done: true }, { w: "100", r: "5", done: true }, { w: "100", r: "4", done: true },
  ] }] }] };
  const s = buildSets(d, "sq", 3);
  assert.deepEqual(s.map((x) => [x.t, x.hw, x.hr]), [["w", "40", "10"], ["", "100", "5"], ["", "100", "5"], ["", "100", "4"]]);
  assert.equal(buildSets(d, "sq", 4).filter((x) => x.t !== "w").length, 4);
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

test("columns: rest and RIR are never real columns (they live in ✓), w/r always on", () => {
  assert.deepEqual(setColumns({ columns: [{ key: "rir", on: true }, { key: "w", on: false }, { key: "rest", on: true }] }), ["w", "r"]); // partials are opt-in
  assert.equal(rirShown({}), false); // RIR is opt-in
  assert.equal(rirShown({ columns: [{ key: "rir", on: true }] }), true);
  assert.equal(restShown({}), true); // the rest stopwatch in ✓ is on until turned off
  assert.equal(restShown({ columns: [{ key: "rest", on: false }] }), false);
});

test("formatting of sets", () => {
  assert.equal(fmtSets([{ w: "80", r: "6", rir: 0, g: "a" }, { w: "60", r: "6", g: "a" }, { w: "40", r: "10", t: "w" }], "reps"), "80×6 отказ → 60×6, разм. 40×10");
});

test("estimated 1RM, records and the previous session", async () => {
  const { e1rm, recordSets, bestE1rm, previousSession } = await import("../../src/model/records.js");
  assert.equal(e1rm(100, 1), 100);
  assert.equal(Math.round(e1rm(100, 10)), 133);
  assert.equal(e1rm(100, 20), null);
  const sq = { id: "sq", kind: "reps" };
  const bw = () => 80;
  const workouts = [
    { startedAt: 1, exercises: [{ exerciseId: "sq", sets: [{ w: "100", r: "5", done: true }] }] },
    { startedAt: 2, exercises: [{ exerciseId: "sq", sets: [{ w: "90", r: "5", done: true }] }] },
  ];
  const best = bestE1rm(workouts, "sq", sq, bw);
  assert.equal(Math.round(best), 117);
  assert.equal(previousSession(workouts, "sq", 2).workout.startedAt, 1);
  const today = [{ w: "100", r: "6", done: true }, { w: "100", r: "6", done: true }, { w: "60", r: "10", t: "w", done: true }, { w: "105", r: "6", done: true }];
  assert.deepEqual([...recordSets(today, sq, 80, best)], [0, 3]);
  assert.deepEqual([...recordSets(today, sq, 80, null)], [], "first time: no records");
  const { sessionProgress } = await import("../../src/model/records.js");
  const w3 = { startedAt: 3, exercises: [{ exerciseId: "sq", sets: [{ w: "95", r: "5", done: true }] }] };
  assert.ok(Math.abs(sessionProgress([...workouts, w3], w3, w3.exercises[0], sq, bw).delta - 5 * (1 + 5 / 30)) < 1e-9); // +5 kg × (1 + 5/30)
  const w4 = { startedAt: 4, exercises: [{ exerciseId: "sq", sets: [{ w: "110", r: "5", done: true }] }] };
  assert.deepEqual(sessionProgress([...workouts, w4], w4, w4.exercises[0], sq, bw), { record: true });
  assert.equal(sessionProgress(workouts, workouts[0], workouts[0].exercises[0], sq, bw), null); // nothing before
});

test("an exercise's sessions newest first; the previous workout of the same program", async () => {
  const { exerciseSessions, previousOfProgram } = await import("../../src/model/workout.js");
  const ws = [
    { id: "1", programId: "p", startedAt: 1, exercises: [{ exerciseId: "squat", sets: [1] }] },
    { id: "2", programId: "q", startedAt: 2, exercises: [] },
    { id: "3", programId: "p", startedAt: 3, exercises: [{ exerciseId: "squat", sets: [3] }] },
  ];
  assert.deepEqual(exerciseSessions(ws, "squat").map((x) => x.w.id), ["3", "1"]);
  assert.equal(previousOfProgram(ws, ws[2]).id, "1");
  assert.equal(previousOfProgram(ws, ws[0]), null);
});
