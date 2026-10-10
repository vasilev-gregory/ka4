// Muscles: which muscles an exercise works (main = 1, helping = 0.5), hard sets per muscle over a period,
// and the growth status of a weekly amount. Pure data and queries; the body picture lives in ui/BodyMap.
import { fmtNum, slug } from "../core/util.js";
import { periodOf, weekEnd } from "./calendar.js";

// [id, name, coarse group (catalog GROUPS)]; this order is the order of lists. The trapezius is two: its upper part (the
// slope from the neck: shrugs, carries) and, with the rhomboids under it, the middle of the back between the shoulder
// blades (rows, face pulls) — «ромбовидные»
export const MUSCLES = [
  ["chest", "грудь", "грудь"],
  ["frontdelt", "передняя дельта", "плечи"], ["sidedelt", "средняя дельта", "плечи"], ["reardelt", "задняя дельта", "плечи"],
  ["lats", "широчайшие", "спина"], ["traps", "верх трапеций", "спина"], ["midback", "ромбовидные", "спина"],
  ["lowback", "разгибатели спины", "спина"],
  ["biceps", "бицепс", "бицепс"], ["triceps", "трицепс", "трицепс"], ["forearms", "предплечья", "предплечья"],
  ["quads", "квадрицепс", "ноги"], ["glutes", "ягодицы", "ноги"], ["hams", "бицепс бедра", "ноги"], ["calves", "икры", "икры"],
  ["abs", "пресс", "кор"], ["obliques", "косые мышцы живота", "кор"],
];
export const MUSCLE_NAME = Object.fromEntries(MUSCLES.map(([id, name]) => [id, name]));

// [group, pattern, muscles]: the first rule that matches wins; a rule without a pattern is the group's default.
// A pattern sees the slug of a built-in's English name, and also the lower-cased name of the user's own exercise —
// those are mostly Russian, so each pattern has Russian stems too ("махи … в стороны").
const RULES = [
  ["ноги", /leg-extension|разгибан/, { quads: 1 }],
  ["ноги", /leg-curl|сгибан/, { hams: 1 }],
  ["ноги", /sumo-deadlift|тяг.*сумо|сумо.*тяг/, { glutes: 1, hams: 1, quads: 0.5, lowback: 0.5 }],
  ["ноги", /romanian-deadlift|good-morning|swing|румын|мертв|мах.*гир/, { hams: 1, glutes: 1, lowback: 0.5 }], // a kettlebell lift is a squat (default)
  ["ноги", /hip-thrust|glute-bridge|ягодичн|мост/, { glutes: 1, hams: 0.5 }],
  ["ноги", /abduction|kickback|side-leg-raise|отведен|мах/, { glutes: 1 }],
  ["ноги", /adduction|сведени/, { hams: 1 }], // the adductors aren't on the map: the big one (magnus) is the "fourth hamstring"
  ["ноги", /lunge|split-squat|step-up|single-leg-squat|выпад|болгар|сплит|пистолет|зашагив/, { quads: 1, glutes: 1 }],
  ["ноги", null, { quads: 1, glutes: 0.5 }],
  // rear and front before lateral: "махи в наклоне", "махи перед собой" are not lateral raises
  ["плечи", /reverse|rear-delt|face-pull|задн|обратн|в наклоне|наклонившись/, { reardelt: 1, midback: 0.5 }],
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
  ["спина", /hyperextension|superman|гиперэкст|супермен/, { lowback: 1, glutes: 0.5, hams: 0.5 }],
  ["спина", /chin-up|подтяг.*обратн|обратн.*подтяг/, { lats: 1, biceps: 1 }],
  ["спина", /pulldown|pull-up|подтяг|верхн/, { lats: 1, biceps: 0.5, midback: 0.5 }],
  // bent over with nothing under the chest: the spinal erectors hold the torso
  ["спина", /bent-over|t-bar|т-гриф|штанг.*наклон/, { lats: 1, midback: 1, reardelt: 0.5, biceps: 0.5, lowback: 0.5 }],
  ["спина", null, { lats: 1, midback: 1, reardelt: 0.5, biceps: 0.5 }], // rows: the shoulder blades squeezed together
  ["бицепс", null, { biceps: 1 }],
  ["трицепс", /dips|брус/, { triceps: 1, chest: 0.5, frontdelt: 0.5 }],
  ["трицепс", /bench-press|close-grip|узк/, { triceps: 1, chest: 0.5 }],
  ["трицепс", null, { triceps: 1 }],
  ["предплечья", null, { forearms: 1 }],
  ["икры", null, { calves: 1 }],
  ["кор", /deadlift$|^станов|^мертв/, { glutes: 1, hams: 1, lowback: 1, quads: 0.5, traps: 0.5 }],
  // holding still against a pull to one side (anti-rotation, anti-side-bend): the obliques
  ["кор", /waiter|над головой/, { frontdelt: 1, traps: 1, obliques: 0.5 }],
  ["кор", /get-up|турецк/, { obliques: 1, frontdelt: 1, glutes: 0.5 }],
  ["кор", /suitcase|одной рук/, { obliques: 1, forearms: 1, traps: 0.5 }],
  ["кор", /walk|carry|прогулк|фермер|перенос/, { forearms: 1, traps: 1, abs: 0.5 }],
  ["кор", /pallof|side-plank|woodchop|twist|cross-crunch|паллоф|боков|поворот|русск|перекр/, { obliques: 1, abs: 0.5 }],
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

// The user's change of one muscle of an exercise: none -> main (1) -> helping 50% -> helping 25% -> none. Returns the
// new muscles map, starting from what the exercise works now; empty means "back to the rules".
export const MUSCLE_STEPS = [1, 0.5, 0.25];
export function cycleMuscle(ex, m) {
  const cur = { ...musclesOf(ex) };
  const next = cur[m] ? MUSCLE_STEPS.find((k) => k < cur[m]) : 1;
  if (next) cur[m] = next; else delete cur[m];
  return cur;
}

// Hard sets of one exercise in a workout: done, not warm-ups, RIR 0–3; a drop set counts once.
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
  programs.forEach((p, pi) => p.items.forEach((it) => { // pi: a program twice in a split is two workouts
    const share = Object.entries(musclesOf(exMap[it.exerciseId]));
    if (!it.sets || !share.length) return;
    share.forEach(([m, k]) => {
      const t = muscles[m] || (muscles[m] = { sets: 0, progs: new Set(), by: {} });
      t.sets += it.sets * k;
      t.by[it.exerciseId] = (t.by[it.exerciseId] || 0) + it.sets * k;
      if (k >= 1) t.progs.add(pi);
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
export const WEEK_GROW = 4, WEEK_GOOD = 10, WEEK_GREAT = 20, WEEK_CAP = 30;

// A week's hard sets for a muscle: [key, label]: "low" | "grow" | "optimal" | "high". Worded as steps up, not as a
// shortfall: «поддержка» (keeps what is there, too little to grow) → «рост» (growing already) → «оптимум» →
// «максимум»; past 30 «предел».
export function growthStatus(sets) {
  if (sets < WEEK_GROW) return ["low", "поддержка"];
  if (sets < WEEK_GOOD) return ["grow", "рост"];
  if (sets < WEEK_GREAT) return ["optimal", "оптимум"];
  if (sets <= WEEK_CAP) return ["optimal", "максимум"];
  return ["high", "предел"];
}

// what a muscle's week reached and the next step
export function weekHint(sets) {
  if (sets < WEEK_GROW) return `начало есть · до зоны роста ещё ${fmtSets(WEEK_GROW - sets)}`;
  if (sets < WEEK_GOOD) return `уже растёт ✓ · до оптимума ещё ${fmtSets(WEEK_GOOD - sets)}`;
  if (sets < WEEK_GREAT) return `оптимум ✓ · до максимума ещё ${fmtSets(WEEK_GREAT - sets)}`;
  if (sets <= WEEK_CAP) return "максимум ✓ — неделя выжата";
  return "больше 30 в неделю прироста уже почти не даёт";
}

// One workout on its own scale, whatever the week looks like: per session growth rises with hard sets up to ~11
// (Remmert et al.: no detectable gain past that); the lower steps are practical guides — 3 hard sets (fractional: a
// helping muscle's set is half) is a session that grows the muscle, 6–11 a full one.
export const SESSION_GROW = 3, SESSION_GOOD = 6, SESSION_CAP = 11;
// Every extra set in the window is a step of its own, so each one pays off: [from sets, label, chip key]
export const SESSION_STEPS = [
  [0, "поддержка", "low"], [3, "есть рост", "grow"], [4, "хороший рост", "grow"], [5, "крепкий рост", "grow"],
  [6, "оптимальный рост", "optimal"], [7, "сильный рост", "optimal"], [9, "мощный рост", "optimal"], [11, "максимальный рост", "optimal"],
];
const stepOf = (sets) => SESSION_STEPS.filter(([from]) => sets >= from).length - 1;
export function sessionStatus(sets) {
  if (sets > SESSION_CAP) return ["high", "мышце хватит"];
  const [, label, key] = SESSION_STEPS[stepOf(sets)];
  return [key, label];
}
// The joke on a step's chip: the weight stack of a basement gym, signed from «амёба» up — all its 17 plates spread over
// the scale's 0–cap hard sets (one workout: 0–11, every half set counts; a week: 0–30), and past the cap the last one
export const SESSION_NICKS = ["амёба", "инфузория", "дрыщ", "пацан", "самец", "мужик", "качок", "билдер", "лифтёр", "машина",
  "терминатор", "мистер Олимпия", "биоробот", "животное", "чёрный бог", "80 lvl", "мутант"];
export const muscleNick = (sets, cap = SESSION_CAP) =>
  (sets > cap ? "кто ты, тварь?" : SESSION_NICKS[Math.min(SESSION_NICKS.length - 1, Math.floor((sets * (SESSION_NICKS.length - 1)) / cap))]);

// what one workout gave a muscle and the next step; week: the muscle's sets of that week so far (this workout
// included), shown as context, or null (a program's plan has no week)
export function sessionHint(sets, week = null) {
  const wk = week == null ? "" : ` · за неделю ${fmtNum(week)} из ${WEEK_GOOD}`;
  if (sets > SESSION_CAP) return `этой мышце на сегодня хватит — силы лучше отдать другой группе${wk}`;
  const i = stepOf(sets);
  const next = SESSION_STEPS[i + 1];
  // the step reached is on the chip already: the hint says the next one
  return next ? `ещё ${fmtSets(next[0] - sets)} — «${next[1]}»${wk}` : `взято всё — можно переключаться на другую группу${wk}`;
}

const fmtSets = (n) => `${fmtNum(Math.ceil(n * 2) / 2)} подх.`;
