// Built-in reference data: muscle groups, exercise catalog, bodyweight shares, stretch catalog, columns.
export const GROUPS = ["ноги", "плечи", "грудь", "спина", "бицепс", "трицепс", "предплечья", "икры", "кор", "кардио"];

export const SEED_EX = [
  ["Squat", "Приседания со штангой", "ноги"],
  ["Belt squat", "Присед с поясом", "ноги"],
  ["Hack squat", "Гакк-присед", "ноги"],
  ["Bulgarian split squat", "Болгарские выпады", "ноги"],
  ["Leg extension", "Разгибание ног в тренажёре", "ноги"],
  ["Leg curl", "Сгибание ног в тренажёре", "ноги"],
  ["Hip thrust", "Ягодичный мост со штангой", "ноги"],
  ["Lateral raise", "Махи гантелями в стороны", "плечи"],
  ["Overhead press", "Жим штанги стоя", "плечи"],
  ["Upright row", "Тяга штанги к подбородку", "плечи"],
  ["Reverse fly", "Обратные разведения в наклоне", "плечи"],
  ["Barbell bench press", "Жим штанги лёжа", "грудь"],
  ["Incline barbell bench press", "Жим штанги на наклонной скамье", "грудь"],
  ["Dumbbell bench press", "Жим гантелей лёжа", "грудь"],
  ["Dips", "Брусья на грудь", "грудь"],
  ["Cable crossover", "Сведение рук в кроссовере", "грудь"],
  ["Machine pec fly", "Бабочка (сведение рук в тренажёре)", "грудь"],
  ["Lat pulldown", "Тяга верхнего блока", "спина"],
  ["Pull up", "Подтягивания средним хватом", "спина"],
  ["Bent-over barbell row", "Тяга штанги в наклоне", "спина"],
  ["Seated row", "Тяга нижнего блока сидя", "спина"],
  ["Machine row", "Тяга в рычажном тренажёре", "спина"],
  ["Pullover", "Пуловер", "спина"],
  ["Cable pullover", "Пуловер в кроссовере стоя (прямыми руками)", "спина"],
  ["Rope cable pullover", "Пуловер на блоке с канатом", "спина"],
  ["Lying cable pullover", "Пуловер лёжа на нижнем блоке", "спина"],
  ["Barbell pullover", "Пуловер со штангой", "спина"],
  ["Decline barbell pullover", "Пуловер со штангой на скамье с наклоном вниз", "спина"],
  ["EZ-bar pullover", "Пуловер с EZ-грифом", "спина"],
  ["Bent-arm dumbbell pullover", "Пуловер с гантелью согнутыми руками", "спина"],
  ["Machine pullover", "Пуловер в тренажёре", "спина"],
  ["One-arm cable pullover", "Пуловер одной рукой в кроссовере", "спина"],
  ["Cable preacher curl", "Сгибания на Скотте в блоке", "бицепс"],
  ["Dumbbell seated curl", "Сгибания с гантелями сидя", "бицепс"],
  ["Machine preacher curl", "Сгибания на Скотте в тренажёре", "бицепс"],
  ["Cable extension", "Разгибания рук на блоке", "трицепс"],
  ["Cable extension samurai", "Разгибания на блоке из-за головы (самурай)", "трицепс"],
  ["Triceps kickback", "Разгибание назад в наклоне (лыжник)", "трицепс"],
  ["Triceps press machine", "Жим на трицепс в тренажёре", "трицепс"],
  ["Wrist curl", "Сгибания запястий", "предплечья"],
  ["Calf raise", "Подъёмы на носки", "икры"],
  ["Deadlift", "Становая тяга", "кор"],
  ["Farmer's walk", "Прогулка фермера", "кор", "time"],
  // from GymKeeper list
  ["Duck press", "Жим «уточка»", "плечи"],
  ["Reverse pec deck", "Обратные разведения в тренажёре на заднюю дельту (пекдек)", "плечи"],
  ["Plate overhead press", "Жим блина над головой", "плечи"],
  ["Dumbbell shoulder press", "Жим гантелей над головой стоя", "плечи"],
  ["Cable shoulder press", "Жим над головой в нижнем блоке", "плечи"],
  ["Machine shoulder press", "Жим над головой в тренажёре", "плечи"],
  ["Lying rear delt raise", "Махи лёжа на заднюю дельту", "плечи"],
  ["Rear delt row", "Тяга на задние дельты", "плечи"],
  ["Kettlebell lift", "Подъём гири", "ноги"],
  ["Side leg raise", "Боковые махи ногой", "ноги"],
  ["Horizontal leg press", "Жим ногами горизонтальный", "ноги"],
  ["Cable hip abduction", "Отведение ноги в кроссовере", "ноги"],
  ["Bodyweight squat", "Приседания без веса", "ноги"],
  ["Dumbbell squat", "Приседания с гантелями", "ноги"],
  ["Smith machine squat", "Приседания в Смите", "ноги"],
  ["Barbell hack squat", "Гакк-приседания со штангой", "ноги"],
  ["Cable back row", "Тяга в кроссовере на спину", "спина"],
  ["Assisted pull-up", "Подтягивания в гравитроне", "спина"],
  ["Inverted row", "Подтягивания на нижней перекладине", "спина"],
  ["Dumbbell bent-over row", "Тяга гантелей в наклоне", "спина"],
  ["Close-grip dumbbell press", "Жим гантелей узким хватом", "грудь"],
  ["Svend press", "Жим Свенда", "грудь"],
  ["Cable bench press", "Жим лёжа в нижнем блоке", "грудь"],
  ["Smith machine bench press", "Жим лёжа в Смите", "грудь"],
  ["Incline dumbbell press", "Жим гантелей на наклонной", "грудь"],
  ["Incline cable press", "Жим на наклонной в нижнем блоке", "грудь"],
  ["Incline Smith press", "Жим на наклонной в Смите", "грудь"],
  ["One-arm cable shoulder press", "Жим над головой одной рукой в блоке", "плечи"],
  ["One-arm machine shoulder press", "Жим над головой одной рукой в тренажёре", "плечи"],
  ["One-arm reverse pec deck", "Обратные разведения в тренажёре одной рукой (пекдек)", "плечи"],
  ["One-arm rear delt row", "Тяга на заднюю дельту одной рукой", "плечи"],
  ["Single-leg leg press", "Жим одной ногой", "ноги"],
  ["One-arm cable row", "Тяга одной рукой в кроссовере", "спина"],
  ["One-arm cable chest press", "Жим одной рукой в нижнем блоке", "грудь"],
  ["One-arm incline dumbbell press", "Жим гантели одной рукой на наклонной", "грудь"],
  ["One-arm incline cable press", "Жим одной рукой на наклонной в блоке", "грудь"],
  // from GymKeeper (second phone)
  ["Sumo deadlift", "Становая тяга сумо", "ноги"],
  ["Romanian deadlift", "Румынская тяга со штангой", "ноги"],
  ["Lying leg curl", "Сгибание ног лёжа в тренажёре", "ноги"],
  ["Machine chest press", "Жим от груди сидя в тренажёре", "грудь"],
  ["Push-up", "Отжимания", "грудь"],
  ["Close-grip chin-up", "Подтягивания обратным узким хватом", "спина"],
  ["Barbell curl", "Сгибание рук со штангой", "бицепс"],
  ["Triceps dips", "Брусья на трицепс", "трицепс"],
  ["Single-leg lying leg curl", "Сгибание одной ноги лёжа", "ноги"],
  ["One-arm machine chest press", "Жим от груди одной рукой в тренажёре", "грудь"],
  ["One-arm push-up", "Отжимания на одной руке", "грудь"],
  // unilateral variations
  ["Single-leg leg extension", "Разгибание одной ноги в тренажёре", "ноги"],
  ["Single-leg leg curl", "Сгибание одной ноги в тренажёре", "ноги"],
  ["Single-leg hip thrust", "Ягодичный мост на одной ноге", "ноги"],
  ["Single-leg Romanian deadlift", "Румынская тяга на одной ноге", "ноги"],
  ["Single-leg calf raise", "Подъёмы на носок одной ногой", "икры"],
  ["One-arm lateral raise", "Махи одной рукой в сторону", "плечи"],
  ["One-arm shoulder press", "Жим гантели одной рукой стоя", "плечи"],
  ["One-arm upright row", "Тяга к подбородку одной рукой", "плечи"],
  ["One-arm reverse fly", "Обратные разведения одной рукой", "плечи"],
  ["One-arm dumbbell bench press", "Жим гантели одной рукой лёжа", "грудь"],
  ["Single-arm cable crossover", "Сведение одной рукой в кроссовере", "грудь"],
  ["One-arm machine pec fly", "Бабочка одной рукой", "грудь"],
  ["One-arm lat pulldown", "Тяга верхнего блока одной рукой", "спина"],
  ["One-arm seated row", "Тяга нижнего блока одной рукой", "спина"],
  ["One-arm machine row", "Тяга в рычажном тренажёре одной рукой", "спина"],
  ["One-arm dumbbell row", "Тяга гантели одной рукой в наклоне", "спина"],
  ["One-arm cable preacher curl", "Сгибание на Скотте одной рукой в блоке", "бицепс"],
  ["One-arm machine preacher curl", "Сгибание на Скотте одной рукой в тренажёре", "бицепс"],
  ["One-arm seated dumbbell curl", "Сгибание гантели одной рукой сидя", "бицепс"],
  ["One-arm cable extension", "Разгибание одной рукой на блоке", "трицепс"],
  ["One-arm cable extension samurai", "Разгибание одной рукой на блоке из-за головы", "трицепс"],
  ["One-arm triceps kickback", "Разгибание назад одной рукой (лыжник)", "трицепс"],
  ["One-arm triceps press machine", "Жим на трицепс одной рукой в тренажёре", "трицепс"],
  ["One-arm wrist curl", "Сгибание запястья одной рукой", "предплечья"],
  ["Suitcase carry", "Прогулка фермера одной рукой", "кор", "time"],
  // from the history imported from Hevy / GymKeeper (with the one-sided variations that were done)
  ["Front squat", "Фронтальные приседания со штангой", "ноги"],
  ["Dumbbell front squat", "Фронтальные приседания с гантелями", "ноги"],
  ["Leg press", "Жим ногами под углом (45°)", "ноги"],
  ["Dumbbell lunge", "Выпады с гантелями", "ноги"],
  ["Barbell lunge", "Выпады со штангой", "ноги"],
  ["Single-leg squat", "Приседания на одной ноге (пистолет)", "ноги"],
  ["Close-grip bench press", "Жим штанги узким хватом", "трицепс"],
  ["Incline dumbbell fly", "Разводка гантелей на наклонной", "грудь"],
  ["Hammer Strength press", "Жим в рычажном тренажёре Hammer", "грудь"],
  ["One-arm Hammer Strength press", "Жим одной рукой в рычажном тренажёре Hammer", "грудь"],
  ["Decline push-up", "Отжимания с ногами на возвышении", "грудь"],
  ["T-bar row", "Тяга Т-грифа в наклоне", "спина"],
  ["Incline dumbbell row", "Тяга гантелей лёжа на наклонной", "спина"],
  ["Close-grip lat pulldown", "Тяга верхнего блока узким хватом", "спина"],
  ["Machine lat pulldown", "Тяга сверху в рычажном тренажёре", "спина"],
  ["One-arm machine lat pulldown", "Тяга сверху одной рукой в рычажном тренажёре", "спина"],
  ["Wide-grip pull-up", "Подтягивания широким хватом", "спина"],
  ["Close-grip pull-up", "Подтягивания узким хватом", "спина"],
  ["Hyperextension", "Гиперэкстензия", "спина"],
  ["Barbell shrug", "Шраги со штангой", "спина"],
  ["Dumbbell shrug", "Шраги с гантелями", "спина"],
  ["Seated barbell press", "Жим штанги сидя", "плечи"],
  ["Seated dumbbell press", "Жим гантелей над головой сидя", "плечи"],
  ["Cable lateral raise", "Махи в сторону на нижнем блоке", "плечи"],
  ["One-arm cable lateral raise", "Мах одной рукой в сторону на нижнем блоке", "плечи"],
  ["Dumbbell front raise", "Подъёмы гантелей перед собой", "плечи"],
  ["Cable front raise", "Подъёмы перед собой на нижнем блоке", "плечи"],
  ["One-arm cable front raise", "Подъём одной рукой перед собой на блоке", "плечи"],
  ["Cable reverse fly", "Обратные разведения на блоке", "плечи"],
  ["Dumbbell upright row", "Тяга гантелей к подбородку", "плечи"],
  ["Machine upright row", "Тяга к подбородку в тренажёре", "плечи"],
  ["Dumbbell curl", "Сгибания с гантелями стоя", "бицепс"],
  ["One-arm dumbbell curl", "Сгибание гантели одной рукой стоя", "бицепс"],
  ["Incline dumbbell curl", "Сгибания с гантелями на наклонной скамье", "бицепс"],
  ["Barbell preacher curl", "Сгибания на Скотте со штангой", "бицепс"],
  ["Cable curl", "Сгибания на нижнем блоке", "бицепс"],
  ["One-arm cable curl", "Сгибание одной рукой на нижнем блоке", "бицепс"],
  ["Machine curl", "Сгибания рук в тренажёре", "бицепс"],
  ["Seated overhead barbell extension", "Французский жим сидя со штангой", "трицепс"],
  ["Bench dips", "Обратные отжимания от скамьи", "трицепс"],
  ["Crunch", "Скручивания", "кор"],
  ["Cable crunch", "Скручивания на блоке", "кор"],
  ["Machine crunch", "Скручивания в тренажёре", "кор"],
  ["Hanging knee raise", "Подъём коленей в висе", "кор"],
  ["Lying leg raise", "Подъём ног лёжа", "кор"],
  ["Bird dog", "Птица-собака", "кор"],
  ["Burpee", "Бёрпи", "кор"],
  // cardio: a "set" is a stretch of minutes, with an optional distance
  ["Treadmill run", "Бег на дорожке", "кардио", "cardio"],
  ["Running", "Бег на улице", "кардио", "cardio"],
  ["Treadmill walk", "Ходьба на дорожке", "кардио", "cardio"],
  ["Elliptical", "Эллипс", "кардио", "cardio"],
  ["Rowing machine", "Гребной тренажёр", "кардио", "cardio"],
  ["Exercise bike", "Велотренажёр", "кардио", "cardio"],
  ["Stair climber", "Степпер-лестница", "кардио", "cardio"],
  ["Jump rope", "Скакалка", "кардио", "cardio"],
  // from «Дневник тренировок»
  ["Decline barbell bench press", "Жим штанги лёжа головой вниз", "грудь"],
  ["Barbell rear delt row", "Тяга штанги в наклоне на задние дельты", "плечи"],
  ["Machine lateral raise", "Махи в стороны в тренажёре", "плечи"],
  ["Seated calf raise", "Подъёмы на носки сидя в тренажёре", "икры"],
  ["Smith machine shoulder press", "Жим над головой в Смите", "плечи"],
  ["Standing cable leg curl", "Сгибание ноги стоя в кроссовере", "ноги"],
  ["Dumbbell fly", "Разводка гантелей лёжа", "грудь"],
];

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
