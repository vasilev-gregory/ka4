// Equipment of an exercise (barbell, dumbbells, machine, cable…) for the picker's filter: the user's choice
// (ex.equip) wins, then the table for built-ins whose names don't say it (or say it misleadingly), then the names;
// «свой вес» only when nothing else is named (a crunch on a cable is a cable exercise).
import { slug } from "../core/util.js";

// [key, label, pattern over "english-slug russian name"]; an exercise may have several (a Smith machine is both)
export const EQUIPMENT = [
  ["barbell", "штанга", /barbell|штанг|ez-bar|t-bar|smith|смит|^squat|^deadlift|^hip-thrust|good-morning|станов|sumo/],
  ["dumbbell", "гантели", /dumbbell|гантел/],
  ["kettlebell", "гиря", /kettlebell|гир/],
  ["machine", "тренажёр", /machine|тренаж|пекдек|pec-deck|hack|гакк|leg-press|жим ног|leg-extension|leg-curl|belt|пояс|гравитрон|assisted/],
  ["cable", "блок", /cable|блок|кроссовер|pulldown|верхн|rope|канат/],
  ["body", "свой вес", new RegExp("push-up|pull-up|chin-up|dips|брус|отжим|подтяг|bodyweight|без веса|single-leg-squat|пистолет|crunch|скручив|"
    + "knee-raise|leg-raise|bird-dog|burpee|бёрпи|берпи|hyperextension|гиперэкст|plank|планк")],
];
export const EQUIP_NAME = Object.fromEntries(EQUIPMENT.map(([k, l]) => [k, l]));

// built-ins whose names don't say what they're done with
const BUILT_IN = {
  "bulgarian-split-squat": ["dumbbell"], "reverse-fly": ["dumbbell"], "pullover": ["dumbbell"], "triceps-kickback": ["dumbbell"],
  "wrist-curl": ["barbell", "dumbbell"], "calf-raise": ["machine"], "farmer-s-walk": ["dumbbell"], "duck-press": ["dumbbell"],
  "plate-overhead-press": ["barbell"], "lying-rear-delt-raise": ["dumbbell"], "rear-delt-row": ["dumbbell"],
  "side-leg-raise": ["body"], "inverted-row": ["body"], "svend-press": ["barbell"], "one-arm-rear-delt-row": ["dumbbell"],
  "single-leg-glute-bridge": ["body"], "single-leg-hip-thrust": ["body"], "single-leg-romanian-deadlift": ["dumbbell"],
  "single-leg-calf-raise": ["body"], "one-arm-lateral-raise": ["dumbbell"], "one-arm-upright-row": ["dumbbell", "cable"],
  "one-arm-reverse-fly": ["dumbbell"], "one-arm-triceps-kickback": ["dumbbell"], "one-arm-wrist-curl": ["dumbbell"],
  "suitcase-carry": ["dumbbell"], "bench-dips": ["body"], "barbell-hack-squat": ["barbell"],
  "machine-lat-pulldown": ["machine"], "one-arm-machine-lat-pulldown": ["machine"],
};

// what an exercise is done with: [key…], maybe empty (cardio, or nothing known)
export function equipmentOf(ex) {
  if (!ex || ex.kind === "cardio") return [];
  if (Array.isArray(ex.equip)) return ex.equip;
  if (BUILT_IN[ex.id]) return BUILT_IN[ex.id];
  const hay = `${slug(ex.name || "")} ${(ex.ru || "").toLowerCase().replace(/ё/g, "е")} ${(ex.name || "").toLowerCase()}`;
  const found = EQUIPMENT.filter(([, , re]) => re.test(hay)).map(([k]) => k);
  const named = found.filter((k) => k !== "body");
  if (named.length) return named;
  return found.length || ex.bw || ex.assist ? ["body"] : [];
}
