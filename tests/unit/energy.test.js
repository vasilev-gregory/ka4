// Calories and cardio: MET estimates, speed / pace formulas, cardio kept out of strength numbers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardioKcal, workoutKcal } from "../../src/model/energy.js";
import { fmtSets, stats, weekAnalysis } from "../../src/model/workout.js";
import { sessionE1rm } from "../../src/model/records.js";
import { exerciseSeries } from "../../src/model/periods.js";
import { seed } from "../../src/model/state.js";
import { addExercises, startWorkout, toggleSet } from "../../src/model/workoutActions.js";

const ex = (id) => seed().exercises.find((e) => e.id === id);
const t0 = new Date(2026, 9, 5, 18).getTime();

test("cardio kcal: table MET, running by speed, rowing by pace, typos ignored, no body weight", () => {
  assert.equal(Math.round(cardioKcal(ex("elliptical"), { r: "30", w: "" }, 80)), 200); // 5 MET × 80 kg × 0.5 h
  // 10 km/h: ACSM running VO2 = 3.5 + 0.2 × 166.7 = 36.8 ml/kg/min ≈ 10.5 MET
  assert.equal(Math.round(cardioKcal(ex("treadmill-run"), { r: "30", w: "5" }, 80)), 421);
  assert.equal(Math.round(cardioKcal(ex("treadmill-run"), { r: "30", w: "50" }, 80)), 392); // 100 km/h: table MET 9.8
  // 2000 m in 8 min: 2:00 / 500 m ≈ 203 W → (4 × 203 + 300) kcal/h
  assert.equal(Math.round(cardioKcal(ex("rowing-machine"), { r: "8", w: "2" }, 80)), 148);
  assert.equal(cardioKcal(ex("elliptical"), { r: "30", w: "" }, 0), null);
  assert.equal(cardioKcal({ id: "own", kind: "cardio" }, { r: "60" }, 70), 420); // own cardio: 6 MET
});

test("workout kcal: strength time at 3.5 MET minus cardio minutes; only-cardio workout", () => {
  const exMap = { squat: ex("squat"), elliptical: ex("elliptical") };
  const w = { startedAt: t0, segments: [{ start: t0, end: t0 + 3600e3 }], exercises: [
    { exerciseId: "squat", sets: [{ w: "100", r: "5", done: true }] },
    { exerciseId: "elliptical", sets: [{ w: "", r: "15", done: true }] },
  ] };
  assert.equal(workoutKcal(w, exMap, () => 80), Math.round(100 + (3.5 * 80 * 45) / 60));
  assert.equal(workoutKcal(w, exMap, () => 0), null);
  const cardioOnly = { ...w, exercises: [w.exercises[1]] };
  assert.equal(workoutKcal(cardioOnly, exMap, () => 80), 100); // waiting around isn't counted
});

test("cardio stays out of volume, sets, weekly groups and records; has its own totals and series", () => {
  const exMap = { squat: ex("squat"), run: { ...ex("running"), id: "run" } };
  const w = { startedAt: t0, segments: [{ start: t0, end: t0 + 3600e3 }], exercises: [
    { exerciseId: "squat", sets: [{ w: "100", r: "5", done: true }] },
    { exerciseId: "run", sets: [{ w: "5", r: "30", done: true }, { w: "2,5", r: "15", done: true }] },
  ] };
  const st = stats(w, exMap, () => 80);
  assert.equal(st.vol, 500);
  assert.equal(st.sets, 1);
  assert.equal(st.cardioMin, 45);
  assert.equal(st.cardioKm, 7.5);
  assert.equal(Object.keys(weekAnalysis([w], exMap, t0 - 86400e3).groups).join(), "ноги");
  assert.equal(sessionE1rm(w.exercises[1].sets, exMap.run, 80), null);
  assert.equal(fmtSets(w.exercises[1].sets, "cardio"), "30 мин · 5 км, 15 мин · 2,5 км");
  assert.deepEqual(exerciseSeries([w], "run", exMap.run, () => 80, "max").map((p) => p.v), [45]);
  assert.deepEqual(exerciseSeries([w], "run", exMap.run, () => 80, "vol").map((p) => p.v), [7.5]);
});

test("cardio in a workout: one stretch when added, no rest countdown after it", () => {
  const d = seed();
  startWorkout(d, null, t0);
  addExercises(d, [ex("elliptical"), ex("squat")]);
  assert.equal(d.active.exercises[0].sets.length, 1);
  assert.equal(d.active.exercises[1].sets.length, 3);
  d.active.exercises[0].sets[0].r = "20";
  toggleSet(d, 0, 0, t0 + 60e3);
  assert.equal(d.active.restEndsAt, null);
  toggleSet(d, 1, 0, t0 + 120e3);
  assert.ok(d.active.restEndsAt > t0);
});
