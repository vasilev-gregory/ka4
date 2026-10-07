// Muscles: which muscles an exercise works (main = 1, helping = 0.5), hard sets per muscle over a period,
// and the growth status of a weekly amount. Pure data and queries; the body picture lives in ui/BodyMap.
import { fmtNum, slug } from "../core/util.js";
import { periodOf, weekEnd } from "./calendar.js";

// [id, name, coarse group (catalog GROUPS)]; this order is the order of lists
export const MUSCLES = [
  ["chest", "грудь", "грудь"],
  ["frontdelt", "передняя дельта", "плечи"], ["sidedelt", "средняя дельта", "плечи"], ["reardelt", "задняя дельта", "плечи"],
  ["lats", "широчайшие", "спина"], ["traps", "трапеции и ромбы", "спина"], ["lowback", "поясница", "спина"],
  ["biceps", "бицепс", "бицепс"], ["triceps", "трицепс", "трицепс"], ["forearms", "предплечья", "предплечья"],
  ["quads", "квадрицепс", "ноги"], ["glutes", "ягодицы", "ноги"], ["hams", "бицепс бедра", "ноги"], ["calves", "икры", "икры"],
  ["abs", "пресс", "кор"],
];
export const MUSCLE_NAME = Object.fromEntries(MUSCLES.map(([id, name]) => [id, name]));

// [group, pattern, muscles]: the first rule that matches wins; a rule without a pattern is the group's default.
// A pattern sees the slug of a built-in's English name, and also the lower-cased name of the user's own exercise —
// those are mostly Russian, so each pattern has Russian stems too ("махи … в стороны").
const RULES = [
  ["ноги", /leg-extension|разгибан/, { quads: 1 }],
  ["ноги", /leg-curl|сгибан/, { hams: 1 }],
  ["ноги", /sumo-deadlift|тяг.*сумо|сумо.*тяг/, { glutes: 1, hams: 1, quads: 0.5, lowback: 0.5 }],
  ["ноги", /romanian-deadlift|kettlebell|румын|мертв|гир/, { hams: 1, glutes: 1, lowback: 0.5 }],
  ["ноги", /hip-thrust|glute-bridge|ягодичн|мост/, { glutes: 1, hams: 0.5 }],
  ["ноги", /abduction|side-leg-raise|отведен|мах/, { glutes: 1 }],
  ["ноги", /lunge|split-squat|single-leg-squat|выпад|болгар|сплит|пистолет|зашагив/, { quads: 1, glutes: 1 }],
  ["ноги", null, { quads: 1, glutes: 0.5 }],
  // rear and front before lateral: "махи в наклоне", "махи перед собой" are not lateral raises
  ["плечи", /reverse|rear-delt|задн|обратн|в наклоне|наклонившись/, { reardelt: 1, traps: 0.5 }],
  ["плечи", /front-raise|перед собой|вперед/, { frontdelt: 1 }],
  ["плечи", /upright-row|подбород|протяжк/, { sidedelt: 1, traps: 0.5 }],
  ["плечи", /lateral-raise|мах|развед|в сторон/, { sidedelt: 1 }],
  ["плечи", null, { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 }],
  ["грудь", /dips|брус/, { chest: 1, triceps: 1, frontdelt: 0.5 }],
  ["грудь", /crossover|fly|svend|кроссовер|развод|развед|сведен|бабочк|пек|свенд/, { chest: 1, frontdelt: 0.5 }],
  ["грудь", /close-grip|узк/, { chest: 1, triceps: 1 }],
  ["грудь", /decline|обратн.*наклон|головой вниз/, { chest: 1, frontdelt: 0.5, triceps: 0.5 }],
  ["грудь", /incline|наклон/, { chest: 1, frontdelt: 1, triceps: 0.5 }],
  ["грудь", null, { chest: 1, frontdelt: 0.5, triceps: 0.5 }],
  ["спина", /cable-pullover|machine-pullover|пуловер.*(блок|тренаж)|(блок|тренаж).*пуловер/, { lats: 1 }],
  ["спина", /pullover|пуловер/, { lats: 1, chest: 0.5 }],
  ["спина", /shrug|шраг/, { traps: 1 }],
  ["спина", /hyperextension|гиперэкст/, { lowback: 1, glutes: 0.5, hams: 0.5 }],
  ["спина", /chin-up|подтяг.*обратн|обратн.*подтяг/, { lats: 1, biceps: 1 }],
  ["спина", /pulldown|pull-up|подтяг|верхн/, { lats: 1, biceps: 0.5, traps: 0.5 }],
  ["спина", null, { lats: 1, traps: 1, reardelt: 0.5, biceps: 0.5 }], // rows
  ["бицепс", null, { biceps: 1 }],
  ["трицепс", /dips|брус/, { triceps: 1, chest: 0.5, frontdelt: 0.5 }],
  ["трицепс", /bench-press|close-grip|узк/, { triceps: 1, chest: 0.5 }],
  ["трицепс", null, { triceps: 1 }],
  ["предплечья", null, { forearms: 1 }],
  ["икры", null, { calves: 1 }],
  ["кор", /^deadlift|^станов|^мертв/, { glutes: 1, hams: 1, lowback: 1, quads: 0.5, traps: 0.5 }],
  ["кор", /walk|carry|прогулк|фермер|перенос/, { forearms: 1, traps: 1, abs: 0.5 }],
  ["кор", /bird-dog/, { lowback: 1, abs: 0.5 }],
  ["кор", /burpee|берпи/, { quads: 1, chest: 0.5 }],
  ["кор", null, { abs: 1 }],
];

// The muscles an exercise works: { muscleId: 1 | 0.5 }. The user's choice (ex.muscles) wins; cardio works none here.
export function musclesOf(ex) {
  if (!ex || ex.kind === "cardio") return {};
  if (ex.muscles && Object.keys(ex.muscles).length) return ex.muscles;
  // a built-in's id is the slug of its English name; the user's own exercise is matched by its names as typed
  const name = slug(ex.name || "");
  const own = ex.id !== name;
  const lower = (s) => (s || "").toLowerCase().replace(/ё/g, "е");
  const keys = own ? [name, lower(ex.name), lower(ex.ru)] : [ex.id];
  const rule = RULES.find(([g, re]) => g === ex.group && (!re || keys.some((k) => k && re.test(k))));
  return rule ? rule[2] : {};
}

// The user's change of one muscle of an exercise: none -> main -> helping -> none. Returns the new muscles map,
// starting from what the exercise works now; empty means "back to the rules".
export function cycleMuscle(ex, m) {
  const cur = { ...musclesOf(ex) };
  if (!cur[m]) cur[m] = 1;
  else if (cur[m] >= 1) cur[m] = 0.5;
  else delete cur[m];
  return cur;
}

// Hard sets of one exercise in a workout: done, not warm-ups, RIR 0–3; a drop set / ladder counts once.
export function hardSets(sets) {
  let n = 0;
  sets.forEach((s, i) => {
    if (!s.done || s.t === "w") return;
    if (s.rir != null && s.rir >= 4) return; // too far from failure to count as a hard set
    const cont = s.g && i > 0 && sets[i - 1].g === s.g && sets[i - 1].done;
    if (!cont) n++;
  });
  return n;
}

// Hard sets per muscle for workouts started in [from, to): { days: training days, muscles: { id: { sets, freq, by } } }.
// A helping muscle gets half a set; a day counts towards a muscle's freq when it was a main one that day.
// by: { exerciseId: sets it gave the muscle } — which exercises the sets came from.
export function muscleLoad(workouts, exMap, from, to) {
  const muscles = {};
  const days = new Set();
  workouts.filter((w) => w.startedAt >= from && w.startedAt < to).forEach((w) => {
    const day = new Date(w.startedAt).toDateString();
    w.exercises.forEach((e) => {
      const n = hardSets(e.sets);
      const share = Object.entries(musclesOf(exMap[e.exerciseId]));
      if (!n || !share.length) return;
      days.add(day);
      share.forEach(([m, k]) => {
        const p = muscles[m] || (muscles[m] = { sets: 0, days: new Set(), by: {} });
        p.sets += n * k;
        p.by[e.exerciseId] = (p.by[e.exerciseId] || 0) + n * k;
        if (k >= 1) p.days.add(day);
      });
    });
  });
  const out = {};
  Object.entries(muscles).forEach(([m, p]) => { out[m] = { sets: p.sets, freq: p.days.size, by: p.by }; });
  return { days: days.size, muscles: out };
}

// Planned hard sets per muscle of programs, as if each were done once (a week of a split when all are given):
// { muscles: { id: { sets, freq, by } } }; freq: programs where the muscle is a main one. Cardio adds nothing.
export function programLoad(programs, exMap) {
  const muscles = {};
  programs.forEach((p) => p.items.forEach((it) => {
    const share = Object.entries(musclesOf(exMap[it.exerciseId]));
    if (!it.sets || !share.length) return;
    share.forEach(([m, k]) => {
      const t = muscles[m] || (muscles[m] = { sets: 0, progs: new Set(), by: {} });
      t.sets += it.sets * k;
      t.by[it.exerciseId] = (t.by[it.exerciseId] || 0) + it.sets * k;
      if (k >= 1) t.progs.add(p.id);
    });
  }));
  const out = {};
  Object.entries(muscles).forEach(([m, t]) => { out[m] = { sets: t.sets, freq: t.progs.size, by: t.by }; });
  return { muscles: out };
}

// one calendar week from its Monday
export const weekLoad = (workouts, exMap, ws) => muscleLoad(workouts, exMap, ws, weekEnd(ws));

// What a workout «не в зачёт» still gave, to say it wasn't for nothing: its hard sets, the muscles they went to (most
// first, [name, sets, the week's sets of that muscle]) and which workout of its month it was.
export function stillCounted(workouts, w, exMap) {
  const own = muscleLoad([w], exMap, -Infinity, Infinity).muscles;
  const ws = periodOf("week", w.startedAt).from;
  const week = weekLoad(workouts, exMap, ws).muscles;
  const muscles = MUSCLES.filter(([m]) => own[m]).map(([m, name]) => [name, own[m].sets, week[m] ? week[m].sets : own[m].sets])
    .sort((a, b) => b[1] - a[1]);
  const sets = w.exercises.reduce((n, e) => n + hardSets(e.sets), 0);
  const month = periodOf("month", w.startedAt);
  const nth = workouts.filter((x) => x.startedAt >= month.from && x.startedAt <= w.startedAt).length;
  return { sets, muscles, nth };
}

// Evidence (Pelland et al. 2024/25, 67 studies, sets counted fractionally — a helping muscle gets half — as here):
// growth rises with weekly hard sets with diminishing returns and no detectable gain past ~30 a week; frequency adds
// next to nothing once the volume is the same. Per session (Remmert et al.): more sets help up to ~11 fractional sets,
// past that no detectable gain. Under ~4 a week is roughly maintenance.
export const WEEK_GROW = 4, WEEK_GOOD = 10, WEEK_GREAT = 20, WEEK_CAP = 30, SESSION_CAP = 11;

// A week's hard sets for a muscle: [key, label]: "low" | "grow" | "optimal" | "high".
// ongoing: the week isn't over yet, so "мало" is only "пока мало".
export function growthStatus(sets, ongoing = false) {
  if (sets < WEEK_GROW) return ["low", ongoing ? "пока мало" : "мало"];
  if (sets < WEEK_GOOD) return ["grow", "рост"];
  if (sets < WEEK_GREAT) return ["optimal", "хорошо"];
  if (sets <= WEEK_CAP) return ["optimal", "отлично"];
  return ["high", "предел"];
}

// what a muscle's week still needs
export function weekHint(sets) {
  if (sets < WEEK_GROW) return `ещё ${fmtSets(WEEK_GROW - sets)} до роста`;
  if (sets < WEEK_GOOD) return `ещё ${fmtSets(WEEK_GOOD - sets)} до хорошей недели`;
  if (sets < WEEK_GREAT) return `хорошо; до отличной ещё ${fmtSets(WEEK_GREAT - sets)}`;
  if (sets <= WEEK_CAP) return "отличная неделя";
  return "больше 30 в неделю прироста уже почти не даёт";
}

// One workout's window for a muscle, from how often the muscle is trained in a week: the week's "хорошо" (10) and
// "отлично" (20) split over those workouts, never above what one session can use (11). hits: workouts a week that
// train the muscle. Returns { lo: enough today, hi: as good as it gets today }.
export function sessionWindow(hits) {
  const h = Math.max(1, hits);
  const half = (x) => Math.round(x * 2) / 2;
  const lo = half(Math.min(SESSION_CAP, WEEK_GOOD / h));
  return { lo, hi: half(Math.min(SESSION_CAP, Math.max(lo, WEEK_GREAT / h))) };
}

// How many workouts a week train each muscle: the user's workouts a week (settings.perWeek, default 3) times the
// share of the programs where the muscle is a main one (no programs, or a muscle that only helps in them: every
// workout — its sets come by the way). Returns muscle -> window.
export const PER_WEEK = 3;
export function sessionWindows(d, exMap) {
  const perWeek = (d.settings && d.settings.perWeek) || PER_WEEK;
  const progs = (d.programs || []).filter((p) => p.items.length);
  const share = progs.length ? programLoad(progs, exMap).muscles : null;
  return (m) => sessionWindow(share && share[m] && share[m].freq ? perWeek * (share[m].freq / progs.length) : perWeek);
}

// One workout's sets for a muscle against its window: [key, label]
export function sessionStatus(sets, w) {
  if (sets < w.lo / 2) return ["low", "мало"];
  if (sets < w.lo) return ["grow", "почти"];
  if (sets > SESSION_CAP) return ["high", "перебор за раз"];
  return ["optimal", sets >= w.hi ? "отлично" : "норма"];
}
export function sessionHint(sets, w) {
  if (sets < w.lo) return `до нормы на тренировку ещё ${fmtSets(w.lo - sets)} (норма ${fmtNum(w.lo)}–${fmtNum(w.hi)})`;
  if (sets < w.hi) return `норма; до отличного ещё ${fmtSets(w.hi - sets)}`;
  if (sets <= SESSION_CAP) return "лучше за тренировку не бывает";
  return "больше 11 за раз прироста почти не даёт — лучше на другой день";
}
const fmtSets = (n) => `${fmtNum(Math.ceil(n * 2) / 2)} подх.`;
