// The stretching run going on, saved in data.stretch.active: it survives a reload and goes on while the player
// is folded away. Its timeline is always the program as it is now (plus the rounds added in this run), so edits
// to the program reach the run; the run remembers where it is as a phase, not as an index. Every function takes
// the stretching part of the data (an immer draft for the actions) and the time `now`.
import { buildTimeline, countsHold, stExMap, stTiming } from "./stretch.js";
import { uid } from "../core/util.js";
import { QUICK, findProgram, recordSession, savePhaseLength } from "./stretchActions.js";

// back after this long past a phase's end (the app was closed or asleep): don't run through the rest unattended
export const RUN_GAP = 30e3;

const exIdOf = (ph) => (ph && ph.ex ? ph.ex.id : null);
const sameStep = (ph, at) => !!ph && ph.k === at.k && exIdOf(ph) === at.exId;
const samePhase = (ph, at) => sameStep(ph, at) && (ph.side || null) === at.side;

// the run's timeline: the program now, plus the extra rounds of this run
export function runTimeline(s, a = s.active) {
  const p = a && (a.program || findProgram(s, a.programId));
  if (!p) return [];
  const exMap = stExMap(s);
  const T = stTiming(p);
  const round = [...(T.roundRest > 0 ? [{ k: "roundRest", dur: T.roundRest }] : []),
    ...buildTimeline({ ...p, timing: { ...T, rounds: 1, mode: "circuit" } }, exMap)];
  return [...buildTimeline(p, exMap), ...Array.from({ length: a.extraRounds || 0 }, () => round).flat()];
}

// a phase as the run remembers it: kind, stretch, side and which occurrence of that
export function refOf(tl, i) {
  const at = { k: tl[i].k, exId: exIdOf(tl[i]), side: tl[i].side || null };
  return { ...at, nth: tl.slice(0, i).filter((x) => samePhase(x, at)).length };
}

// where that phase is now: the same one, else the same step without the side (sides switched), else the same
// stretch, else the start. exact: whether it is the very same step (its clock goes on)
function locate(tl, at) {
  let seen = 0;
  let i = tl.findIndex((x) => samePhase(x, at) && seen++ === at.nth);
  if (i < 0) i = tl.findIndex((x) => sameStep(x, at));
  const exact = i >= 0;
  if (i < 0 && at.exId) i = tl.findIndex((x) => exIdOf(x) === at.exId);
  return { i: Math.max(0, i), exact };
}

// The run now: { a, tl, idx, phase, left: ms, stale: the program changed under it (syncRun) } or null
export function runState(s, now) {
  const a = s.active;
  if (!a) return null;
  const tl = runTimeline(s, a);
  if (a.done || !tl.length) return { a, tl, idx: tl.length, phase: null, left: 0, stale: !a.done };
  const { i, exact } = locate(tl, a.at);
  const at = refOf(tl, i);
  const stale = !exact || tl[i].dur !== a.dur || at.nth !== a.at.nth || at.side !== a.at.side;
  return { a, tl, idx: i, phase: tl[i], left: a.pausedLeft != null ? a.pausedLeft : a.end - now, stale };
}

function credit(a, ph, sec) {
  if (countsHold(ph) && sec > 0) a.held[ph.ex.id] = (a.held[ph.ex.id] || 0) + Math.round(sec);
}

function record(s, complete, at) {
  const a = s.active;
  if (!complete && at - a.startedAt < 60e3) return; // a run left within a minute isn't history
  recordSession(s, findProgram(s, a.programId) || {}, { programId: a.programId, startedAt: a.startedAt, finishedAt: at, complete, work: { ...a.held } });
}

// into phase i of tl, its clock starting at `start`; past the end the run is done and goes into history
function enter(s, tl, i, start) {
  const a = s.active;
  if (i >= tl.length) {
    a.done = true;
    a.finishedAt = start;
    record(s, true, start);
    return;
  }
  a.at = refOf(tl, i);
  a.dur = tl[i].dur;
  a.end = start + tl[i].dur * 1000;
  a.pausedLeft = null;
}

// Starts a program, unless a run is going on (then that one stays); a finished run is closed first.
export function playProgram(s, programId, now) {
  if (s.active && s.active.done) delete s.active;
  if (s.active) return;
  const a = { programId, startedAt: now, extraRounds: 0, held: {} };
  const tl = runTimeline(s, a);
  if (!tl.length) return;
  s.active = a;
  enter(s, tl, 0, now);
}

// A quick run: the chosen stretches with the default times, without making a program (it can be kept as one after).
export function playQuick(s, exerciseIds, now) {
  if (s.active && s.active.done) delete s.active;
  if (s.active || !exerciseIds.length) return;
  const program = { id: QUICK, name: "Быстрая растяжка", timing: { ...s.defaults }, items: exerciseIds.map((id) => ({ exerciseId: id })) };
  const a = { programId: QUICK, program, startedAt: now, extraRounds: 0, held: {} };
  const tl = runTimeline(s, a);
  if (!tl.length) return;
  s.active = a;
  enter(s, tl, 0, now);
}

// a quick run kept as a program (as it was by the end, with the times changed on the way)
export function keepQuickProgram(s) {
  const a = s.active;
  if (!a || a.programId !== QUICK || a.savedAs) return;
  const id = uid();
  const { timing, items } = a.program;
  s.programs.push({ id, name: "Быстрая растяжка", timing: { ...timing }, items: items.map((it) => ({ ...it, ...(it.over ? { over: { ...it.over } } : {}) })) });
  a.savedAs = id;
}

// The program changed under the run: carry on from the same phase; a new length of it moves its end; landing on
// another step starts it afresh. A program emptied or deleted ends the run.
export function syncRun(s, now) {
  const a = s.active;
  if (!a || a.done) return;
  const tl = runTimeline(s);
  if (!tl.length) { closeRun(s, now); return; }
  const { i, exact } = locate(tl, a.at);
  if (!exact) { enter(s, tl, i, now); return; }
  const dd = (tl[i].dur - a.dur) * 1000;
  if (a.pausedLeft != null) a.pausedLeft = Math.max(0, a.pausedLeft + dd); else a.end += dd;
  a.dur = tl[i].dur;
  a.at = refOf(tl, i);
}

// The clock: a phase that ran out counts and the run moves on, the next phase timed from when the last one
// ended. Back after a long gap: the phase that was on counts, the next one waits paused.
export function tickRun(s, now) {
  syncRun(s, now);
  for (;;) {
    const a = s.active;
    if (!a || a.done || a.pausedLeft != null || now < a.end) return;
    const tl = runTimeline(s);
    const { i } = locate(tl, a.at);
    credit(a, tl[i], tl[i].dur);
    const gap = now - a.end > RUN_GAP;
    enter(s, tl, i + 1, a.end);
    if (gap && !a.done) { a.pausedLeft = a.dur * 1000; return; }
  }
}

// skip (i = the next phase) or back: the phase left this way doesn't count; it runs again from its start
export function goToPhase(s, i, now) {
  syncRun(s, now);
  if (!s.active || s.active.done) return;
  enter(s, runTimeline(s), Math.max(0, i), now);
}

export function togglePauseRun(s, now) {
  const a = s.active;
  if (!a || a.done) return;
  if (a.pausedLeft != null) { a.end = now + a.pausedLeft; a.pausedLeft = null; } else a.pausedLeft = Math.max(0, a.end - now);
}

// ±5 s to the current phase: saved in the program (the stretch's own time there), the run follows
export function adjustRunPhase(s, delta, now) {
  const st = runState(s, now);
  if (!st || !st.phase) return;
  const sec = Math.max(5, st.phase.dur + delta);
  if (sec === st.phase.dur) return;
  savePhaseLength(findProgram(s, st.a.programId), st.phase, sec);
  syncRun(s, now);
}

// one more full round at the end, for this run only
export function addRunRound(s) {
  if (s.active && !s.active.done) s.active.extraRounds = (s.active.extraRounds || 0) + 1;
}

// ✕: an unfinished run goes into history with what was held (the hold going on as far as it went); then it's gone
export function closeRun(s, now) {
  const a = s.active;
  if (!a) return;
  if (!a.done) {
    const tl = runTimeline(s);
    if (tl.length && a.at) {
      const { i } = locate(tl, a.at);
      const left = a.pausedLeft != null ? a.pausedLeft : a.end - now;
      credit(a, tl[i], tl[i].dur - Math.max(0, left) / 1000);
    }
    record(s, false, now);
  }
  delete s.active;
}

// cancelled: the run is dropped and nothing of it goes into history
export function discardRun(s) {
  if (s.active && !s.active.done) delete s.active;
}
