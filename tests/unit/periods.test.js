// History periods and exercise progress series.
import { test } from "node:test";
import assert from "node:assert/strict";
import { exerciseSeries, periodOf, periodSummary, shiftPeriod, windowStart } from "../../src/model/periods.js";

const at = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();
const bwAt = () => 80;

test("periods: week from Monday, month and year by the calendar, shifting across boundaries", () => {
  const t = at(2026, 9, 7); // Wed 7 Oct 2026
  assert.deepEqual(periodOf("week", t), { from: at(2026, 9, 5, 0), to: at(2026, 9, 12, 0) });
  assert.deepEqual(periodOf("month", t), { from: at(2026, 9, 1, 0), to: at(2026, 10, 1, 0) });
  assert.deepEqual(periodOf("year", t), { from: at(2026, 0, 1, 0), to: at(2027, 0, 1, 0) });
  assert.equal(shiftPeriod("week", t, -1), at(2026, 8, 28, 0));
  assert.equal(shiftPeriod("week", at(2026, 2, 30), -1), at(2026, 2, 23, 0)); // over the DST switch
  assert.equal(shiftPeriod("month", at(2026, 0, 31), 1), at(2026, 1, 1, 0));
  assert.equal(shiftPeriod("year", t, -1), at(2025, 0, 1, 0));
});

test("period summary: workouts, sets and hard sets per group per started week", () => {
  const exMap = { sq: { id: "squat", kind: "reps", group: "ноги" } };
  const w = (t, n) => ({ startedAt: t, segments: [{ start: t, end: t + 3600e3 }], exercises: [{ exerciseId: "sq", sets: Array.from({ length: n }, () => ({ w: "100", r: "5", done: true })) }] });
  const workouts = [w(at(2026, 8, 30), 9), w(at(2026, 9, 2), 4), w(at(2026, 9, 6), 6)];
  const s = periodSummary(workouts, exMap, bwAt, periodOf("month", at(2026, 9, 1)), at(2026, 9, 7));
  assert.equal(s.workouts, 2);
  assert.equal(s.sets, 10);
  assert.equal(s.vol, 10 * 500);
  assert.equal(s.weeks, 2); // weeks of 28 Sep and 5 Oct; the rest of October has not started yet
  assert.deepEqual(s.perWeek.quads, { sets: 5, freq: 1, by: { sq: 10 } }); // by: the whole period's sets per exercise
  assert.deepEqual(s.perWeek.glutes, { sets: 2.5, freq: 0, by: { sq: 5 } }); // helping muscle: half a set, no session
  assert.equal(s.days, 2);
});

test("exercise series: max, estimated 1RM, volume; warm-ups out; window", () => {
  const ex = { id: "sq", kind: "reps" };
  const workouts = [
    { startedAt: at(2026, 0, 10), exercises: [{ exerciseId: "sq", sets: [{ w: "120", r: "1", t: "w", done: true }, { w: "100", r: "5", done: true }] }] },
    { startedAt: at(2026, 5, 10), exercises: [{ exerciseId: "sq", sets: [{ w: "110", r: "3", done: true }, { w: "100", r: "8", p: "1", done: true }] }] },
  ];
  assert.deepEqual(exerciseSeries(workouts, "sq", ex, bwAt, "max").map((p) => p.v), [100, 110]);
  assert.deepEqual(exerciseSeries(workouts, "sq", ex, bwAt, "e1rm").map((p) => p.v), [116.7, 126.7]);
  assert.deepEqual(exerciseSeries(workouts, "sq", ex, bwAt, "vol").map((p) => p.v), [500, 330 + 830]);
  assert.equal(exerciseSeries(workouts, "sq", ex, bwAt, "max", windowStart(6, at(2026, 9, 5))).length, 1);
  assert.equal(windowStart(0), -Infinity);
  assert.deepEqual(exerciseSeries(workouts, "sq", { id: "sq", kind: "time" }, bwAt, "e1rm"), []);
});
