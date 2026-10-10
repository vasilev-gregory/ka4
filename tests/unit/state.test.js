// Persistent state: seed and migrate().
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, migrate, SCHEMA_VERSION } from "../../src/model/state.js";

test("migrate is idempotent and fills new fields", () => {
  const d = migrate(seed());
  const again = migrate(structuredClone(d));
  assert.deepEqual(again, d);
  assert.ok(d.stretch && Array.isArray(d.measurements));
  assert.equal(seed().version, SCHEMA_VERSION); assert.equal(d.version, SCHEMA_VERSION);
});

test("old nested drops become linear grouped sets", () => {
  const d = seed();
  d.workouts.push({ id: "w", startedAt: 1, finishedAt: 2, exercises: [{ exerciseId: "squat", sets: [{ w: "80", r: "6", done: true, drops: [{ w: "60", r: "6" }] }] }] });
  const m = migrate(d);
  const ss = m.workouts[0].exercises[0].sets;
  assert.equal(ss.length, 2); assert.ok(ss[0].g && ss[0].g === ss[1].g); assert.equal(ss[0].drops, undefined);
});

test("built-in stretch renamed only if the user kept the old name", () => {
  const d = seed();
  d.stretch.exercises.find((e) => e.id === "st-pizza").name = "Pizza";
  d.stretch.exercises.find((e) => e.id === "st-lat").name = "Моя широчайшая";
  const m = migrate(d);
  assert.match(m.stretch.exercises.find((e) => e.id === "st-pizza").name, /straddle/);
  assert.equal(m.stretch.exercises.find((e) => e.id === "st-lat").name, "Моя широчайшая");
});

test("a corrected built-in stretch name is fixed once, unless the user renamed it", () => {
  const d = seed();
  d.stretch.exercises.find((e) => e.id === "st-lat").ru = "Широчайшие: на коленях, руки вперёд и в сторону";
  assert.equal(migrate(d).stretch.exercises.find((e) => e.id === "st-lat").ru, "Широчайшие: на коленях, руки вперёд, таз к пяткам");
  const mine = seed();
  mine.stretch.exercises.find((e) => e.id === "st-lat").ru = "Моя широчайшая";
  assert.equal(migrate(mine).stretch.exercises.find((e) => e.id === "st-lat").ru, "Моя широчайшая");
});

test("a built-in stretch's sides are always the catalog's; an own stretch keeps its own", () => {
  const d = seed();
  d.stretch.exercises.find((e) => e.id === "st-elephant-walk").sides = true;
  d.stretch.exercises.find((e) => e.id === "st-figure-four").sides = false;
  d.stretch.exercises.push({ id: "st-mine", name: "Моя", sides: true });
  const m = migrate(d).stretch.exercises;
  assert.equal(m.find((e) => e.id === "st-elephant-walk").sides, false);
  assert.equal(m.find((e) => e.id === "st-figure-four").sides, true);
  assert.equal(m.find((e) => e.id === "st-mine").sides, true);
});

test("a stretch may be in a program twice: migrate keeps both", () => {
  const d = seed();
  d.stretch.programs.push({ id: "p", name: "x", items: [{ exerciseId: "st-pizza" }, { exerciseId: "st-lat" }, { exerciseId: "st-pizza" }] });
  assert.deepEqual(migrate(d).stretch.programs[0].items.map((i) => i.exerciseId), ["st-pizza", "st-lat", "st-pizza"]);
});

test("a renamed built-in exercise gets its new Russian name, unless the user renamed it", () => {
  const d = seed();
  d.exercises.find((e) => e.id === "reverse-pec-deck").ru = "Пекдек на заднюю дельту";
  d.exercises.find((e) => e.id === "one-arm-reverse-pec-deck").ru = "Мой пекдек";
  const m = migrate(d);
  assert.match(m.exercises.find((e) => e.id === "reverse-pec-deck").ru, /^Обратные разведения в тренажёре/);
  assert.equal(m.exercises.find((e) => e.id === "one-arm-reverse-pec-deck").ru, "Мой пекдек");
});

test("v4: a saved column setup gets the rest stopwatch back once; switched off later, it stays off", () => {
  const d = seed();
  d.version = 3;
  d.settings.columns = [{ key: "w", on: true }, { key: "r", on: true }, { key: "rest", on: false }];
  const m = migrate(d);
  assert.equal(m.settings.columns.find((c) => c.key === "rest").on, true);
  m.settings.columns.find((c) => c.key === "rest").on = false;
  assert.equal(migrate(m).settings.columns.find((c) => c.key === "rest").on, false);
});

test("merged built-ins: a duplicate goes, its history and plans move to the kept one", () => {
  const d = seed();
  d.exercises.push({ id: "barbell-glute-bridge", name: "Barbell glute bridge", ru: "Ягодичный мостик со штангой", group: "ноги", kind: "reps" });
  d.programs[0].items.push({ exerciseId: "barbell-glute-bridge", sets: 3 });
  d.workouts.push({ id: "w", startedAt: 1, finishedAt: 2, exercises: [{ exerciseId: "barbell-glute-bridge", sets: [{ w: "100", r: "8", done: true }] }] });
  d.active = { exercises: [{ exerciseId: "barbell-glute-bridge", sets: [] }] };
  const m = migrate(d);
  assert.equal(m.exercises.filter((e) => e.id === "barbell-glute-bridge").length, 0);
  assert.equal(m.exercises.filter((e) => e.id === "hip-thrust").length, 1);
  assert.equal(m.programs[0].items.at(-1).exerciseId, "hip-thrust");
  assert.equal(m.workouts[0].exercises[0].exerciseId, "hip-thrust");
  assert.equal(m.active.exercises[0].exerciseId, "hip-thrust");
  assert.equal(seed().exercises.some((e) => e.id === "single-leg-glute-bridge"), false);
});

test("v6: an exercise's own muscles with the trapezius get the middle of the back too, once", () => {
  const d = seed();
  d.version = 5;
  d.exercises.push({ id: "mine", name: "Моя тяга", group: "спина", kind: "reps", muscles: { lats: 1, traps: 1 } });
  const m = migrate(d);
  assert.deepEqual(m.exercises.find((e) => e.id === "mine").muscles, { lats: 1, traps: 1, midback: 1 });
  delete m.exercises.find((e) => e.id === "mine").muscles.midback; // the user takes it off: it stays off
  assert.equal(migrate(m).exercises.find((e) => e.id === "mine").muscles.midback, undefined);
});

test("v7: the first-launch tour is for fresh installs; data from before it counts as having seen it", () => {
  assert.equal(migrate(seed()).settings.tourDone, undefined);
  const old = seed();
  old.version = 6;
  assert.equal(migrate(old).settings.tourDone, true);
});
