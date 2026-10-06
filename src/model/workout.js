// Strength domain logic: sets, segments, rest, load/volume, program lines. Pure functions over app data.
import { usageOf } from "./picker.js";
import { fmtDur, fmtKg, fmtNum, num } from "../core/util.js";
import { COLUMNS, DEFAULT_COLUMNS, PARTIAL_WEIGHT } from "./catalog.js";

export function lastSession(workouts, exId) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const e = workouts[i].exercises.find((x) => x.exerciseId === exId);
    if (e && e.sets.length) return { workout: workouts[i], sets: e.sets };
  }
  return null;
}

// how many sets a newly added exercise gets: cardio is usually one stretch
export const defaultSets = (ex) => (ex && ex.kind === "cardio" ? 1 : 3);

// cardio plans in a program: minutes, or km
export const CARDIO_PLAN = { min: 20, km: 5 };

// A program line for an exercise: sets to prefill; cardio gets one stretch and a plan (minutes) instead.
export const programItem = (ex) => ({ exerciseId: ex.id, sets: defaultSets(ex), ...(ex.kind === "cardio" ? { min: CARDIO_PLAN.min } : {}) });

// A workout's exercises as program lines (for "update the program?"); cardio plans stay as the program had them.
export function itemsOf(w, program) {
  return w.exercises.map((e) => {
    const was = program.items.find((it) => it.exerciseId === e.exerciseId);
    return { exerciseId: e.exerciseId, sets: e.sets.length || 1, ...(was?.min != null ? { min: was.min } : {}), ...(was?.km != null ? { km: was.km } : {}) };
  });
}

export function buildSets(d, exId, n) {
  const last = lastSession(d.workouts, exId);
  const prev = last ? last.sets : [];
  const count = n || Math.max(prev.length, 3);
  return Array.from({ length: count }, (_, i) => {
    const s = prev[i] || prev[prev.length - 1];
    // values from last time are hints (shown gray), not entered values
    return {
      w: "", r: "", p: "", t: s && s.t === "w" ? "w" : "",
      ...(prev[i] && prev[i].g ? { g: prev[i].g } : {}), hw: s ? s.w : "", hr: s ? s.r : "", hp: s && s.p ? s.p : "", done: false };
  });
}

// A workout can be paused and continued later the same day (gym, then sets at home).
// Each continuation is a segment; the longest one is the "main" session.
export function segmentsOf(w) {
  return w.segments && w.segments.length ? w.segments : [{ start: w.startedAt, end: w.finishedAt }];
}

export function durations(w, now = Date.now()) {
  const segs = segmentsOf(w).map((s) => Math.max(0, (s.end || now) - s.start));
  const main = Math.max(0, ...segs);
  const total = segs.reduce((x, y) => x + y, 0);
  return { main, extra: total - main, count: segs.length };
}

// "7 подх., 4,2 т, кардио 20 мин · 3 км": what a workout's stats() add up to, leaving out what's empty
export function fmtTotals(st) {
  const cardio = st.cardioMin > 0 && `кардио ${fmtNum(st.cardioMin)} мин${st.cardioKm > 0 ? ` · ${fmtNum(st.cardioKm)} км` : ""}`;
  return [st.sets > 0 && `${st.sets} подх.`, st.vol > 0 && fmtKg(st.vol), cardio].filter(Boolean).join(", ") || "0 подх.";
}

export const fmtWDur = (st) => fmtDur(st.dur) + (st.extra >= 60000 ? ` +${fmtDur(st.extra)}` : "");

export function closeSegment(w, t = Date.now()) {
  w.segments = segmentsOf(w).map((s) => ({ ...s }));
  const last = w.segments[w.segments.length - 1];
  if (!last.end) last.end = t;
}


// Gaps between consecutive confirmed sets. Steps of a drop set don't count, nor gaps across a pause
// or longer than 15 min (that's not rest, that's a break).
// rest before each confirmed set: time since the previous confirmed set anywhere in the workout
export function restBefore(w) {
  const evs = [];
  if (w.warmup && w.warmup.doneAt) evs.push({ at: w.warmup.doneAt, ei: -1, si: -1 }); // rest before the first set counts from the warm-up
  w.exercises.forEach((e, ei) => e.sets.forEach((s, si) => { if (s.done && s.at) evs.push({ at: s.at, ei, si, g: s.g }); }));
  evs.sort((a, b) => a.at - b.at);
  const pauses = segmentsOf(w).map((sg) => sg.end).filter(Boolean);
  const out = {};
  for (let i = 1; i < evs.length; i++) {
    const a = evs[i - 1], b = evs[i];
    if (pauses.some((t) => t > a.at && t < b.at)) continue;
    out[`${b.ei}:${b.si}`] = a.ei === b.ei && a.g && a.g === b.g ? "drop" : b.at - a.at;
  }
  return out;
}

// The set where the running "rest so far" stopwatch is shown: the first unconfirmed set after the
// last confirmed one (in this exercise, else in the next ones), or after the warm-up the first set of
// the workout. Null when paused or nothing is running.
export function liveRestKey(w) {
  if (!w || w.paused || !w.lastSetAt) return null;
  let li = -1, ls = -1;
  w.exercises.forEach((e, ei) => e.sets.forEach((s, si) => { if (s.done && s.at === w.lastSetAt) { li = ei; ls = si; } }));
  if (li < 0 && w.warmup && w.warmup.doneAt === w.lastSetAt) li = 0; // ls = -1: from the very first set
  if (li < 0) return null;
  for (let ei = li; ei < w.exercises.length; ei++) {
    const ss = w.exercises[ei].sets;
    for (let si = ei === li ? ls + 1 : 0; si < ss.length; si++) if (!ss[si].done) return `${ei}:${si}`;
  }
  return null;
}

export function restStats(w) {
  const evs = [];
  w.exercises.forEach((e, ei) => e.sets.forEach((s) => { if (s.done && s.at) evs.push({ at: s.at, ei, g: s.g }); }));
  evs.sort((a, b) => a.at - b.at);
  const pauses = segmentsOf(w).map((sg) => sg.end).filter(Boolean);
  const between = { sets: [], ex: [] };
  for (let i = 1; i < evs.length; i++) {
    const a = evs[i - 1], b = evs[i];
    const gap = b.at - a.at;
    if (gap <= 0 || gap > 15 * 60e3) continue;
    if (pauses.some((t) => t > a.at && t < b.at)) continue;
    if (a.ei === b.ei && a.g && a.g === b.g) continue;
    (a.ei === b.ei ? between.sets : between.ex).push(gap);
  }
  const avg = (xs) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : 0);
  return { sets: avg(between.sets), ex: avg(between.ex), nSets: between.sets.length, nEx: between.ex.length };
}

// Body weight on a given day: the latest weight measurement up to that day (same day: last entered),
// else the earliest one after it, else the manual fallback from settings.
export function makeBodyWeightAt(measurements, fallback) {
  return (ts) => bodyWeightAt(measurements, fallback, ts);
}

export function bodyWeightAt(measurements, fallback, ts) {
  const dayEnd = new Date(ts).setHours(23, 59, 59, 999);
  let best = null;
  for (const m of measurements) {
    const v = num(m.values && m.values.weight);
    if (!v) continue;
    // ">=": several measurements on the same day -> the one entered last wins
    if (m.date <= dayEnd && (!best || m.date >= best.date)) best = m;
  }
  if (!best) { // nothing before that day: take the earliest measurement after it
    for (const m of measurements) {
      const v = num(m.values && m.values.weight);
      if (v && (!best || m.date < best.date)) best = m;
    }
  }
  return best ? num(best.values.weight) : num(fallback);
}

// Which exercise name leads (settings.namesRu): returns { nm1: primary, nm2: secondary }.
export function makeNames(ru) {
  return {
    nm1: (ex, missing = "") => (!ex ? missing : ru && ex.ru ? ex.ru : ex.name), // missing: what to show for a deleted one
    nm2: (ex) => (!ex ? "" : ru ? (ex.ru ? ex.name : "") : ex.ru || ""),
  };
}

export function setLoad(ex, s, bw) {
  if (ex && ex.assist) return Math.max(0, bw - num(s.w));
  if (ex && ex.bw) return ex.bw * bw + num(s.w);
  return num(s.w);
}

// Totals of a workout: volume and sets of strength work, minutes and km of cardio, durations.
export function stats(w, exMap, bwAt) {
  let vol = 0, sets = 0, cardioMin = 0, cardioKm = 0;
  const bw = bwAt(w.startedAt);
  w.exercises.forEach((e) => {
    const exd = exMap[e.exerciseId];
    const kind = exd?.kind;
    e.sets.forEach((s, i) => {
      if (!s.done || s.t === "w") return; // warm-ups don't count
      if (kind === "cardio") { cardioMin += num(s.r); cardioKm += num(s.w); return; } // cardio: r = minutes, w = km
      const cont = s.g && i > 0 && e.sets[i - 1].g === s.g && e.sets[i - 1].done;
      if (!cont) sets++; // a drop set / ladder is one set
      // partial reps count as 30% of a full rep
      if (kind !== "time") vol += setLoad(exd, s, bw) * (num(s.r) + PARTIAL_WEIGHT * num(s.p));
    });
  });
  const { main, extra, count } = durations(w);
  return { vol, sets, cardioMin, cardioKm, dur: main, extra, segments: count };
}

export function columnConfig(settings) {
  const saved = (settings && settings.columns) || [];
  const known = saved.filter((c) => COLUMNS[c.key]);
  DEFAULT_COLUMNS.forEach((c) => { if (!known.some((k) => k.key === c.key)) known.push({ ...c }); });
  return known;
}

// rest isn't a real column any more: it's shown inside the ✓ button, so it's excluded here
export const setColumns = (settings) => columnConfig(settings).filter((c) => c.key !== "rest" && (c.on || c.key === "w" || c.key === "r")).map((c) => c.key);

export const restShown = (settings) => columnConfig(settings).some((c) => c.key === "rest" && c.on);

// Sets merged into one (drop set, ladder) share a group id `g` and sit next to each other.
export function setLabels(sets) {
  let n = 0, sub = 0;
  return sets.map((s, i) => {
    const cont = s.g && i > 0 && sets[i - 1].g === s.g;
    if (cont) sub++; else { n++; sub = 0; }
    const grouped = s.g && (cont || (i < sets.length - 1 && sets[i + 1].g === s.g));
    return grouped ? `${n}${"abcdefghij"[sub] || "+"}` : String(n);
  });
}

export function normalizeGroups(sets) {
  const cnt = {};
  sets.forEach((s) => { if (s.g) cnt[s.g] = (cnt[s.g] || 0) + 1; });
  sets.forEach((s) => { if (s.g && cnt[s.g] < 2) delete s.g; });
}

export function fmtSets(sets, kind) {
  if (kind === "cardio") return sets.map((s) => `${fmtNum(num(s.r))} мин${num(s.w) ? ` · ${fmtNum(num(s.w))} км` : ""}`).join(", ");
  const parts = sets
    .map((s) => {
      const base = kind === "time" ? `${num(s.w) ? num(s.w) + " кг × " : ""}${num(s.r)} с` : `${num(s.w)}×${num(s.r)}${num(s.p) ? `+${num(s.p)}` : ""}`;
      if (s.t === "w") return `разм. ${base}`;
      return s.rir === 0 ? `${base} отказ` : s.rir != null ? `${base} RIR${s.rir === 4 ? "4+" : s.rir}` : base;
    });
  return parts.map((p, i) => (i === 0 ? "" : sets[i].g && sets[i - 1].g === sets[i].g ? " → " : ", ") + p).join("");
}

// What the program would look like if it followed this workout; null when nothing differs.
export function programDiff(w, programs) {
  const p = w.programId && programs.find((x) => x.id === w.programId);
  if (!p) return null;
  const items = itemsOf(w, p);
  return JSON.stringify(p.items) === JSON.stringify(items) ? null : { programId: p.id, items };
}

// Latest moment anything happened in a workout: a segment start/end or a confirmed set.
export function lastActivity(w) {
  let t = w.startedAt || 0;
  segmentsOf(w).forEach((sg) => { t = Math.max(t, sg.start || 0, sg.end || 0); });
  w.exercises.forEach((e) => e.sets.forEach((s) => { if (s.done && s.at) t = Math.max(t, s.at); }));
  return t;
}


// how much each exercise is used, for "твои" in the picker (model/picker.js)
export const exerciseUsage = (workouts, programs) =>
  usageOf(workouts.map((w) => ({ startedAt: w.startedAt, ids: w.exercises.map((e) => e.exerciseId) })), programs);

// the previous workout of the same program, or null
export const previousOfProgram = (workouts, w) =>
  (w.programId && [...workouts].reverse().find((x) => x.programId === w.programId && x.startedAt < w.startedAt)) || null;

// an exercise's sessions, newest first: [{ w, sets }]
export function exerciseSessions(workouts, id) {
  const out = [];
  for (let i = workouts.length - 1; i >= 0; i--) {
    const e = workouts[i].exercises.find((x) => x.exerciseId === id);
    if (e) out.push({ w: workouts[i], sets: e.sets });
  }
  return out;
}
