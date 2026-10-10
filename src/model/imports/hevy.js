// Hevy workouts export (CSV, one row per set). Columns: title, start_time, end_time, exercise_title,
// set_index, set_type (normal / warmup / dropset / failure), weight_kg or weight_lbs, reps,
// duration_seconds, rpe. Dates like "26 Jan 2024, 18:45" or "3 окт. 2026, 11:35" (local time), or ISO.
import { parseCsv } from "./csv.js";
import { str } from "./fields.js";

// month names as Hevy writes them in English and Russian exports ("Jan", "сент.", "мая")
const MONTHS = [["jan", "янв"], ["feb", "фев"], ["mar", "мар"], ["apr", "апр"], ["may", "ма"], ["jun", "июн"],
  ["jul", "июл"], ["aug", "авг"], ["sep", "сен"], ["oct", "окт"], ["nov", "ноя"], ["dec", "дек"]];
const monthOf = (word) => {
  const w = word.toLowerCase();
  return MONTHS.findIndex((names) => names.some((m) => w.startsWith(m)));
};
const LBS = 0.45359237;

export function isHevy(headers) {
  return ["title", "start_time", "exercise_title", "set_type"].every((h) => headers.includes(h));
}

export function parseHevyDate(s) {
  const m = /^(\d{1,2}) ([A-Za-zА-Яа-яёЁ]+)\.? (\d{4}),? (\d{1,2}):(\d{2})/.exec(s || "");
  if (m && monthOf(m[2]) >= 0) return new Date(+m[3], monthOf(m[2]), +m[1], +m[4], +m[5]).getTime();
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

const n = (v) => { const x = parseFloat(String(v || "").replace(",", ".")); return Number.isFinite(x) ? x : null; };
// "72.5" stays, 72.4999 → "72.5": kept as typed numbers, at most two decimals

// -> [{ name, startedAt, finishedAt, exercises: [{ name, time, sets: [{ w, r, t?, rir?, g? }] }] }]
export function parseHevy(text) {
  const { rows } = parseCsv(text);
  const byWorkout = new Map();
  rows.forEach((r) => {
    const startedAt = parseHevyDate(r.start_time);
    if (startedAt == null || !r.exercise_title) return;
    const key = `${startedAt}|${r.title}`;
    let w = byWorkout.get(key);
    if (!w) {
      w = { name: r.title || "Тренировка", startedAt, finishedAt: parseHevyDate(r.end_time) || startedAt, exercises: [] };
      byWorkout.set(key, w);
    }
    let ex = w.exercises[w.exercises.length - 1];
    if (!ex || ex.name !== r.exercise_title) { ex = { name: r.exercise_title, time: false, sets: [] }; w.exercises.push(ex); }
    const kg = n(r.weight_kg) ?? (n(r.weight_lbs) != null ? n(r.weight_lbs) * LBS : null);
    const reps = n(r.reps), secs = n(r.duration_seconds);
    if (reps == null && secs != null) ex.time = true;
    const set = { w: str(kg), r: str(reps ?? secs) };
    const type = (r.set_type || "").toLowerCase();
    if (type === "warmup") set.t = "w";
    if (type === "failure") set.rir = 0;
    const rpe = n(r.rpe);
    if (rpe != null && set.t !== "w") set.rir = Math.max(0, Math.min(4, Math.round(10 - rpe)));
    if (type === "dropset" && ex.sets.length) {
      const prev = ex.sets[ex.sets.length - 1];
      prev.g = prev.g || `hevy-${startedAt}-${w.exercises.length}-${ex.sets.length}`;
      set.g = prev.g;
    }
    ex.sets.push(set);
  });
  return [...byWorkout.values()].sort((a, b) => a.startedAt - b.startedAt);
}
