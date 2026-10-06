// Strength over time: a month's / year's summary and an exercise's progress series for its chart.
// The calendar itself (periods, paging, weekly averages) is in calendar.js.
import { num } from "../core/util.js";
import { averageWeeks, inPeriod } from "./calendar.js";
import { counts, setLoad, stats } from "./workout.js";
import { weekLoad } from "./muscles.js";
import { sessionE1rm } from "./records.js";
import { PARTIAL_WEIGHT } from "./catalog.js";
import { workoutKcal } from "./energy.js";

// A month or a year at a glance: workouts, volume, sets, cardio minutes, kcal (estimate), and hard sets per muscle
// averaged over the weeks of the period that have already started (weeks: how many; perWeek: muscle -> { sets, freq, by });
// by (exerciseId -> sets) is the whole period's, not averaged.
export function periodSummary(workouts, exMap, bwAt, range, now = Date.now()) {
  const list = inPeriod(workouts, range);
  let vol = 0, sets = 0, cardioMin = 0, cardioKm = 0, kcal = 0;
  list.forEach((w) => {
    const st = stats(w, exMap, bwAt);
    vol += st.vol; sets += st.sets; cardioMin += st.cardioMin; cardioKm += st.cardioKm;
    kcal += workoutKcal(w, exMap, bwAt, now) || 0;
  });
  const { weeks, perWeek } = averageWeeks(range, now, (ws) => weekLoad(list, exMap, ws).muscles);
  const days = new Set(list.map((w) => new Date(w.startedAt).toDateString())).size;
  return { workouts: list.length, days, vol, sets, cardioMin, cardioKm, kcal, weeks, perWeek };
}

// Exercise progress, one point per session: { t, v }. metric: "max" (heaviest working set; seconds for
// timed exercises), "e1rm" (best estimated 1RM), "vol" (load × reps of the working sets, partials 30%).
// Cardio: "max" = minutes, "vol" = km of the session.
// since: only sessions from then on. Sessions without a value for the metric, and workouts «не в зачёт», are left out.
export function exerciseSeries(workouts, exId, ex, bwAt, metric, since = -Infinity) {
  const out = [];
  workouts.forEach((w) => {
    if (w.startedAt < since || !counts(w)) return;
    const e = w.exercises.find((x) => x.exerciseId === exId);
    if (!e) return;
    const bw = bwAt(w.startedAt);
    const work = e.sets.filter((s) => s.done !== false && s.t !== "w");
    let v = null;
    if (ex.kind === "cardio") v = work.reduce((a, s) => a + num(metric === "vol" ? s.w : s.r), 0) || null; // minutes or km
    else if (metric === "e1rm") v = sessionE1rm(e.sets, ex, bw);
    else if (metric === "vol") v = ex.kind === "time" ? null : work.reduce((a, s) => a + setLoad(ex, s, bw) * (num(s.r) + PARTIAL_WEIGHT * num(s.p)), 0) || null;
    else if (work.length) v = Math.max(...work.map((s) => (ex.kind === "time" ? num(s.r) : setLoad(ex, s, bw))));
    if (v != null) out.push({ t: w.startedAt, v: Math.round(v * 10) / 10 });
  });
  return out;
}

// chart time windows, months back from now (0 = everything)
export const WINDOWS = [[3, "3 мес"], [6, "полгода"], [12, "год"], [0, "всё"]];

export function windowStart(months, now = Date.now()) {
  if (!months) return -Infinity;
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() - months, d.getDate()).getTime();
}
