// Built-in reference data: muscle groups, exercise catalog, bodyweight shares, stretch catalog, columns.
export const GROUPS = ["ноги", "плечи", "грудь", "спина", "бицепс", "трицепс", "предплечья", "икры", "кор", "кардио"];

export { SEED_EX } from "./seedExercises.js";

// Energy cost of cardio, MET at a moderate effort (Compendium of Physical Activities, 2024). With a distance,
// running and walking use their speed (ACSM equations) and rowing its pace (Concept2 formula) instead.
// Other cardio, including the user's own, counts CARDIO_MET_DEFAULT.
export const CARDIO = {
  "treadmill-run": { met: 9.8, pace: "run" }, "running": { met: 9.8, pace: "run" }, "treadmill-walk": { met: 4.3, pace: "walk" },
  "elliptical": { met: 5 }, "rowing-machine": { met: 7, pace: "row" }, "exercise-bike": { met: 6.8 },
  "stair-climber": { met: 9 }, "jump-rope": { met: 11.8 },
};
export const CARDIO_MET_DEFAULT = 6;
// a strength workout as a whole, rests included: "resistance training, multiple exercises, 8–15 reps" (Compendium 02054)
export const STRENGTH_MET = 3.5;

export const PARTIAL_WEIGHT = 0.3;

// what a set of the exercise holds
export const EX_KINDS = [["reps", "вес и повторы"], ["time", "вес и время"], ["cardio", "кардио: минуты и км"]];

// For exercises where the body is the main load, working load = share of body weight + added weight.
// Shares are rough biomechanics figures. "assist" = machine-assisted (gravitron): load = body weight − assistance.
export const BW_DEFAULTS = {
  "pull-up": 1, "close-grip-pull-up": 1, "close-grip-chin-up": 1, "dips": 0.95, "triceps-dips": 0.95,
  "bodyweight-squat": 0.85, "push-up": 0.65, "one-arm-push-up": 0.65, "inverted-row": 0.55,
  "wide-grip-pull-up": 1, "decline-push-up": 0.75, "bench-dips": 0.5, "single-leg-squat": 0.85,
};

export const ASSIST_DEFAULTS = { "assisted-pull-up": true };

// Effort per set, RP / Israetel style: reps in reserve. 4 means "4 or more".
// Set row columns: order and visibility are user settings. Weight and reps can't be hidden.
export const COLUMNS = { w: "Вес", r: "Повторы / секунды", p: "Частичные повторы", rir: "RIR (повторов в запасе)", rest: "Отдых (в кнопке ✓)" };

// weight and reps are always on, the rest stopwatch in ✓ is on by default; partials and RIR are opt-in (Settings → columns)
export const DEFAULT_COLUMNS = [{ key: "w", on: true }, { key: "r", on: true }, { key: "p", on: false }, { key: "rir", on: false }, { key: "rest", on: true }];

export const MEASURES = [
  ["weight", "Вес", "кг"], ["waist", "Талия", "см"], ["belly", "Живот (макс.)", "см"], ["chest", "Грудь", "см"], ["glutes", "Ягодицы", "см"],
  ["biceps", "Бицепс", "см"], ["thigh", "Бедро", "см"], ["calf", "Голень", "см"], ["neck", "Шея", "см"], ["fat", "Жир", "%"],
];

// Fully separate from strength: own exercises, programs and history. Time-based player.
export const ST_FIELDS = [["prep", "вступление"], ["work", "работа"], ["sw", "смена стороны"], ["rest", "отдых"]];

export const ST_AREAS = ["сгибатели бедра", "квадрицепс", "задняя поверхность бедра", "ягодицы", "приводящие", "икры", "широчайшие", "грудь", "плечи", "спина", "шея"];

export const ST_AREA_DEFAULTS = {
  "st-hip-flexor-forward": "сгибатели бедра", "st-hip-flexor-tall": "сгибатели бедра", "st-figure-four": "ягодицы",
  "st-elephant-walk": "задняя поверхность бедра", "st-lat": "широчайшие", "st-pizza": "приводящие",
};
// earlier names of built-in stretches: renamed in place only if the user didn't change them
export const ST_OLD_NAMES = {
  "st-hip-flexor-forward": "Hip flexor stretch, lean forward", "st-hip-flexor-tall": "Hip flexor stretch, tall torso",
  "st-figure-four": "Figure four", "st-pizza": "Pizza", "st-lat": "Lat stretch",
};

// built-in stretches corrected later: [id, the old Russian name, what changes]; applied once, only to a stretch whose
// Russian name is still the old one (the user didn't touch it)
export const ST_FIXES = [
  ["st-lat", "Широчайшие: на коленях, руки вперёд и в сторону", { ru: "Широчайшие: на коленях, руки вперёд, таз к пяткам" }],
];

// built-in exercises that turned out to be one and the same: [the dropped id, the kept id]; saved data moves over
// (migrate in model/state.js)
export const EX_MERGES = [
  ["barbell-glute-bridge", "hip-thrust"], ["single-leg-glute-bridge", "single-leg-hip-thrust"], ["rear-delt-dumbbell-raise", "reverse-fly"],
];

// other names the built-in exercises go by, for the search only (gym slang, other apps, the other language's
// variants): finding one without knowing how it is written here. The user's own go in an exercise's `aka`.
export const EX_AKA = {
  "squat": "присед приседания back squat",
  "hip-thrust": "glute bridge ягодичный мостик ягодичный подъём хип траст хиптраст",
  "single-leg-hip-thrust": "single leg glute bridge ягодичный мостик на одной ноге хип траст",
  "bulgarian-split-squat": "болгарские сплит приседания split squat болгарка",
  "lateral-raise": "махи в стороны боковые подъёмы side raise разведения гантелей стоя",
  "overhead-press": "армейский жим military press ohp жим над головой",
  "upright-row": "протяжка тяга к подбородку",
  "barbell-bench-press": "жим лёжа жим лежа bench press",
  "dumbbell-bench-press": "жим гантелей лёжа db bench",
  "dips": "брусья отжимания на брусьях chest dips",
  "triceps-dips": "брусья отжимания на брусьях",
  "machine-pec-fly": "бабочка пекдек pec deck",
  "cable-crossover": "кроссовер сведения в кроссовере cable fly",
  "lat-pulldown": "вертикальная тяга тяга к груди",
  "pull-up": "подтягивания прямым хватом стандартным хватом",
  "close-grip-pull-up": "подтягивания узким прямым хватом",
  "reverse-fly": "разведения в наклоне махи на заднюю дельту гантели на заднюю дельту rear delt raise",
  "bent-over-barbell-row": "тяга в наклоне барбелл ров barbell row",
  "seated-row": "горизонтальная тяга cable row тяга блока к поясу",
  "triceps-kickback": "лыжник kickback разгибание руки в наклоне",
  "cable-extension": "разгибания на трицепс pushdown triceps pushdown жим вниз",
  "wrist-curl": "сгибания кистей запястья",
  "calf-raise": "икры подъёмы на носки голень",
  "deadlift": "становая станова тяга",
  "romanian-deadlift": "румынка рдл rdl мёртвая тяга stiff leg",
  "single-leg-romanian-deadlift": "румынка на одной ноге rdl",
  "farmer-s-walk": "фермерская прогулка прогулка фермера",
  "reverse-pec-deck": "обратная бабочка обратный пекдек задняя дельта",
  "hyperextension": "гиперы гипер back extension",
  "barbell-shrug": "шраги трапеции",
  "dumbbell-shrug": "шраги трапеции",
  "leg-press": "жим платформы наклонный тренажёр",
  "dumbbell-shoulder-press": "жим гантелей стоя",
  "seated-dumbbell-press": "жим гантелей сидя",
  "front-squat": "фронтальный присед",
  "seated-overhead-barbell-extension": "французский жим french press skull crusher",
  "close-grip-bench-press": "жим узким хватом",
  "hammer-strength-press": "хаммер hammer",
  "t-bar-row": "т-гриф тяга т грифа",
  "crunch": "пресс скручивания",
  "pallof-press": "антиротация стабилизаторы кор резинка",
  "side-plank": "стабилизаторы кор",
  "waiter-s-walk": "прогулка официанта стабилизаторы",
  "turkish-get-up": "tgu стабилизаторы",
  "hanging-knee-raise": "подъём ног в висе пресс",
  "inverted-row": "австралийские подтягивания горизонтальные подтягивания",
  "assisted-pull-up": "гравитрон",
  "bird-dog": "птица собака",
  "single-leg-squat": "пистолетик pistol squat",
  "leg-extension": "разгибания ног квадрицепс",
  "leg-curl": "сгибания ног бицепс бедра",
  "lying-leg-curl": "сгибания ног лёжа бицепс бедра",
};

// built-in exercises renamed later, the same way: [id, the old Russian name, the new one]
export const EX_RENAMES = [
  ["reverse-pec-deck", "Пекдек на заднюю дельту", "Обратные разведения в тренажёре на заднюю дельту (пекдек)"],
  ["one-arm-reverse-pec-deck", "Пекдек на заднюю дельту одной рукой", "Обратные разведения в тренажёре одной рукой (пекдек)"],
  // the name says which one it is: dips for the chest vs the triceps, standing vs seated, the grip, the machine
  ["dips", "Отжимания на брусьях", "Брусья на грудь"],
  ["pull-up", "Подтягивания", "Подтягивания средним хватом"],
  ["dumbbell-shoulder-press", "Жим гантелей над головой", "Жим гантелей над головой стоя"],
  ["seated-dumbbell-press", "Жим гантелей сидя", "Жим гантелей над головой сидя"],
  ["leg-press", "Жим ногами", "Жим ногами под углом (45°)"],
];

// Thomas et al. 2018 (Int J Sports Med): ≥5 min of static stretching per muscle group per week for ROM gains,
// more frequent (≈5 days/week) is better. Later meta-regressions: returns flatten around ~10 min/week per group.
export const ST_WEEK_MIN = 5 * 60, ST_WEEK_MAX = 10 * 60;

export const ST_DEFAULTS = { prep: 10, work: 30, sw: 5, rest: 15, rounds: 1, roundRest: 60, mode: "circuit" };

export const ST_SEED = [
  ["st-hip-flexor-forward", "Low lunge hip flexor stretch", "Сгибатели бедра: выпад, корпус вперёд", true],
  ["st-hip-flexor-tall", "Kneeling hip flexor stretch, heel to glute", "Сгибатели бедра: на колене, корпус вверх, пятка к ягодице", true],
  ["st-figure-four", "Supine figure four", "Четвёрка лёжа (стопа на стене)", true],
  ["st-elephant-walk", "Elephant walk", "Походка слона", false],
  ["st-pizza", "Pizza (seated straddle fold)", "Пицца: сед ноги врозь, наклон вперёд", false],
  ["st-lat", "Kneeling lat stretch", "Широчайшие: на коленях, руки вперёд, таз к пяткам", false],
];
export const isBuiltInStretch = (id) => ST_SEED.some((r) => r[0] === id);
