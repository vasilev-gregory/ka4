// GymKeeper CSV export (Export → workouts), in English or Russian. Columns: Date (M/D/YY, or DD.MM.YYYY in Russian),
// Type, Name, №, Val_1, Unit_1, Val_2, Unit_2, Comment. Type: 📅 a day (Comment "57 min" / "57 мин"), 🏋️‍♂️ an
// exercise (🏋️‍♂️🔗 in a superset), 🔹 a set: weight kg / lb (кг) and reps; seconds (сек) and kg for a timed one
// (plank); seconds and km for cardio. Comment = WarmUp / Easy / Normal / Hard / Drop (Размин / Легк / Норм / Тяжел /
// Дроп) + an optional "(note)". 📏 a measurement (Weight / Вес, …).
// There is no start time: a workout is put at noon of its day. A note like "(1рук)", "(1h)", "(single)" or
// "(1 нога)" marks a one-arm / one-leg set: such sets become "<exercise> одной рукой / ногой".
import { MEASURES } from "../catalog.js";
import { parseCsv } from "./csv.js";

const HEADERS = ["Date", "Type", "Name", "Val_1", "Unit_1", "Val_2", "Unit_2", "Comment"];
// GymKeeper measurement names → ours (MEASURES)
const MEASURE = { weight: "weight", waist: "waist", hips: "glutes", chest: "chest", thigh: "thigh", biceps: "biceps", arm: "biceps", calf: "calf", neck: "neck", "body fat": "fat", fat: "fat",
  ...Object.fromEntries(MEASURES.map(([id, name]) => [name.toLowerCase(), id])) };
// a set's label in either language (the Russian export cuts the words: «Тяжел», «Размин»)
const LABELS = [["warmup", "warmup"], ["размин", "warmup"], ["easy", "easy"], ["легк", "easy"], ["normal", "normal"], ["норм", "normal"],
  ["hard", "hard"], ["тяжел", "hard"], ["drop", "drop"], ["дроп", "drop"]];
const labelOf = (s) => (LABELS.find(([p]) => s.startsWith(p)) || [null, s])[1];
const KG = { kg: 1, "кг": 1, lb: 0.45359237, "фунт": 0.45359237 };
const SEC = ["sec", "s", "сек"], KM = ["km", "км"];
const SIDE = { arm: "одной рукой", leg: "одной ногой" };

export const isGymKeeper = (headers) => HEADERS.every((h) => headers.includes(h));

// "3/29/21" (month first) or "29.03.2021" (day first)
const day = (s) => {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s || ""), ru = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(s || "");
  const m = us || ru;
  if (!m) return null;
  const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  return us ? new Date(y, +m[1] - 1, +m[2], 12).getTime() : new Date(y, +m[2] - 1, +m[1], 12).getTime();
};
const n = (v) => { const x = parseFloat(String(v || "").replace(",", ".")); return Number.isFinite(x) ? x : null; };
const str = (x) => (x == null ? "" : String(Math.round(x * 100) / 100));
// "Squat · Barbell" → "Squat (Barbell)", the way Hevy and our aliases write equipment
const exName = (s) => s.replace(/\s*·\s*(.+)$/, " ($1)");

// Drop sets: consecutive "Drop" sets with falling weight are one drop set; the set before them joins it
// when it was heavier than the first drop.
function groupDrops(sets, label, stamp) {
  let chain = null;
  sets.forEach((s, i) => {
    if (label[i] !== "drop") { chain = null; return; }
    const prev = sets[i - 1];
    if (chain && prev && +prev.w >= +s.w) { s.g = chain; return; }
    chain = `gk-${stamp}-${i}`;
    s.g = chain;
    if (prev && label[i - 1] !== "drop" && label[i - 1] !== "warmup" && +prev.w > +s.w) prev.g = chain;
  });
  sets.forEach((s) => { if (s.g && sets.filter((x) => x.g === s.g).length < 2) delete s.g; });
}

// "1рук", "1р", "1h", "1hand", "cbl1h", "single" → one arm; "1 нога" → one leg; "2рук", "2h", "1dumb" (one dumbbell) → no
export function oneSided(note) {
  const s = (note || "").toLowerCase();
  if (/1\s*-?\s*ног/.test(s)) return "leg";
  if (/single|1\s*(рук|р\b|р$|h\b|h$|hand)|1h/.test(s)) return "arm";
  return null;
}

// -> { workouts: [{ name, startedAt, finishedAt, exercises: [{ name, time, sets }] }], measurements: [{ date, values }] }
export function parseGymKeeper(text) {
  const { rows } = parseCsv(text);
  const workouts = [], measurements = new Map();
  let w = null, ex = null, labels = [], sides = [];
  // an exercise's sets split into the two-sided ones and each one-sided kind, drop sets grouped within each
  const closeExercise = () => {
    if (ex) {
      for (const uni of [null, "arm", "leg"]) {
        const idx = ex.sets.map((_, i) => i).filter((i) => sides[i] === uni);
        if (!idx.length) continue;
        const part = { name: uni ? `${ex.name} ${SIDE[uni]}` : ex.name, time: false, sets: idx.map((i) => ex.sets[i]) };
        groupDrops(part.sets, idx.map((i) => labels[i]), `${w.startedAt}-${w.exercises.length}`);
        w.exercises.push(part);
      }
    }
    ex = null; labels = []; sides = [];
  };
  rows.forEach((r) => {
    const t = day(r.Date);
    if (t == null) return;
    if (r.Type.startsWith("📅")) {
      closeExercise();
      const mins = n(r.Comment) || 0;
      w = { name: "Тренировка", startedAt: t, finishedAt: t + mins * 60e3, exercises: [] };
      workouts.push(w);
    } else if (r.Type.startsWith("🏋")) {
      closeExercise();
      if (w) ex = { name: exName(r.Name), sets: [] };
    } else if (r.Type.startsWith("🔹") && ex) {
      const label = labelOf((r.Comment || "").replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase());
      const u1 = (r.Unit_1 || "").toLowerCase(), u2 = (r.Unit_2 || "").toLowerCase();
      let set;
      if (SEC.includes(u1) && KM.includes(u2)) set = { w: n(r.Val_2) ? str(n(r.Val_2)) : "", r: str(n(r.Val_1) / 60) }; // cardio: minutes, km
      else if (SEC.includes(u1)) set = { w: KG[u2] && n(r.Val_2) ? str(n(r.Val_2) * KG[u2]) : "", r: str(n(r.Val_1)) }; // timed: seconds, kg
      else set = { w: KG[u1] && n(r.Val_1) ? str(n(r.Val_1) * KG[u1]) : "", r: str(n(r.Val_2)) }; // kg, reps; a time in the weight column isn't one
      if (label === "warmup") set.t = "w";
      if (label === "easy") set.rir = 4;
      if (label === "hard") set.rir = 1;
      ex.sets.push(set);
      labels.push(label);
      sides.push(oneSided((/\((.*)\)\s*$/.exec(r.Comment || "") || [])[1]));
    } else if (r.Type.startsWith("📏")) {
      const key = MEASURE[(r.Name || "").toLowerCase()];
      if (!key || n(r.Val_1) == null) return;
      const m = measurements.get(t) || { date: t, values: {} };
      m.values[key] = str(n(r.Val_1));
      measurements.set(t, m);
    }
  });
  closeExercise();
  workouts.forEach((x) => { x.exercises = x.exercises.filter((e) => e.sets.length); });
  return { workouts: workouts.filter((x) => x.exercises.length), measurements: [...measurements.values()] };
}
