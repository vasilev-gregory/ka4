// History periods (week / month / year) and an exercise's progress over time: ranges, summaries, chart series.
import { DAY, num, weekStartOf } from "../core/util.js";
import { setLoad, stats, weekAnalysis } from "./workout.js";
import { sessionE1rm } from "./records.js";
import { PARTIAL_WEIGHT } from "./catalog.js";

// The period of the given zoom containing `ts`: { from, to } (to exclusive), local calendar boundaries.
export function periodOf(zoom, ts) {
  const d = new Date(ts);
  if (zoom === "week") { const from = weekStartOf(ts); return { from, to: weekStartOf(from + 8 * DAY) }; }
  if (zoom === "month") return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() };
  return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: new Date(d.getFullYear() + 1, 0, 1).getTime() };
}

// start of the period k periods away from the one containing ts
export function shiftPeriod(zoom, ts, k) {
  const d = new Date(periodOf(zoom, ts).from);
  if (zoom === "week") return weekStartOf(d.getTime() + k * 7 * DAY + 3 * DAY); // mid-week: DST-safe
  if (zoom === "month") return new Date(d.getFullYear(), d.getMonth() + k, 1).getTime();
  return new Date(d.getFullYear() + k, 0, 1).getTime();
}

export const inPeriod = (workouts, { from, to }) => workouts.filter((w) => w.startedAt >= from && w.startedAt < to);

// A month or a year at a glance: workouts, volume, sets, and hard sets per muscle group averaged over
// the weeks of the period that have already started (weeks: how many; perWeek: group -> { sets, freq }).
export function periodSummary(workouts, exMap, bwAt, range, now = Date.now()) {
  const list = inPeriod(workouts, range);
  let vol = 0, sets = 0;
  list.forEach((w) => { const st = stats(w, exMap, bwAt); vol += st.vol; sets += st.sets; });
  const groups = {};
  let weeks = 0;
  for (let ws = weekStartOf(range.from); ws < range.to && ws <= now; ws = weekStartOf(ws + 8 * DAY)) {
    weeks++;
    const an = weekAnalysis(list, exMap, ws);
    Object.entries(an.groups).forEach(([g, p]) => {
      const t = groups[g] || (groups[g] = { sets: 0, freq: 0 });
      t.sets += p.sets;
      t.freq += p.days.size;
    });
  }
  const avg = (n) => Math.round((n / Math.max(1, weeks)) * 10) / 10;
  const perWeek = {};
  Object.entries(groups).forEach(([g, t]) => { perWeek[g] = { sets: avg(t.sets), freq: avg(t.freq) }; });
  const days = new Set(list.map((w) => new Date(w.startedAt).toDateString())).size;
  return { workouts: list.length, days, vol, sets, weeks, perWeek };
}

// Exercise progress, one point per session: { t, v }. metric: "max" (heaviest working set; seconds for
// timed exercises), "e1rm" (best estimated 1RM), "vol" (load × reps of the working sets, partials 30%).
// since: only sessions from then on. Sessions without a value for the metric are left out.
export function exerciseSeries(workouts, exId, ex, bwAt, metric, since = -Infinity) {
  const out = [];
  workouts.forEach((w) => {
    if (w.startedAt < since) return;
    const e = w.exercises.find((x) => x.exerciseId === exId);
    if (!e) return;
    const bw = bwAt(w.startedAt);
    const work = e.sets.filter((s) => s.done !== false && s.t !== "w");
    let v = null;
    if (metric === "e1rm") v = sessionE1rm(e.sets, ex, bw);
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
