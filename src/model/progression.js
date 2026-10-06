// Progressive overload watch: an exercise done the same way several workouts in a row (same working weight, reps not
// growing) gets a next step — more reps in its range, or more weight with fewer reps — shown in the running workout
// and put into the set hints. Workouts «не в зачёт» are skipped. Pure; time-free.
import { fmtNum, num, plural } from "../core/util.js";
import { counts } from "./workout.js";
import { equipmentOf } from "./equipment.js";

export const STALL_AFTER = 3; // sessions in a row the same

// the smallest sensible weight step for the exercise's equipment, kg
function stepOf(ex) {
  const eq = equipmentOf(ex);
  if (eq.includes("barbell")) return 2.5;
  if (eq.includes("kettlebell")) return 4;
  if (eq.includes("dumbbell")) return 2;
  if (eq.includes("machine")) return 5;
  return 2.5; // cable, own weight with a belt, unknown
}

// one session's working sets: the top weight and the reps done at it
function topOf(sets) {
  const work = sets.filter((s) => s.done !== false && s.t !== "w" && num(s.r) > 0);
  if (!work.length) return null;
  const w = Math.max(...work.map((s) => num(s.w)));
  const at = work.filter((s) => num(s.w) === w);
  return { w, reps: at.map((s) => num(s.r)), n: at.length };
}
const minReps = (t) => Math.min(...t.reps);
const repsSum = (t) => t.reps.reduce((a, b) => a + b, 0);

// The stall of an exercise and what to do next, or null:
// { n: sessions the same, w, r: the reps of last time's lightest set at that weight, next: { w, r }, why }
export function nextStep(workouts, ex) {
  if (!ex || ex.kind === "cardio") return null;
  const tops = [];
  for (let i = workouts.length - 1; i >= 0 && tops.length < 12; i--) {
    if (!counts(workouts[i])) continue;
    const e = workouts[i].exercises.find((x) => x.exerciseId === ex.id);
    const t = e && topOf(e.sets);
    if (t) tops.push(t);
  }
  if (tops.length < STALL_AFTER) return null;
  const last = tops[0];
  // the run of sessions at the same weight that didn't add reps (looking back from the latest)
  let n = 1;
  while (n < tops.length && tops[n].w === last.w && repsSum(last) <= repsSum(tops[n])) n++;
  if (n < STALL_AFTER) return null;
  const r = minReps(last);
  if (ex.kind === "time") return { n, w: last.w, r, next: { w: last.w, r: r + 5 }, why: "+5 секунд" };
  if (ex.assist) { // less help is the progress
    const w = Math.max(0, last.w - stepOf(ex));
    return { n, w: last.w, r, next: { w, r }, why: `помощь −${fmtNum(last.w - w)} кг` };
  }
  const step = stepOf(ex);
  const small = last.w > 0 && step / last.w > 0.1; // a step that big is a jump: grow reps longer first
  const ceiling = small ? 15 : 12;
  if (last.w === 0 || (r >= 7 && r < ceiling)) return { n, w: last.w, r, next: { w: last.w, r: r + 1 }, why: "+1 повтор в каждом подходе" };
  if (r <= 6) return { n, w: last.w, r, next: { w: last.w + step, r }, why: `+${fmtNum(step)} кг, те же повторы` };
  return { n, w: last.w, r, next: { w: last.w + step, r: Math.max(6, r - 3) }, why: `+${fmtNum(step)} кг, повторов меньше` };
}

// the stall and the step as words: { was: "3 тренировки подряд 60 кг × 8", now: "60 кг × 9", why }
export function stepText(st, ex) {
  const one = (w, r) => (ex.kind === "time" ? `${r} с` : `${w ? `${fmtNum(w)} кг × ` : ""}${r}`);
  return { was: `${st.n} ${plural(st.n, "тренировка", "тренировки", "тренировок")} подряд ${one(st.w, st.r)}`, now: one(st.next.w, st.next.r), why: st.why };
}
