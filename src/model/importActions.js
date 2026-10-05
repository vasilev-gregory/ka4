// Importing workouts from another app: match their exercise names to ours (the catalog has every
// exercise from the histories we know; unknown ones are not imported), skip workouts already here,
// keep history in date order.
import { uid } from "../core/util.js";
import { ALIASES } from "./imports/aliases.js";

// "Bench Press (Barbell)" and "Barbell bench press" are the same exercise: compare word sets
const words = (s) => (s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim().split(" ").filter(Boolean);
const key = (s) => [...new Set(words(s))].sort().join(" ");

const ALIAS = new Map(ALIASES.map(([name, id]) => [key(name), id]));

// Finds our exercise for a name from another app: a known equivalent, or the same words (either language).
// Never by the name without its equipment: "Lateral Raise (Cable)" is not our dumbbell lateral raise.
// Returns the exercise or null.
export function matchExercise(exercises, name) {
  const k = key(name);
  const aliased = ALIAS.has(k) && exercises.find((e) => e.id === ALIAS.get(k));
  if (aliased) return aliased;
  const exact = exercises.find((e) => key(e.name) === k || (e.ru && key(e.ru) === k));
  return exact || null;
}

const SAME_TIME = 60e3;

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// What an import would do, without changing anything: { add: workouts to add (only exercises we have),
// already: workouts that are here already, matched: Map name -> our exercise,
// missing: Map name -> sets count (not in Кач: not imported), measures: measurements to add (days without one) }
export function planImport(d, workouts, measurements = []) {
  const matched = new Map(), missing = new Map();
  const fresh = workouts.filter((w) => !d.workouts.some((x) => Math.abs(x.startedAt - w.startedAt) < SAME_TIME));
  fresh.forEach((w) => w.exercises.forEach((e) => {
    if (!matched.has(e.name) && !missing.has(e.name)) {
      const ex = matchExercise(d.exercises, e.name);
      if (ex) matched.set(e.name, ex); else missing.set(e.name, 0);
    }
    if (missing.has(e.name)) missing.set(e.name, missing.get(e.name) + e.sets.length);
  }));
  const add = fresh
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => matched.has(e.name) && e.sets.length) }))
    .filter((w) => w.exercises.length);
  const measures = measurements.filter((m) => !(d.measurements || []).some((x) => sameDay(x.date, m.date)));
  return { add, already: workouts.length - fresh.length, matched, missing, measures };
}

// Adds the planned workouts as finished ones (source: where they came from) and the measurements.
// Never creates exercises, never changes or removes anything that is already there.
export function applyImport(d, plan, source) {
  plan.add.forEach((w) => {
    d.workouts.push({
      id: uid(), programId: null, name: w.name, source,
      startedAt: w.startedAt, finishedAt: w.finishedAt,
      segments: [{ start: w.startedAt, end: w.finishedAt }],
      exercises: w.exercises.map((e) => ({
        exerciseId: plan.matched.get(e.name).id,
        sets: e.sets.map((s) => ({ w: s.w, r: s.r, p: "", ...(s.t ? { t: s.t } : {}), ...(s.rir != null ? { rir: s.rir } : {}), ...(s.g ? { g: s.g } : {}), done: true })),
      })),
    });
  });
  d.workouts.sort((a, b) => a.startedAt - b.startedAt); // history and "last time" rely on date order
  if (plan.measures.length) {
    if (!Array.isArray(d.measurements)) d.measurements = [];
    plan.measures.forEach((m) => d.measurements.push({ id: uid(), date: m.date, values: { ...m.values }, source }));
  }
}
