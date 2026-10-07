// «Дневник тренировок» CSV export (diary.csv, ";"-separated). Header ДАТА;ИНФОРМАЦИЯ;УПРАЖНЕНИЕ;ПОДХОДЫ. A workout
// starts on a row with a date (DD.MM.YYYY) and a duration ("39 мин"); an exercise on a row with its name
// ("Жим лежа · штанга"), the rows under it with no name are its next sets. A set is two value;unit pairs:
// "60;кг;10;пвт" (weight, reps) or "60;сек;16;кг" (seconds, weight). A set of 0 reps was planned, not done.
// After a blank line comes МЕРА;ДАТА;ЗНАЧЕНИЕ;КОММЕНТАРИЙ — measurements, named as in our list (Вес, Талия, …).
// There is no start time: a workout is put at noon of its day.
import { MEASURES } from "../catalog.js";
import { parseCsv } from "./csv.js";

export const isDiary = (headers) => ["ДАТА", "УПРАЖНЕНИЕ", "ПОДХОДЫ"].every((h) => headers.includes(h));

const day = (s) => {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s || "");
  return m ? new Date(+m[3], +m[2] - 1, +m[1], 12).getTime() : null;
};
const n = (v) => { const x = parseFloat(String(v || "").replace(",", ".")); return Number.isFinite(x) ? x : null; };
const str = (x) => (x == null ? "" : String(Math.round(x * 100) / 100));
// "Жим лежа · штанга" → "Жим лежа (штанга)", the way our aliases write equipment
const exName = (s) => s.replace(/\s*·\s*(.+)$/, " ($1)");
const MEASURE = Object.fromEntries(MEASURES.map(([id, name]) => [name.toLowerCase(), id]));

// one set from its two value;unit pairs: { w, r, time } or null (nothing done)
function setOf(cells) {
  const set = { w: "", r: "", time: false };
  [[cells[3], cells[4]], [cells[5], cells[6]]].forEach(([v, unit]) => {
    const x = n(v), u = (unit || "").toLowerCase();
    if (x == null) return;
    if (u === "кг") set.w = str(x);
    else if (u === "сек") { set.r = str(x); set.time = true; }
    else set.r = str(x); // пвт, раз
  });
  return n(set.r) > 0 ? set : null;
}

// -> { workouts: [{ name, startedAt, finishedAt, exercises: [{ name, time, sets }] }], measurements: [{ date, values }] }
export function parseDiary(text) {
  const { cells } = parseCsv(text);
  const workouts = [], measurements = new Map();
  let w = null, ex = null, measures = false;
  cells.forEach((c) => {
    if (c[0] === "МЕРА") { measures = true; return; }
    if (measures) {
      const key = MEASURE[(c[0] || "").toLowerCase()], t = day(c[1]);
      if (!key || t == null || n(c[2]) == null) return;
      const m = measurements.get(t) || { date: t, values: {} };
      m.values[key] = str(n(c[2]));
      measurements.set(t, m);
      return;
    }
    const t = day(c[0]);
    if (t != null) {
      w = { name: "Тренировка", startedAt: t, finishedAt: t + (n(c[1]) || 0) * 60e3, exercises: [] };
      workouts.push(w);
      ex = null;
    }
    if (!w) return;
    if (c[2]) {
      ex = { name: exName(c[2]), time: false, sets: [] };
      w.exercises.push(ex);
    }
    const set = ex && setOf(c);
    if (!set) return;
    if (set.time) ex.time = true;
    ex.sets.push({ w: set.w, r: set.r });
  });
  workouts.forEach((x) => { x.exercises = x.exercises.filter((e) => e.sets.length); });
  return { workouts: workouts.filter((x) => x.exercises.length), measurements: [...measurements.values()] };
}
