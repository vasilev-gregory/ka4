// Stretching domain logic: timing inheritance, timeline for the player, seconds of hold per muscle area
// (done in a period, or planned by a program) and how a week's amount compares with the evidence.
import { fmtDur } from "../core/util.js";
import { averageWeeks, inPeriod, weekEnd } from "./calendar.js";
import { ST_DEFAULTS, ST_WEEK_MAX, ST_WEEK_MIN } from "./catalog.js";

// all functions here take the stretching part of the data (data.stretch)
export const stExMap = (s) => Object.fromEntries(s.exercises.map((e) => [e.id, e]));

const LEFT = "левая сторона", RIGHT = "правая сторона";
// a phase whose hold counts: work, one side only (the left side, or a one-sided stretch)
export const countsHold = (ph) => !!ph && ph.k === "work" && ph.side !== RIGHT;

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
    const sides = ex.sides ? [LEFT, RIGHT] : [null];
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

// Muscle areas on the body map: the shapes an area lights up (ids of ui/bodyMapData). An area without
// shapes (the stretch has none) is shown in the list only.
export const NO_AREA = "без группы";
export const AREA_PARTS = {
  "сгибатели бедра": ["hipflex"], "квадрицепс": ["quads"], "задняя поверхность бедра": ["hams"], "ягодицы": ["glutes"],
  "приводящие": ["adductors"], "икры": ["calves"], "широчайшие": ["lats"], "грудь": ["chest"],
  "плечи": ["frontdelt", "sidedelt", "reardelt"], "спина": ["lowback"], "шея": ["traps"], [NO_AREA]: [],
};
export const areaOf = (ex) => (ex && ex.area) || NO_AREA;

// add seconds of a stretch to its area: { sec, by: { exerciseId: sec } }
function credit(areas, ex, exId, sec) {
  const a = areas[areaOf(ex)] || (areas[areaOf(ex)] = { sec: 0, by: {} });
  a.sec += sec;
  a.by[exId] = (a.by[exId] || 0) + sec;
  return a;
}

// Seconds of hold per area for sessions started in [from, to), counted per side (the left side or one-sided holds):
// { days: days with stretching, areas: { area: { sec, freq: days the area was stretched, by } } }
export function stretchLoad(s, from, to) {
  const exMap = stExMap(s);
  const areas = {};
  const days = new Set();
  const areaDays = {};
  s.sessions.filter((x) => x.startedAt >= from && x.startedAt < to).forEach((x) => {
    const day = new Date(x.startedAt).toDateString();
    days.add(day);
    Object.entries(x.work || {}).forEach(([exId, sec]) => {
      credit(areas, exMap[exId], exId, sec);
      (areaDays[areaOf(exMap[exId])] ||= new Set()).add(day);
    });
  });
  Object.entries(areas).forEach(([k, a]) => { a.freq = areaDays[k].size; });
  return { days: days.size, areas };
}

export const stretchWeek = (s, ws) => stretchLoad(s, ws, weekEnd(ws));

// A month or a year at a glance: sessions, time spent, and seconds per area averaged over the started weeks
// (perWeek: area -> { sec, freq, by }; by is the whole period's)
export function stretchPeriod(s, range, now = Date.now()) {
  const list = inPeriod(s.sessions, range);
  const { weeks, perWeek } = averageWeeks(range, now, (ws) => stretchWeek(s, ws).areas);
  return { sessions: list.length, time: list.reduce((t, x) => t + (x.finishedAt - x.startedAt), 0), weeks, perWeek };
}

// One run of a program as planned: seconds of hold per area, per side, like a session counts them: { area: { sec, by } }
export function stretchPlan(p, exMap) {
  const areas = {};
  buildTimeline(p, exMap).filter(countsHold).forEach((ph) => credit(areas, ph.ex, ph.ex.id, ph.dur));
  return areas;
}

// A week's seconds for an area against the evidence: [key, label]: "low" | "effect" | "max"
export function stretchVerdict(sec) {
  if (sec >= ST_WEEK_MAX) return ["max", "максимум"];
  if (sec >= ST_WEEK_MIN) return ["effect", "есть эффект"];
  return ["low", "мало"];
}

// what an area's week still needs
export function stretchHint(sec) {
  if (sec >= ST_WEEK_MAX) return "дальше прирост почти не растёт";
  if (sec >= ST_WEEK_MIN) return `до максимума эффекта ещё ${fmtDur((ST_WEEK_MAX - sec) * 1000)}`;
  return `до минимума ещё ${fmtDur((ST_WEEK_MIN - sec) * 1000)}`;
}
