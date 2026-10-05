// Importing workouts from another app: match their exercise names to ours (or create new ones),
// skip workouts that are already here, keep history in date order.
import { uid } from "../core/util.js";
import { ALIASES } from "./imports/aliases.js";

// "Bench Press (Barbell)" and "Barbell bench press" are the same exercise: compare word sets
const words = (s) => (s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim().split(" ").filter(Boolean);
const key = (s) => [...new Set(words(s))].sort().join(" ");
const base = (s) => key((s || "").replace(/\([^)]*\)/g, " ")); // without the "(Barbell)" part

const ALIAS = new Map(ALIASES.map(([name, id]) => [key(name), id]));

// Finds our exercise for a name from another app: a known equivalent, the same words (either language),
// then without the bracketed equipment if that is unique. Returns the exercise or null.
export function matchExercise(exercises, name) {
  const k = key(name);
  const aliased = ALIAS.has(k) && exercises.find((e) => e.id === ALIAS.get(k));
  if (aliased) return aliased;
  const exact = exercises.find((e) => key(e.name) === k || (e.ru && key(e.ru) === k));
  if (exact) return exact;
  const b = base(name);
  const loose = exercises.filter((e) => key(e.name) === b || (e.ru && key(e.ru) === b));
  return loose.length === 1 ? loose[0] : null;
}

// first hit wins, so the more specific words come first ("тяга широчайшими" is back, "тяга к подбородку" shoulders)
const GROUP_WORDS = [
  ["икры", ["calf", "икр", "носк"]],
  ["предплечья", ["wrist", "forearm", "farmer", "запяст", "предплеч"]],
  ["трицепс", ["tricep", "pushdown", "skull", "dip", "трицепс", "француз", "брус"]],
  ["бицепс", ["curl", "bicep", "бицепс", "скотт", "сгибания рук", "сгибание рук"]],
  ["спина", ["pulldown", " lat ", "широч", "pull up", "pullup", "chin", "подтяг"]],
  ["плечи", ["shoulder", "lateral", "overhead", "military", "delt", "upright", "плеч", "мах", "армейск", "подбородк", "над голов", "вертикальная тяга", "дельт"]],
  ["спина", ["row", "deadlift", "back", "тяга", "спин", "пуловер", "pullover"]],
  ["грудь", ["bench", "chest", "fly", "push up", "pushup", "pec", "жим леж", "груд", "отжим", "развод", "бабочк"]],
  ["ноги", ["squat", "leg", "lunge", "hip", "glute", "присед", "выпад", "ног", "ягод"]],
];

// a best guess for an unknown exercise; the user can change it on the exercise screen
export function guessGroup(name) {
  const s = ` ${words(name).join(" ")} `;
  const hit = GROUP_WORDS.find(([, ws]) => ws.some((w) => s.includes(w)));
  return hit ? hit[0] : "кор";
}

const SAME_TIME = 60e3;

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// What an import would do, without changing anything: { add: workouts to add, skipped, exercises:
// Map name -> existing exercise or null (to be created), measures: measurements to add (days without one) }
export function planImport(d, workouts, measurements = []) {
  const add = workouts.filter((w) => !d.workouts.some((x) => Math.abs(x.startedAt - w.startedAt) < SAME_TIME));
  const exercises = new Map();
  add.forEach((w) => w.exercises.forEach((e) => { if (!exercises.has(e.name)) exercises.set(e.name, matchExercise(d.exercises, e.name)); }));
  const measures = measurements.filter((m) => !(d.measurements || []).some((x) => sameDay(x.date, m.date)));
  return { add, skipped: workouts.length - add.length, exercises, measures };
}

// Adds the planned workouts as finished ones (source: where they came from), creates missing exercises,
// adds measurements. Never changes or removes anything that is already there.
export function applyImport(d, plan, source) {
  const ids = new Map();
  plan.exercises.forEach((ex, name) => {
    if (ex) { ids.set(name, ex.id); return; }
    const time = plan.add.some((w) => w.exercises.some((e) => e.name === name && e.time));
    const created = { id: uid(), name, group: guessGroup(name), kind: time ? "time" : "reps" };
    d.exercises.push(created);
    ids.set(name, created.id);
  });
  plan.add.forEach((w) => {
    d.workouts.push({
      id: uid(), programId: null, name: w.name, source,
      startedAt: w.startedAt, finishedAt: w.finishedAt,
      segments: [{ start: w.startedAt, end: w.finishedAt }],
      exercises: w.exercises.map((e) => ({
        exerciseId: ids.get(e.name),
        sets: e.sets.map((s) => ({ w: s.w, r: s.r, p: "", ...(s.t ? { t: s.t } : {}), ...(s.rir != null ? { rir: s.rir } : {}), ...(s.g ? { g: s.g } : {}), done: true })),
      })).filter((e) => e.sets.length),
    });
  });
  d.workouts.sort((a, b) => a.startedAt - b.startedAt); // history and "last time" rely on date order
  if (plan.measures.length) {
    if (!Array.isArray(d.measurements)) d.measurements = [];
    plan.measures.forEach((m) => d.measurements.push({ id: uid(), date: m.date, values: { ...m.values }, source }));
  }
}
