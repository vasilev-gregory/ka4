// The exercise picker's list: search by words, "твои" first, groups, sorting by the shown name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { equipmentOf } from "../../src/model/equipment.js";
import { CLOSEST, exactName, matchesQuery, pickerSections, usageOf } from "../../src/model/picker.js";

const items = [
  { id: "a", name: "Squat", ru: "Присед", group: "ноги" },
  { id: "b", name: "Leg press", ru: "Жим ногами", group: "ноги" },
  { id: "c", name: "Bench press", ru: "Жим лёжа", group: "грудь" },
  { id: "d", name: "Zottman", group: "мои" },
];
const opts = { groupOf: (e) => e.group, groups: ["грудь", "ноги"], nameOf: (e) => e.ru || e.name };

test("words in any order, either language; an exact name", () => {
  assert.ok(matchesQuery(items[1], "ногами жим"));
  assert.ok(matchesQuery(items[1], "leg"));
  assert.ok(!matchesQuery(items[1], "жим лёжа"));
  assert.ok(exactName(items, " присед "));
  assert.ok(!exactName(items, "при"));
});

test("sections: «твои» by use, then groups in order (unknown ones last), each by the shown name", () => {
  const usage = usageOf([{ startedAt: 1, ids: ["a", "a"] }, { startedAt: 5, ids: ["c"] }, { startedAt: 2, ids: ["a"] }], [{ items: [{ exerciseId: "d" }] }]);
  assert.deepEqual(usage.a, { n: 2, last: 2 }); // once per session
  assert.deepEqual(usage.d, { n: 0.5, last: 0 });
  const s = pickerSections(items, { ...opts, usage });
  assert.deepEqual(s.map(([g, l]) => [g, l.map((e) => e.id)]), [["твои", ["a", "c", "d"]], ["ноги", ["b"]]]);
  const plain = pickerSections(items, { ...opts, query: "жим" });
  assert.deepEqual(plain.map(([g, l]) => [g, l.map((e) => e.id)]), [["грудь", ["c"]], ["ноги", ["b"]]]);
  assert.deepEqual(pickerSections(items, { ...opts, keep: (e) => e.group === "мои" }).map(([g]) => g), ["мои"]);
});

test("search ignores endings, «ё» and small words; nothing with every word: the closest ones", () => {
  const ex = [
    { id: "p", name: "Reverse pec deck", ru: "Обратные разведения в тренажёре на заднюю дельту (пекдек)", group: "плечи" },
    { id: "r", name: "Reverse fly", ru: "Обратные разведения в наклоне", group: "плечи" },
    { id: "s", name: "Squat", ru: "Приседания со штангой", group: "ноги" },
  ];
  assert.ok(matchesQuery(ex[0], "обратное разведение на тренажере"));
  assert.ok(matchesQuery(ex[0], "задняя дельта"));
  const q = "обратных разведений на заднюю дельту сидя в тренажере"; // "сидя" is in no name
  const s = pickerSections(ex, { ...opts, query: q });
  assert.deepEqual(s.map(([g, l]) => [g, l.map((e) => e.id)]), [[CLOSEST, ["p"]]]);
  assert.deepEqual(pickerSections(ex, { ...opts, query: "жим ногами лёжа" }), []); // too far: nothing
});

test("equipment: from the names, the table for built-ins that don't say it, «свой вес» only when nothing else", () => {
  assert.deepEqual(equipmentOf({ id: "x", name: "Мой жим гантелей" }), ["dumbbell"]);
  assert.deepEqual(equipmentOf({ id: "cable-crunch", name: "Cable crunch", ru: "Скручивания на блоке" }), ["cable"]);
  assert.deepEqual(equipmentOf({ id: "crunch", name: "Crunch", ru: "Скручивания" }), ["body"]);
  assert.deepEqual(equipmentOf({ id: "barbell-hack-squat", name: "Barbell hack squat", ru: "Гакк-приседания со штангой" }), ["barbell"]);
  assert.deepEqual(equipmentOf({ id: "reverse-fly", name: "Reverse fly", ru: "Обратные разведения в наклоне" }), ["dumbbell"]);
  assert.deepEqual(equipmentOf({ id: "x", name: "Что-то своё", equip: ["machine"] }), ["machine"]); // the user's choice wins
  assert.deepEqual(equipmentOf({ id: "run", name: "Run", kind: "cardio" }), []);
});

test("every built-in exercise has its equipment", async () => {
  const { seed } = await import("../../src/model/state.js");
  const none = seed().exercises.filter((e) => e.kind !== "cardio" && !equipmentOf(e).length).map((e) => e.id);
  assert.deepEqual(none, []);
});

test("picker: found by the other names an exercise goes by — built-in ones and the user's own", () => {
  const list = [
    { id: "hip-thrust", name: "Hip thrust", ru: "Ягодичный мост со штангой", group: "ноги" },
    { id: "x", name: "Zottman curl", aka: "сгибания Зоттмана", group: "бицепс" },
  ];
  assert.ok(matchesQuery(list[0], "glute bridge"));
  assert.ok(matchesQuery(list[0], "ягодичный мостик"));
  assert.ok(matchesQuery(list[1], "зоттман"));
  assert.ok(!matchesQuery(list[1], "мостик"));
});
