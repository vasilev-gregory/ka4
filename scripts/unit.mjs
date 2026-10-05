// Unit checks for the pure model layer (no browser). Run: node scripts/unit.mjs
import assert from "node:assert/strict";
import { seed, migrate, SCHEMA_VERSION } from "../src/model/state.js";
import { setLabels, normalizeGroups, stats, makeBodyWeightAt, restBefore, closeStaleWorkout, fmtSets, setColumns, weekAnalysis } from "../src/model/workout.js";
import { buildTimeline, stExMap } from "../src/model/stretch.js";
import { weekStartOf } from "../src/core/util.js";

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok", name); };

ok("migrate is idempotent and fills new fields", () => {
  const d = migrate(seed());
  const again = migrate(structuredClone(d));
  assert.deepEqual(again, d);
  assert.ok(d.stretch && Array.isArray(d.measurements));
  assert.equal(seed().version, SCHEMA_VERSION); assert.equal(d.version, SCHEMA_VERSION);
});

ok("old nested drops become linear grouped sets", () => {
  const d = seed();
  d.workouts.push({ id: "w", startedAt: 1, finishedAt: 2, exercises: [{ exerciseId: "squat", sets: [{ w: "80", r: "6", done: true, drops: [{ w: "60", r: "6" }] }] }] });
  const m = migrate(d);
  const ss = m.workouts[0].exercises[0].sets;
  assert.equal(ss.length, 2); assert.ok(ss[0].g && ss[0].g === ss[1].g); assert.equal(ss[0].drops, undefined);
});

ok("set labels and group normalization", () => {
  const ss = [{}, { g: "a" }, { g: "a" }, { g: "b" }, {}];
  normalizeGroups(ss);
  assert.equal(ss[3].g, undefined);
  assert.deepEqual(setLabels(ss), ["1", "2a", "2b", "3", "4"]);
});

ok("volume: partials 30%, warm-ups excluded, drop set = one set, bodyweight share", () => {
  const exMap = { pu: { id: "pu", kind: "reps", bw: 1 }, sq: { id: "sq", kind: "reps" } };
  const w = { startedAt: Date.now(), exercises: [
    { exerciseId: "sq", sets: [{ w: "40", r: "10", t: "w", done: true }, { w: "100", r: "10", p: "5", done: true, g: "x" }, { w: "80", r: "5", done: true, g: "x" }] },
    { exerciseId: "pu", sets: [{ w: "", r: "10", done: true }] },
  ] };
  const st = stats(w, exMap, makeBodyWeightAt([{ date: Date.now(), values: { weight: "80" } }], 0));
  assert.equal(st.sets, 2);
  assert.equal(Math.round(st.vol), 100 * 11.5 + 80 * 5 + 80 * 10);
});

ok("body weight: latest same-day entry wins, fallback when none", () => {
  const t = new Date(2026, 9, 5, 12).getTime();
  const at = makeBodyWeightAt([{ date: t, values: { weight: "70" } }, { date: t, values: { weight: "85" } }], 60);
  assert.equal(at(t), 85);
  assert.equal(makeBodyWeightAt([], 60)(t), 60);
});

ok("rest before set skips drop steps and pauses", () => {
  const w = { startedAt: 0, segments: [{ start: 0, end: 50 }, { start: 100 }], exercises: [
    { exerciseId: "a", sets: [{ done: true, at: 10 }, { done: true, at: 40, g: "z" }, { done: true, at: 45, g: "z" }, { done: true, at: 120 }] },
  ] };
  const r = restBefore(w);
  assert.equal(r["0:1"], 30); assert.equal(r["0:2"], "drop"); assert.equal(r["0:3"], undefined);
});

ok("paused workout from yesterday gets closed on load", () => {
  const d = seed();
  const y = Date.now() - 864e5 * 1.2;
  d.active = { id: "a", programId: d.programs[0].id, name: "x", startedAt: y, paused: true, segments: [{ start: y, end: y + 1000 }],
    exercises: [{ exerciseId: "squat", sets: [{ w: "1", r: "1", done: true }] }] };
  const out = closeStaleWorkout(d);
  assert.equal(out.active, null); assert.equal(out.workouts.length, 1); assert.ok(out.pendingProgramUpdate);
});

ok("running workout abandoned since yesterday ends at its last set", () => {
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

ok("columns: rest is never a real column, w/r always on", () => {
  assert.deepEqual(setColumns({ columns: [{ key: "rir", on: true }, { key: "w", on: false }, { key: "rest", on: true }] }), ["rir", "w", "r", "p"]);
});

ok("formatting of sets", () => {
  assert.equal(fmtSets([{ w: "80", r: "6", rir: 0, g: "a" }, { w: "60", r: "6", g: "a" }, { w: "40", r: "10", t: "w" }], "reps"), "80×6 отказ → 60×6, разм. 40×10");
});

ok("weekly analysis counts hard sets and days", () => {
  const exMap = { sq: { id: "sq", group: "ноги" } };
  const now = Date.now();
  const an = weekAnalysis([{ startedAt: now, exercises: [{ exerciseId: "sq", sets: [{ done: true }, { done: true, rir: 4 }, { done: true, t: "w" }] }] }], exMap, weekStartOf(now));
  assert.equal(an.groups["ноги"].sets, 1); assert.equal(an.days, 1);
});

ok("stretch timeline: circuit, sides, no trailing rest, prep each round", () => {
  const d = seed();
  const p = { timing: { prep: 10, work: 30, sw: 5, rest: 15, rounds: 2, roundRest: 60, mode: "circuit" },
    items: [{ exerciseId: "st-figure-four" }, { exerciseId: "st-pizza" }] };
  const tl = buildTimeline(p, stExMap(d));
  assert.deepEqual(tl.map((x) => x.k).join(","),
    "prep,work,switch,work,rest,prep,work,roundRest,prep,work,switch,work,rest,prep,work");
});

ok("built-in stretch renamed only if the user kept the old name", () => {
  const d = seed();
  d.stretch.exercises.find((e) => e.id === "st-pizza").name = "Pizza";
  d.stretch.exercises.find((e) => e.id === "st-lat").name = "Моя широчайшая";
  const m = migrate(d);
  assert.match(m.stretch.exercises.find((e) => e.id === "st-pizza").name, /straddle/);
  assert.equal(m.stretch.exercises.find((e) => e.id === "st-lat").name, "Моя широчайшая");
});

ok("duplicate stretches in a program are merged", () => {
  const d = seed();
  d.stretch.programs.push({ id: "p", name: "x", items: [{ exerciseId: "st-pizza" }, { exerciseId: "st-lat" }, { exerciseId: "st-pizza" }] });
  assert.deepEqual(migrate(d).stretch.programs[0].items.map((i) => i.exerciseId), ["st-pizza", "st-lat"]);
});

console.log(n, "unit checks passed");
