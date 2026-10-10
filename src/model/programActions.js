// Program actions: making, filling and removing strength programs (a program from a finished workout too). Each takes
// the app data (an immer draft inside up()) and mutates it; the running workout's actions are in workoutActions.js.
import { num } from "../core/util.js";
import { CARDIO_PLAN, programItem } from "./workout.js";

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
