// Splits: programs grouped into a week. Which of the active split's programs were done this week and which is next.
import { weekStartOf } from "../core/util.js";

export const activeSplit = (d) => (d.splits || []).find((s) => s.id === d.activeSplitId) || null;

// The split's week so far: done[i] — the workout of this week that did item i (each workout counts once, so a
// program twice in the split needs two), or null; next — the first item not done (-1: the week is complete)
export function splitWeek(split, workouts, now = Date.now()) {
  const from = weekStartOf(now);
  const week = workouts.filter((w) => w.startedAt >= from && w.startedAt <= now && w.programId);
  const used = new Set();
  const done = split.items.map((it) => {
    const w = week.find((x) => x.programId === it.programId && !used.has(x));
    if (w) used.add(w);
    return w || null;
  });
  return { done, next: done.findIndex((w) => !w) };
}

// the split's programs, in its order (a program removed meanwhile is skipped)
export const splitPrograms = (split, programs) => split.items.map((it) => programs.find((p) => p.id === it.programId)).filter(Boolean);

// Per program of the split, for its row: { done: this week's workouts that did it, times: how often it is in the split,
// next: it is the one to do now }; and the split's order of program ids (each once)
export function splitMarks(split, workouts, now = Date.now()) {
  const { done, next } = splitWeek(split, workouts, now);
  const marks = {};
  split.items.forEach((it, i) => {
    const m = marks[it.programId] || (marks[it.programId] = { done: [], times: 0, next: false });
    m.times++;
    if (done[i]) m.done.push(done[i]);
    if (i === next) m.next = true;
  });
  return { marks, order: Object.keys(marks), doneCount: done.filter(Boolean).length, total: split.items.length };
}

// the split a program's editor shows the week of: the active one if the program is in it, else the first that has it
export function splitOf(d, programId) {
  const has = (s) => s.items.some((it) => it.programId === programId);
  const a = activeSplit(d);
  return a && has(a) ? a : (d.splits || []).find(has) || null;
}
