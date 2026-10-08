// Strength actions: every change to a workout the UI can make. Each takes the app data (an immer draft
// inside up()) and mutates it; time comes in as `now` so the rules are testable.
import { num, progTitle, uid } from "../core/util.js";
import {
  buildSets, CARDIO_PLAN, closeSegment, columnConfig, defaultSets, itemsOf, lastActivity, lastTick, normalizeGroups, programDiff, programItem, runningSession, segmentsOf, setColumns,
} from "./workout.js";
import { moveItem } from "../core/util.js";
import { nextStep } from "./progression.js";

// an exercise's starting sets, with a progression step in the hints when it has stalled
const setsFor = (d, exId, n) => buildSets(d, exId, n, nextStep(d.workouts, d.exercises.find((e) => e.id === exId))?.next);

const exAt = (d, ei) => d.active && d.active.exercises[ei];

// a program's cardio plan (minutes or km) is the hint in that field, over last time's
const withPlan = (sets, it) => (it.min ? sets.map((s) => ({ ...s, hr: String(it.min) }))
  : it.km ? sets.map((s) => ({ ...s, hw: String(it.km).replace(".", ",") })) : sets);

// a cardio line saved before plans existed has none: it gets the default the editor shows
const planOf = (d, it) => (it.min || it.km || d.exercises.find((e) => e.id === it.exerciseId)?.kind !== "cardio" ? it : { ...it, min: CARDIO_PLAN.min });

export function startWorkout(d, program, now = Date.now()) {
  if (runningSession(d) === "stretch") return; // one session at a time: not while a stretching run goes on
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
    exercises: items.map((it) => ({ exerciseId: it.exerciseId, sets: withPlan(setsFor(d, it.exerciseId, it.sets), planOf(d, it)) })),
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
// Its rest is fixed at the tick (since the previous tick, none across a pause): other ticks in any order never
// move it. Unticking steps the running rest back to the tick before; the countdown goes with its set.
export function toggleSet(d, ei, si, now = Date.now()) {
  const a = d.active;
  const s = a.exercises[ei].sets[si];
  s.done = !s.done;
  if (!s.done) {
    if (s.at === a.lastSetAt) a.restEndsAt = null;
    delete s.at; delete s.rest;
    a.lastSetAt = lastTick(a);
    return;
  }
  if (s.w === "" && s.hw) s.w = s.hw;
  // only partials typed: no full reps were done, so 0 (not last time's reps)
  if (s.r === "" && num(s.p) > 0) s.r = "0";
  if (s.r === "" && s.hr) s.r = s.hr;
  if (!s.p && s.hp) s.p = s.hp;
  if (num(s.p) > 0 && s.t !== "w") s.rir = 0;
  const prev = a.lastSetAt;
  if (a.paused) resumeWorkout(d, now);
  if (a.warmup && !a.warmup.doneAt) a.warmup.doneAt = now; // went straight to the sets: warm-up is over
  const pausedSince = segmentsOf(a).some((sg) => sg.end && prev && sg.end > prev && sg.end <= now);
  s.rest = prev && !pausedSince ? now - prev : null;
  s.at = now; // for rest-time stats
  a.lastSetAt = now;
  const next = a.exercises[ei].sets[si + 1];
  const midGroup = s.g && next && next.g === s.g && !next.done;
  const countdown = d.settings.countdown !== false;
  const cardio = d.exercises.find((x) => x.id === a.exercises[ei].exerciseId)?.kind === "cardio"; // no rest after cardio
  a.restEndsAt = midGroup || !countdown || cardio ? null : now + d.settings.restSec * 1000;
}

// the hold-and-slide dial on ✓: marks the set done (as ✓ does, unless it is already) with the RIR picked
export function markSetRir(d, ei, si, rir, now = Date.now()) {
  if (!d.active.exercises[ei].sets[si].done) toggleSet(d, ei, si, now);
  d.active.exercises[ei].sets[si].rir = rir;
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

// undo of deleteSets: the exercise's sets as they were
export function restoreSets(d, ei, sets) {
  const ex = exAt(d, ei);
  if (ex) ex.sets = sets;
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
  list.forEach((ex) => d.active.exercises.push({ exerciseId: ex.id, sets: setsFor(d, ex.id, defaultSets(ex)) }));
}

// swap an exercise in place, keeping the number of sets
export function replaceExercise(d, ei, ex) {
  const e = exAt(d, ei);
  if (e) { e.exerciseId = ex.id; e.sets = setsFor(d, ex.id, ex.kind === "cardio" ? 1 : e.sets.length || 3); }
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

// bring the rest countdown back after «Хватит»: counted from the last set (past its end it shows the overtime)
export function showRest(d, now = Date.now()) {
  const a = d.active;
  if (!a || a.paused) return;
  a.restEndsAt = (a.lastSetAt || now) + d.settings.restSec * 1000;
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

// Ends the workout: optionally writes its exercises back into its program, keeps only done sets, files it into
// history (if anything was done), «не в зачёт» if off (a bad day). Returns its id.
export function finishWorkout(d, updateProgram, now = Date.now(), off = false) {
  const w = d.active;
  if (!w) return null;
  if (off) w.off = true;
  if (updateProgram) {
    const p = d.programs.find((x) => x.id === w.programId);
    if (p) p.items = itemsOf(w, p);
  }
  closeSegment(w, now);
  w.finishedAt = w.segments[w.segments.length - 1].end;
  delete w.restEndsAt;
  delete w.paused;
  w.exercises = w.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done).map(({ w: sw, r, p, t, rir, g, at, done }) => ({
      w: sw, r, p: p || "", ...(t ? { t } : {}), ...(rir != null ? { rir } : {}), ...(g ? { g } : {}), ...(at ? { at } : {}), done,
    })) }))
    .filter((e) => e.sets.length);
  if (w.exercises.length) d.workouts.push(w);
  d.active = null;
  return w.id;
}

// the running workout dropped without a trace
export function discardWorkout(d) {
  d.active = null;
}

// «не в зачёт» on / off (model/workout.js counts)
export function setWorkoutOff(d, id, off) {
  const w = d.workouts.find((x) => x.id === id);
  if (!w) return;
  if (off) w.off = true; else delete w.off;
}

export function removeWorkout(d, id) {
  d.workouts = d.workouts.filter((x) => x.id !== id);
}

// reorder the exercises of the running workout
export function moveExercise(d, from, to) {
  if (d.active) moveItem(d.active.exercises, from, to);
}

export function createProgram(d, id) {
  d.programs.push({ id, name: "", items: [] });
}

// a program made from a finished workout (an imported history has none): its exercises in order, as many sets as
// it had working sets (at least one); cardio planned at the minutes it took
export function programFromWorkout(d, w, id, exMap) {
  const items = w.exercises.map((e) => {
    const ex = exMap[e.exerciseId];
    if (ex && ex.kind === "cardio") return { exerciseId: e.exerciseId, sets: 1, min: Math.round(e.sets.reduce((t, s) => t + num(s.r), 0)) || CARDIO_PLAN.min };
    return { exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.t !== "w").length || 1 };
  });
  d.programs.push({ id, name: w.name, items });
}

export function removeProgram(d, id) {
  d.programs = d.programs.filter((x) => x.id !== id);
  d.splits.forEach((s) => { s.items = s.items.filter((it) => it.programId !== id); }); // and out of the splits
}

// exercises added to a program, each with the default plan of its kind
export function addProgramItems(p, exercises) {
  exercises.forEach((ex) => p.items.push(programItem(ex)));
}

// an item replaced by another exercise: the same kind keeps its sets; cardio <-> strength starts from the new kind's defaults
export function replaceProgramItem(p, i, ex, exMap) {
  const old = p.items[i];
  if (!old) return;
  p.items[i] = (exMap[old.exerciseId]?.kind === "cardio") === (ex.kind === "cardio") ? { ...old, exerciseId: ex.id } : programItem(ex);
}

// the user's own exercise
export function createExercise(d, ex) {
  d.exercises.push(ex);
}

// the rest countdown on / off; off also drops a countdown going on
export function setCountdown(d, on) {
  d.settings.countdown = on;
  if (d.active && !on) d.active.restEndsAt = null;
}

// a running workout with no activity for this long, and not from today, was abandoned
export const ABANDONED_AFTER = 4 * 3600e3;

// A workout left paused overnight is finished on the next launch. So is one left running
// (app killed, phone died) since yesterday: it ends at its last activity, not at "now".
// If it differed from its program, the change is offered later via data.pendingProgramUpdate.
export function closeStaleWorkout(d0, now = Date.now()) {
  const a = d0.active;
  if (!a) return d0;
  const today = new Date(now).toDateString();
  const last = lastActivity(a);
  if (a.paused) {
    const segs = segmentsOf(a);
    const lastEnd = segs[segs.length - 1].end || a.startedAt;
    if (new Date(lastEnd).toDateString() === today) return d0;
  } else if (new Date(last).toDateString() === today || now - last < ABANDONED_AFTER) {
    return d0;
  }
  const d = structuredClone(d0);
  const w = d.active;
  const diff = programDiff(w, d.programs);
  if (diff) d.pendingProgramUpdate = diff;
  closeSegment(w, last); // no-op when paused (the segment is already closed)
  finishWorkout(d, false, last);
  return d;
}

// several programs at once (picked on the workout tab); the undo puts back the programs and the splits as they were
export const removePrograms = (d, ids) => ids.forEach((id) => removeProgram(d, id));
export function restorePrograms(d, { programs, splits }) {
  d.programs = programs;
  d.splits = splits;
}

// a program left with no name and nothing in it (made by «+ Новая программа», then left) is dropped
export function dropEmptyProgram(d, id) {
  const p = d.programs.find((x) => x.id === id);
  if (p && !p.name.trim() && !p.items.length) removeProgram(d, id);
}
