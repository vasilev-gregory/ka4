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

test("a corrected built-in stretch is fixed once, unless the user renamed it", () => {
  const d = seed();
  Object.assign(d.stretch.exercises.find((e) => e.id === "st-lat"), { ru: "Широчайшие: на коленях, руки вперёд и в сторону", sides: true });
  const lat = migrate(d).stretch.exercises.find((e) => e.id === "st-lat");
  assert.equal(lat.ru, "Широчайшие: на коленях, руки вперёд, таз к пяткам");
  assert.equal(lat.sides, false);
  const mine = seed();
  Object.assign(mine.stretch.exercises.find((e) => e.id === "st-lat"), { ru: "Моя широчайшая", sides: true });
  assert.equal(migrate(mine).stretch.exercises.find((e) => e.id === "st-lat").sides, true);
});

test("duplicate stretches in a program are merged", () => {
  const d = seed();
  d.stretch.programs.push({ id: "p", name: "x", items: [{ exerciseId: "st-pizza" }, { exerciseId: "st-lat" }, { exerciseId: "st-pizza" }] });
  assert.deepEqual(migrate(d).stretch.programs[0].items.map((i) => i.exerciseId), ["st-pizza", "st-lat"]);
});
