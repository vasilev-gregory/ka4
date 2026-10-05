// Strength actions: every change to a workout the UI can make. Each takes the app data (an immer draft
// inside up()) and mutates it; time comes in as `now` so the rules are testable.
import { num, progTitle, uid } from "../core/util.js";
import { buildSets, closeSegment, columnConfig, defaultSets, normalizeGroups, setColumns } from "./workout.js";

const exAt = (d, ei) => d.active && d.active.exercises[ei];

// a program's cardio plan (minutes or km) is the hint in that field, over last time's
const withPlan = (sets, it) => (it.min ? sets.map((s) => ({ ...s, hr: String(it.min) }))
  : it.km ? sets.map((s) => ({ ...s, hw: String(it.km).replace(".", ",") })) : sets);

export function startWorkout(d, program, now = Date.now()) {
  const items = program?.items || [];
  // a program of only cardio needs no warm-up block
  const cardioOnly = items.length > 0 && items.every((it) => d.exercises.find((e) => e.id === it.exerciseId)?.kind === "cardio");
  d.active = {
    id: uid(),
    programId: program?.id || null,
    name: program ? progTitle(program) : "Свободная тренировка",
    startedAt: now,
    segments: [{ start: now }],
    paused: false,
    restEndsAt: null,
    ...(cardioOnly ? {} : { warmup: { doneAt: null } }), // a strength workout opens with a warm-up block (no exercises in it yet)
    exercises: items.map((it) => ({ exerciseId: it.exerciseId, sets: withPlan(buildSets(d, it.exerciseId, it.sets), it) })),
  };
}

// Warm-up done: the rest before the first set starts now (countdown if on, stopwatch on the first set).
export function finishWarmup(d, now = Date.now()) {
  const a = d.active;
  if (!a.warmup || a.warmup.doneAt) return;
  if (a.paused) resumeWorkout(d, now);
  a.warmup.doneAt = now;
  a.lastSetAt = now;
  a.restEndsAt = d.settings.countdown !== false ? now + d.settings.restSec * 1000 : null;
}

export function pauseWorkout(d, now = Date.now()) {
  closeSegment(d.active, now);
  d.active.paused = true;
  d.active.restEndsAt = null;
}

export function resumeWorkout(d, now = Date.now()) {
  closeSegment(d.active, now);
  d.active.segments.push({ start: now });
  d.active.paused = false;
}

export function setSet(d, ei, si, patch) {
  const s = d.active.exercises[ei].sets[si];
  Object.assign(s, patch);
  if (patch.p !== undefined && num(patch.p) > 0 && s.t !== "w") s.rir = 0; // partial reps mean the set went to failure
}

// Tap on a set number: warm-up on/off. A warm-up has no RIR.
export function toggleWarmup(d, ei, si) {
  const s = d.active.exercises[ei].sets[si];
  if (s.t === "w") s.t = "";
  else { s.t = "w"; s.rir = null; }
}

// ✓ on a set. Confirming without typing means "same as last time"; partial reps mean the set went to
// failure; a confirmed set ends a pause and starts the rest countdown (not in the middle of a drop set).
export function toggleSet(d, ei, si, now = Date.now()) {
  const a = d.active;
  const s = a.exercises[ei].sets[si];
  s.done = !s.done;
  if (!s.done) { delete s.at; return; }
  if (s.w === "" && s.hw) s.w = s.hw;
  if (s.r === "" && s.hr) s.r = s.hr;
  if (!s.p && s.hp) s.p = s.hp;
  if (num(s.p) > 0 && s.t !== "w") s.rir = 0;
  if (a.paused) resumeWorkout(d, now);
  if (a.warmup && !a.warmup.doneAt) a.warmup.doneAt = now; // went straight to the sets: warm-up is over
  s.at = now; // for rest-time stats
  a.lastSetAt = now;
  const next = a.exercises[ei].sets[si + 1];
  const midGroup = s.g && next && next.g === s.g && !next.done;
  const countdown = d.settings.countdown !== false;
  const cardio = d.exercises.find((x) => x.id === a.exercises[ei].exerciseId)?.kind === "cardio"; // no rest after cardio
  a.restEndsAt = midGroup || !countdown || cardio ? null : now + d.settings.restSec * 1000;
}

// a new set takes its hints from the last one
export function addSet(d, ei) {
  const ss = d.active.exercises[ei].sets, l = ss[ss.length - 1];
  ss.push({ w: "", r: "", p: "", hw: l ? l.w || l.hw || "" : "", hr: l ? l.r || l.hr || "" : "", hp: l ? l.p || l.hp || "" : "", done: false });
}

export function deleteSet(d, ei, si) {
  const ss = d.active.exercises[ei].sets;
  ss.splice(si, 1);
  normalizeGroups(ss);
}

// undo of deleteSet: put the set back where it was (or at the end if the list got shorter)
export function restoreSet(d, ei, si, set) {
  const ex = exAt(d, ei);
  if (ex) ex.sets.splice(Math.min(si, ex.sets.length), 0, set);
}

export function deleteSets(d, ei, indexes) {
  const ex = d.active.exercises[ei];
  ex.sets = ex.sets.filter((_, i) => !indexes.has(i));
  normalizeGroups(ex.sets);
}

// Drop set / ladder: the picked sets get one group id and move next to each other, at the first one's place.
export function mergeSets(d, ei, indexes) {
  const ex = d.active.exercises[ei];
  const idx = [...indexes].sort((x, y) => x - y);
  const g = uid();
  const picked = idx.map((i) => ex.sets[i]);
  picked.forEach((s) => { s.g = g; });
  const rest = ex.sets.filter((_, i) => !indexes.has(i));
  const at = ex.sets.slice(0, idx[0]).filter((_, i) => !indexes.has(i)).length;
  rest.splice(at, 0, ...picked);
  normalizeGroups(rest);
  ex.sets = rest;
}

export function unmergeSets(d, ei, indexes) {
  const ss = d.active.exercises[ei].sets;
  indexes.forEach((i) => { if (ss[i]) delete ss[i].g; });
  normalizeGroups(ss);
}

export function addExercises(d, list) {
  list.forEach((ex) => d.active.exercises.push({ exerciseId: ex.id, sets: buildSets(d, ex.id, defaultSets(ex)) }));
}

// swap an exercise in place, keeping the number of sets
export function replaceExercise(d, ei, ex) {
  const e = exAt(d, ei);
  if (e) { e.exerciseId = ex.id; e.sets = buildSets(d, ex.id, ex.kind === "cardio" ? 1 : e.sets.length || 3); }
}

export function removeExercise(d, ei) {
  d.active.exercises.splice(ei, 1);
}

// undo of removeExercise: back where it was (or at the end if the list got shorter)
export function restoreExercise(d, ei, exercise) {
  const list = d.active.exercises;
  list.splice(Math.min(ei, list.length), 0, exercise);
}

// yesterday's auto-closed workout differed from its program: write the change, or drop the offer
export function resolvePendingProgramUpdate(d, apply) {
  const pu = d.pendingProgramUpdate;
  const p = apply && pu && d.programs.find((x) => x.id === pu.programId);
  if (p) p.items = pu.items;
  delete d.pendingProgramUpdate;
}

export function adjustRest(d, sec) {
  if (d.active?.restEndsAt) d.active.restEndsAt += sec * 1000;
}

export function clearRest(d) {
  if (d.active) d.active.restEndsAt = null;
}

// Move a visible set column (кг, повт., …) from one visible position to another; hidden columns keep their place.
export function moveColumn(settings, from, to) {
  const full = columnConfig(settings);
  const vis = setColumns(settings);
  const order = vis.slice();
  const [k] = order.splice(from, 1);
  order.splice(to, 0, k);
  const visible = new Set(vis);
  let j = 0;
  settings.columns = full.map((c) => {
    if (!visible.has(c.key)) return c;
    const key = order[j++];
    return full.find((x) => x.key === key);
  });
}
