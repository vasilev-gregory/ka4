// Calendar periods shared by every history (strength, stretching): week / month / year ranges, paging,
// and averaging a weekly load over the weeks of a period. Knows nothing of what is being counted.
import { DAY, weekStartOf } from "../core/util.js";

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

// workouts / sessions started within the range
export const inPeriod = (list, { from, to }) => list.filter((w) => w.startedAt >= from && w.startedAt < to);

// one calendar week from its Monday (an hour of slack for the DST switch)
export const weekEnd = (ws) => ws + 7 * DAY + 3600e3;

// A weekly load averaged over the weeks of the range that have already started.
// loadOfWeek(ws) -> { key: { numeric fields…, by: { id: n } } }. Returns { weeks, perWeek }: the numeric fields
// averaged (to 0.1), `by` summed over the whole range (what made up the load, not averaged).
export function averageWeeks(range, now, loadOfWeek) {
  const total = {};
  let weeks = 0;
  for (let ws = weekStartOf(range.from); ws < range.to && ws <= now; ws = weekStartOf(ws + 8 * DAY)) {
    weeks++;
    Object.entries(loadOfWeek(ws)).forEach(([k, p]) => {
      const t = total[k] || (total[k] = { by: {} });
      Object.entries(p).forEach(([f, v]) => {
        if (f === "by") Object.entries(v).forEach(([id, n]) => { t.by[id] = (t.by[id] || 0) + n; });
        else t[f] = (t[f] || 0) + v;
      });
    });
  }
  const avg = (n) => Math.round((n / Math.max(1, weeks)) * 10) / 10;
  const perWeek = {};
  Object.entries(total).forEach(([k, t]) => {
    perWeek[k] = Object.fromEntries(Object.entries(t).map(([f, v]) => [f, f === "by" ? v : avg(v)]));
  });
  return { weeks, perWeek };
}
