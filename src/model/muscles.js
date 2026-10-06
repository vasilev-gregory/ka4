// Muscles: which muscles an exercise works (main = 1, helping = 0.5), hard sets per muscle over a period,
// and the growth status of a weekly amount. Pure data and queries; the body picture lives in ui/BodyMap.
import { DAY, slug } from "../core/util.js";

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
  ["ноги", /sumo-deadlift|сумо/, { glutes: 1, hams: 1, quads: 0.5, lowback: 0.5 }],
  ["ноги", /romanian-deadlift|kettlebell|румын|мертв|гир/, { hams: 1, glutes: 1, lowback: 0.5 }],
  ["ноги", /hip-thrust|glute-bridge|ягодичн|мост/, { glutes: 1, hams: 0.5 }],
  ["ноги", /abduction|side-leg-raise|отведен|мах/, { glutes: 1 }],
  ["ноги", /lunge|split-squat|single-leg-squat|выпад|болгар|сплит|пистолет|зашагив/, { quads: 1, glutes: 1 }],
  ["ноги", null, { quads: 1, glutes: 0.5 }],
  // rear and front before lateral: "махи в наклоне", "махи перед собой" are not lateral raises
  ["плечи", /reverse|rear-delt|задн|обратн|наклон/, { reardelt: 1, traps: 0.5 }],
  ["плечи", /front-raise|перед собой|вперед/, { frontdelt: 1 }],
  ["плечи", /upright-row|подбород|протяжк/, { sidedelt: 1, traps: 0.5 }],
  ["плечи", /lateral-raise|мах|развед|в сторон/, { sidedelt: 1 }],
  ["плечи", null, { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 }],
  ["грудь", /dips|брус/, { chest: 1, triceps: 1, frontdelt: 0.5 }],
  ["грудь", /crossover|fly|svend|кроссовер|развод|развед|сведен|бабочк|пек|свенд/, { chest: 1, frontdelt: 0.5 }],
  ["грудь", /close-grip|узк/, { chest: 1, triceps: 1 }],
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
  ["трицепс", /bench-press|жим/, { triceps: 1, chest: 0.5 }],
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

// one calendar week from its Monday (an hour of slack for the DST switch)
export const weekLoad = (workouts, exMap, ws) => muscleLoad(workouts, exMap, ws, ws + 7 * DAY + 3600e3);

// Rough evidence-based weekly targets per muscle (Schoenfeld et al. meta-analyses, RP volume landmarks): hard sets
// taken close to failure; 10+ sets and 2+ sessions a week is the sweet spot, ~4–9 sets still grows, under 4 is
// roughly maintenance, past 20 recovery suffers. Returns [key, label]: "low" | "grow" | "optimal" | "high".
export function growthStatus(sets, freq) {
  if (sets < 4) return ["low", "мало"];
  if (sets > 20) return ["high", "очень много"];
  if (sets >= 10 && freq >= 2) return ["optimal", "оптимум"];
  return ["grow", "рост"];
}

// what a muscle's week still needs
export function weekHint(sets, freq) {
  if (sets < 4) return `ещё ${fmtSets(4 - sets)} до роста`;
  if (sets < 10) return `ещё ${fmtSets(10 - sets)} до оптимума`;
  if (sets > 20) return "больше уже мешает восстановлению";
  if (freq < 2) return "объём есть, нужна ещё одна тренировка на неделе";
  return "неделя закрыта";
}
const fmtSets = (n) => `${String(Math.ceil(n * 2) / 2).replace(".", ",")} подх.`;
