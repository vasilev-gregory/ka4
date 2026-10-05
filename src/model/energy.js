// Energy: an estimate of the kcal a workout burned, from body weight, time and MET values (catalog.js).
import { num } from "../core/util.js";
import { CARDIO, CARDIO_MET_DEFAULT, STRENGTH_MET } from "./catalog.js";
import { durations } from "./workout.js";

const kcalOf = (met, kg, min) => (met * kg * min) / 60;

// one cardio stretch: r = minutes, w = km (optional). Speed outside believable bounds is ignored (a typo).
export function cardioKcal(ex, s, bw) {
  const min = num(s.r), km = num(s.w);
  if (!(min > 0)) return 0;
  const c = CARDIO[ex.id] || {};
  const kmh = km > 0 ? km / (min / 60) : 0;
  if (c.pace === "row" && kmh > 0) {
    const secPerM = (min * 60) / (km * 1000);
    const watts = 2.8 / secPerM ** 3; // Concept2: watts from pace
    if (watts >= 20 && watts <= 700) return ((4 * watts + 300) * min) / 60; // Concept2 kcal/h, weight-independent
  }
  if (!(bw > 0)) return null;
  if ((c.pace === "run" || c.pace === "walk") && kmh >= 2 && kmh <= 25) {
    const mPerMin = (kmh * 1000) / 60;
    const vo2 = 3.5 + (c.pace === "walk" && kmh < 8 ? 0.1 : 0.2) * mPerMin; // ACSM walking / running, flat
    return kcalOf(vo2 / 3.5, bw, min);
  }
  return kcalOf(c.met || CARDIO_MET_DEFAULT, bw, min);
}

// Whole workout: cardio by its own cost, the rest of the workout's time (only if it had strength sets) as
// strength training. Null when there is no body weight to count with.
export function workoutKcal(w, exMap, bwAt, now = Date.now()) {
  const bw = bwAt(w.startedAt);
  let cardio = 0, cardioMin = 0, strength = false, unknown = false;
  w.exercises.forEach((e) => {
    const ex = exMap[e.exerciseId];
    e.sets.forEach((s) => {
      if (!s.done || s.t === "w") return;
      if (ex && ex.kind === "cardio") {
        const k = cardioKcal(ex, s, bw);
        if (k == null) unknown = true; else cardio += k;
        cardioMin += num(s.r);
      } else strength = true;
    });
  });
  if (!(bw > 0) && (strength || unknown)) return null;
  const { main, extra } = durations(w, now);
  const strengthMin = strength ? Math.max(0, (main + extra) / 60000 - cardioMin) : 0;
  return Math.round(cardio + kcalOf(STRENGTH_MET, bw || 0, strengthMin));
}
