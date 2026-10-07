// Persistent state shape: seed for a fresh install and migrate() that upgrades any older saved data.
import { slug, uid } from "../core/util.js";
import { ASSIST_DEFAULTS, BW_DEFAULTS, EX_RENAMES, SEED_EX, ST_AREA_DEFAULTS, ST_DEFAULTS, ST_FIXES, ST_OLD_NAMES, ST_SEED } from "./catalog.js";

export const KEY = "gymapp-state-v1";
// bumped whenever migrate() learns a new upgrade step
export const SCHEMA_VERSION = 4;

export function seed() {
  const exercises = SEED_EX.map(([name, ru, group, kind]) => ({ id: slug(name), name, ru, group, kind: kind || "reps" }));
  const P = (name, ids) => ({ id: uid(), name, items: ids.map((exerciseId) => ({ exerciseId, sets: 3 })) });
  const programs = [
    P("I. Ноги и плечи", ["squat", "leg-extension", "leg-curl", "lateral-raise", "overhead-press", "deadlift", "calf-raise"]),
    P("II. Грудь и спина", ["dumbbell-bench-press", "seated-row", "dips", "pullover", "cable-preacher-curl", "cable-extension", "wrist-curl"]),
    P("III. Ноги и плечи", ["belt-squat", "bulgarian-split-squat", "hip-thrust", "upright-row", "reverse-fly", "deadlift", "calf-raise"]),
    P("IV. Грудь и спина", ["barbell-bench-press", "lat-pulldown", "cable-crossover", "machine-row", "dumbbell-seated-curl", "cable-extension-samurai", "wrist-curl"]),
  ];
  const split = { id: uid(), name: "Неделя I–IV", items: programs.map((p) => ({ programId: p.id })) };
  return {
    version: SCHEMA_VERSION,
    exercises,
    programs,
    splits: [split],
    activeSplitId: split.id,
    workouts: [],
    measurements: [],
    stretch: seedStretch(),
    active: null,
    settings: { restSec: 120 },
  };
}

// adds new built-in exercises and Russian names to data saved by older versions
export function migrate(d) {
  const base = seed();
  const byId = Object.fromEntries(d.exercises.map((e) => [e.id, e]));
  base.exercises.forEach((se) => {
    const e = byId[se.id];
    if (!e) d.exercises.push(se);
    else if (!e.ru) e.ru = se.ru;
  });
  EX_RENAMES.forEach(([id, oldRu, ru]) => { if (byId[id] && byId[id].ru === oldRu) byId[id].ru = ru; });
  if (!Array.isArray(d.measurements)) d.measurements = [];
  if (!Array.isArray(d.splits)) d.splits = [];
  if (d.activeSplitId === undefined) d.activeSplitId = null;
  if (!d.stretch) d.stretch = seedStretch();
  ["exercises", "programs", "sessions"].forEach((k) => { if (!Array.isArray(d.stretch[k])) d.stretch[k] = []; });
  if (!d.stretch.defaults) d.stretch.defaults = { ...ST_DEFAULTS };
  d.stretch.programs.forEach((pr) => { if (!Array.isArray(pr.items)) pr.items = []; });
  d.stretch.exercises.forEach((e) => {
    if (e.area === undefined && ST_AREA_DEFAULTS[e.id]) e.area = ST_AREA_DEFAULTS[e.id];
    const seedRow = ST_SEED.find((r) => r[0] === e.id);
    if (seedRow && ST_OLD_NAMES[e.id] && e.name === ST_OLD_NAMES[e.id]) { e.name = seedRow[1]; e.ru = seedRow[2]; }
    ST_FIXES.forEach(([id, oldRu, fix]) => { if (e.id === id && e.ru === oldRu) Object.assign(e, fix); });
    // one side or two is what the stretch is, not a choice: a built-in one always as in the catalog
    if (seedRow) e.sides = seedRow[3];
  });
  if (d.settings && d.settings.restMode === "stopwatch" && d.settings.countdown === undefined) d.settings.countdown = false;
  d.exercises.forEach((e) => {
    if (e.bw === undefined && BW_DEFAULTS[e.id]) e.bw = BW_DEFAULTS[e.id];
    if (e.assist === undefined && ASSIST_DEFAULTS[e.id]) e.assist = true;
  });
  // flatten nested drop sets from an earlier version into linear grouped sets
  const flat = (sets) => {
    const out = [];
    sets.forEach((st) => {
      if (st.drops && st.drops.length) {
        const g = uid();
        const { drops, ...base } = st;
        out.push({ ...base, g });
        drops.forEach((dr) => out.push({ w: dr.w, r: dr.r, p: "", done: base.done, g, ...(dr.hw != null ? { hw: dr.hw, hr: dr.hr } : {}) }));
      } else {
        if (st.drops) delete st.drops;
        out.push(st);
      }
    });
    return out;
  };
  d.workouts.forEach((w) => w.exercises.forEach((e) => { e.sets = flat(e.sets); }));
  if (d.active) d.active.exercises.forEach((e) => { e.sets = flat(e.sets); });
  // v4: the rest stopwatch in ✓ had been made opt-in, and any change of the columns saved it off; switch it on once
  if ((d.version || 0) < 4 && d.settings && Array.isArray(d.settings.columns)) {
    d.settings.columns.forEach((c) => { if (c.key === "rest") c.on = true; });
  }
  d.version = SCHEMA_VERSION;
  return d;
}

export function seedStretch() {
  return {
    exercises: ST_SEED.map(([id, name, ru, sides]) => ({ id, name, ru, sides, ...(ST_AREA_DEFAULTS[id] ? { area: ST_AREA_DEFAULTS[id] } : {}) })),
    programs: [],
    sessions: [],
    defaults: { ...ST_DEFAULTS },
  };
}
