// Progressive overload watch: when an exercise has stalled, and what the next step is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStep, stepText } from "../../src/model/progression.js";
import { buildSets } from "../../src/model/workout.js";

const sq = { id: "squat", name: "Squat", kind: "reps", group: "ноги" }; // barbell: 2.5 kg steps
const raise = { id: "lateral-raise", name: "Lateral raise", ru: "Махи гантелями в стороны", kind: "reps", group: "плечи" }; // dumbbells: 2 kg
const w = (exId, kg, reps, extra = {}) => ({ startedAt: 0, ...extra, exercises: [{ exerciseId: exId, sets: reps.map((r) => ({ w: String(kg), r: String(r), done: true })) }] });

test("not stalled: too few sessions, or reps / weight growing", () => {
  assert.equal(nextStep([w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8])], sq), null);
  assert.equal(nextStep([w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8]), w("squat", 100, [9, 8, 8])], sq), null);
  assert.equal(nextStep([w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8]), w("squat", 102.5, [8, 8, 8])], sq), null);
});

test("stalled three times: reps up in the middle of the range, weight up at the top or for low reps", () => {
  const same = (kg, reps, ex = "squat") => [w(ex, kg, reps), w(ex, kg, reps), w(ex, kg, reps)];
  const mid = nextStep(same(100, [8, 8, 7]), sq);
  assert.deepEqual([mid.n, mid.w, mid.r, mid.next], [3, 100, 7, { w: 100, r: 8 }]);
  assert.deepEqual(nextStep(same(100, [12, 12, 12]), sq).next, { w: 102.5, r: 9 });
  assert.deepEqual(nextStep(same(140, [5, 5, 5]), sq).next, { w: 142.5, r: 5 });
  // light dumbbells: +2 kg is a big jump, so reps climb to 15 first
  assert.deepEqual(nextStep(same(8, [12, 12, 12], "lateral-raise"), raise).next, { w: 8, r: 13 });
  assert.deepEqual(nextStep(same(8, [15, 15, 15], "lateral-raise"), raise).next, { w: 10, r: 12 });
  assert.equal(stepText(mid, sq).was, "3 тренировки подряд 100 кг × 7");
  assert.equal(stepText(mid, sq).now, "100 кг × 8");
});

test("a bad day «не в зачёт» doesn't make or break a stall; assisted: less help", () => {
  const ws = [w("squat", 100, [8, 8, 8]), w("squat", 60, [5], { off: true }), w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8])];
  assert.equal(nextStep(ws, sq).n, 3);
  const grav = { id: "assisted-pull-up", name: "Assisted pull-up", kind: "reps", group: "спина", assist: true };
  const g = [w("assisted-pull-up", 30, [8]), w("assisted-pull-up", 30, [8]), w("assisted-pull-up", 30, [8])];
  assert.deepEqual(nextStep(g, grav).next, { w: 25, r: 8 });
});

test("a stalled exercise starts with the step in its hints", () => {
  const d = { workouts: [w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8]), w("squat", 100, [8, 8, 8])], exercises: [sq] };
  const sets = buildSets(d, "squat", 3, nextStep(d.workouts, sq).next);
  assert.deepEqual(sets.map((s) => [s.hw, s.hr]), [["100", "9"], ["100", "9"], ["100", "9"]]);
});
