// Progress and records: estimated one-rep max, best so far, the previous session of an exercise. A workout «не в
// зачёт» (counts) is neither a record to beat nor the previous session, and gets no progress note itself.
import { num } from "../core/util.js";
import { counts, setLoad } from "./workout.js";

// Estimated one-rep max (Epley). Null outside 1–12 reps, where the estimate means little.
export function e1rm(load, reps) {
  if (!(load > 0) || !(reps >= 1) || reps > 12) return null;
  return reps === 1 ? load : load * (1 + reps / 30);
}

// best estimated 1RM among the confirmed working sets of one session (null for timed exercises)
export function sessionE1rm(sets, ex, bw) {
  if (!ex || ex.kind === "time" || ex.kind === "cardio") return null;
  let best = null;
  sets.forEach((s) => {
    if (!s.done || s.t === "w") return;
    const v = e1rm(setLoad(ex, s, bw), num(s.r));
    if (v != null && (best == null || v > best)) best = v;
  });
  return best;
}

// best estimated 1RM of an exercise over workouts that started before `before`
export function bestE1rm(workouts, exId, ex, bwAt, before = Infinity) {
  let best = null;
  workouts.forEach((w) => {
    if (w.startedAt >= before || !counts(w)) return;
    const e = w.exercises.find((x) => x.exerciseId === exId);
    const v = e && sessionE1rm(e.sets, ex, bwAt(w.startedAt));
    if (v != null && (best == null || v > best)) best = v;
  });
  return best;
}

// The same exercise last time before `before`: { workout, sets } or null
export function previousSession(workouts, exId, before) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    if (w.startedAt >= before || !counts(w)) continue;
    const e = w.exercises.find((x) => x.exerciseId === exId);
    if (e && e.sets.length) return { workout: w, sets: e.sets };
  }
  return null;
}

// Indexes of sets that beat the exercise's best so far (history + earlier sets of this session).
export function recordSets(sets, ex, bw, bestBefore) {
  const out = new Set();
  if (bestBefore == null) return out; // first time: nothing to beat
  let best = bestBefore;
  sets.forEach((s, i) => {
    if (!s.done || s.t === "w" || !ex || ex.kind === "time" || ex.kind === "cardio") return;
    const v = e1rm(setLoad(ex, s, bw), num(s.r));
    if (v != null && v > best + 1e-9) { out.add(i); best = v; }
  });
  return out;
}

// How an exercise of workout w went against its previous session: { record: true } (best estimated 1RM so far),
// { delta: kg of estimated 1RM against last time }, or null (nothing to compare)
export function sessionProgress(workouts, w, e, ex, bwAt) {
  if (!counts(w)) return null;
  const cur = sessionE1rm(e.sets, ex, bwAt(w.startedAt));
  if (cur == null) return null;
  const best = bestE1rm(workouts, e.exerciseId, ex, bwAt, w.startedAt);
  if (best != null && cur > best + 1e-9) return { record: true };
  const prev = previousSession(workouts, e.exerciseId, w.startedAt);
  const was = prev && sessionE1rm(prev.sets, ex, bwAt(prev.workout.startedAt));
  return was == null ? null : { delta: cur - was };
}
