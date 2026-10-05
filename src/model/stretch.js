// Stretching domain logic: timing inheritance, timeline for the player, weekly minutes per area.
import { DAY, fmtDur } from "../core/util.js";
import { ST_DEFAULTS, ST_WEEK_MAX, ST_WEEK_MIN } from "./catalog.js";

export const stExMap = (data) => Object.fromEntries(data.stretch.exercises.map((e) => [e.id, e]));

export const stTiming = (p, it) => ({ ...ST_DEFAULTS, ...(p.timing || {}), ...((it && it.over) || {}) });

// unrolls a program into a flat list of timed phases
export function buildTimeline(p, exMap) {
  const T = stTiming(p);
  const items = p.items.map((it) => ({ ex: exMap[it.exerciseId], t: stTiming(p, it) })).filter((x) => x.ex);
  const out = [];
  const rounds = Math.max(1, T.rounds || 1);
  const doItem = (x, withPrep) => {
    const { t, ex } = x;
    if (withPrep && t.prep > 0) out.push({ k: "prep", ex, dur: t.prep });
    const sides = ex.sides ? ["левая сторона", "правая сторона"] : [null];
    sides.forEach((side, i) => {
      if (i > 0 && t.sw > 0) out.push({ k: "switch", ex, dur: t.sw });
      out.push({ k: "work", ex, side, dur: t.work });
    });
    if (t.rest > 0) out.push({ k: "rest", ex, dur: t.rest });
  };
  if (T.mode === "sequence") {
    items.forEach((x) => { for (let r = 0; r < rounds; r++) doItem(x, r === 0); });
  } else {
    for (let r = 0; r < rounds; r++) {
      items.forEach((x) => doItem(x, true));
      if (r < rounds - 1 && T.roundRest > 0) out.push({ k: "roundRest", dur: T.roundRest });
    }
  }
  const cleaned = out.filter((ph, i) => !(ph.k === "rest" && out[i + 1] && out[i + 1].k === "roundRest"));
  while (cleaned.length && (cleaned[cleaned.length - 1].k === "rest" || cleaned[cleaned.length - 1].k === "roundRest")) cleaned.pop();
  return cleaned;
}

export const PHASE = { prep: "Вступление", work: "Работа", switch: "Смена стороны", rest: "Отдых", roundRest: "Отдых между кругами" };

// seconds of hold per area in a week, counted per side (left side or one-sided holds only)
export function stretchWeek(data, ws) {
  const we = ws + 7 * DAY + 3600e3;
  const exMap = stExMap(data);
  const areas = {};
  const days = new Set();
  data.stretch.sessions.filter((s) => s.startedAt >= ws && s.startedAt < we).forEach((s) => {
    days.add(new Date(s.startedAt).toDateString());
    Object.entries(s.work || {}).forEach(([exId, sec]) => {
      const area = (exMap[exId] && exMap[exId].area) || "без группы";
      areas[area] = (areas[area] || 0) + sec;
    });
  });
  return { areas, days: days.size };
}

export function stretchVerdict(sec) {
  if (sec >= ST_WEEK_MAX) return ["максимум", "bg-accent-400 text-black", "дальше прирост почти не растёт"];
  if (sec >= ST_WEEK_MIN) return ["есть эффект", "bg-teal-900 text-teal-200", `до максимума эффекта ещё ${fmtDur((ST_WEEK_MAX - sec) * 1000)}`];
  return ["мало", "bg-neutral-800 text-neutral-400", `до минимума ещё ${fmtDur((ST_WEEK_MIN - sec) * 1000)}`];
}
