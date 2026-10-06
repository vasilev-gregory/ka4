// Stretching actions. Each takes the stretching part of the data (`data.stretch`, an immer draft inside
// upStretch()) and mutates it, so stretching code can't touch strength data.
import { progTitle, uid } from "../core/util.js";
import { stTiming } from "./stretch.js";

// a quick run's program: made up on the spot, lives in the run (s.active.program), not among the programs
export const QUICK = "quick";

export const findProgram = (s, id) => (id === QUICK ? s.active && s.active.program : s.programs.find((x) => x.id === id));

export function createProgram(s, id) {
  s.programs.push({ id, name: "", timing: { ...s.defaults }, items: [] });
}

export function removeProgram(s, id) {
  s.programs = s.programs.filter((x) => x.id !== id);
}

export function createExercise(s, ex) {
  s.exercises.push(ex);
}

// patch: fields to set; a field set to undefined is removed
export function updateExercise(s, id, patch) {
  const e = s.exercises.find((x) => x.id === id);
  if (!e) return;
  Object.entries(patch).forEach(([k, v]) => { if (v === undefined) delete e[k]; else e[k] = v; });
}

export function setProgramTiming(p, key, value) {
  p.timing = { ...stTiming(p), [key]: value };
}

// a stretch appears once per program; repeats come from rounds
export function addToProgram(p, exercises) {
  exercises.forEach((ex) => { if (!p.items.some((it) => it.exerciseId === ex.id)) p.items.push({ exerciseId: ex.id }); });
}

export function setItemTiming(p, i, key, value) {
  p.items[i].over = { ...(p.items[i].over || {}), [key]: value };
}

export function clearItemTiming(p, i, key) {
  delete p.items[i].over[key];
}

const PHASE_FIELD = { work: "work", rest: "rest", prep: "prep", switch: "sw", roundRest: "roundRest" };

// A phase's length changed in the player: saved at the lowest level, i.e. this stretch's own time in the
// program (the rest between rounds is a program setting).
export function savePhaseLength(p, phase, seconds) {
  if (phase.k === "roundRest") { setProgramTiming(p, "roundRest", seconds); return; }
  const field = PHASE_FIELD[phase.k];
  p.items.forEach((it) => { if (it.exerciseId === phase.ex.id) it.over = { ...(it.over || {}), [field]: seconds }; });
}

export function recordSession(s, p, { programId, startedAt, finishedAt, complete, work }) {
  s.sessions.push({ id: uid(), programId, name: progTitle(p, "Растяжка"), startedAt, finishedAt, complete, work });
}

export function removeSession(s, id) {
  s.sessions = s.sessions.filter((x) => x.id !== id);
}

// a program left with no name and nothing in it (made by «+ Новая программа», then left) is dropped
export function dropEmptyProgram(s, id) {
  const p = s.programs.find((x) => x.id === id);
  if (p && !p.name.trim() && !p.items.length) removeProgram(s, id);
}
