// A workout as text, and the running one as its card would show it now.
import { test } from "node:test";
import assert from "node:assert/strict";
import { workoutSoFar } from "../../src/model/workout.js";
import { workoutText } from "../../src/model/workoutText.js";

const T = new Date(2026, 9, 7, 7, 0).getTime();
const exMap = { squat: { id: "squat", name: "Squat", ru: "Приседания со штангой", kind: "reps", group: "ноги" } };
const nameOf = (ex) => ex.ru || ex.name;
const running = {
  id: "a", name: "Ноги", programId: null, startedAt: T, segments: [{ start: T }], warmup: { doneAt: T + 5 * 60e3 },
  exercises: [{ exerciseId: "squat", sets: [
    { w: "60", r: "10", p: "", done: true, rir: 2, at: T + 8 * 60e3 },
    { w: "60", r: "8", p: "2", done: true, rir: 0, at: T + 11 * 60e3, g: "x" },
    { w: "40", r: "6", p: "", done: true, rir: 0, at: T + 11.5 * 60e3, g: "x" },
    { w: "60", r: "", p: "", done: false },
  ] }],
};

test("so far: ticked sets only, the time up to now", () => {
  const w = workoutSoFar(running, T + 20 * 60e3);
  assert.equal(w.exercises[0].sets.length, 3);
  assert.equal(w.finishedAt, T + 20 * 60e3);
  assert.equal(w.segments[0].end, T + 20 * 60e3);
  assert.equal(running.segments[0].end, undefined); // the running workout itself is untouched
});

test("as text: every set with its time and rest, drops marked, muscles of the workout and the week", () => {
  const w = workoutSoFar(running, T + 20 * 60e3);
  const t = workoutText({ workouts: [] }, w, exMap, () => 80, nameOf, true);
  assert.match(t, /^Тренировка «Ноги» — .*07:00–07:20 \(идёт\)/);
  assert.match(t, /1\. Приседания со штангой \(Squat\) — квадрицепс; помогают: ягодицы/);
  assert.match(t, /1\) 60 кг × 10, RIR 2 · 07:08 · отдых 3:00/);
  assert.match(t, /2a\) 60 кг × 8 \+ 2 частичных, отказ · 07:11 · отдых 3:00/);
  assert.match(t, /2b\) 40 кг × 6, отказ · 07:11 · дроп/);
  assert.match(t, /Мышцы за тренировку[^\n]*\n\s+квадрицепс: 2 подх\. — в работе/);
  assert.match(t, /Мышцы за неделю[^\n]*\n\s+квадрицепс: 2 подх\. · 1 раз — пока мало[^\n]*\n\s+ягодицы: 1 подх\. — пока мало/);
});
