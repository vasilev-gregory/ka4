// Muscles: what each exercise works, hard sets per muscle, statuses and the user's own choice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { cycleMuscle, growthStatus, hardSets, MUSCLES, muscleLoad, musclesOf, weekHint } from "../../src/model/muscles.js";

const exs = seed().exercises;
const ex = (id) => exs.find((e) => e.id === id);

test("every built-in strength exercise works a main muscle we know; cardio works none", () => {
  const known = new Set(MUSCLES.map(([m]) => m));
  exs.forEach((e) => {
    const m = musclesOf(e);
    if (e.kind === "cardio") return assert.deepEqual(m, {});
    assert.ok(Object.values(m).some((k) => k >= 1), `${e.id} has no main muscle`);
    Object.keys(m).forEach((k) => assert.ok(known.has(k), `${e.id}: unknown muscle ${k}`));
  });
});

test("rules: the right heads and parts of the legs", () => {
  assert.deepEqual(musclesOf(ex("lateral-raise")), { sidedelt: 1 });
  assert.deepEqual(musclesOf(ex("reverse-pec-deck")), { reardelt: 1, traps: 0.5 });
  assert.deepEqual(musclesOf(ex("overhead-press")), { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 });
  assert.deepEqual(musclesOf(ex("leg-extension")), { quads: 1 });
  assert.deepEqual(musclesOf(ex("lying-leg-curl")), { hams: 1 });
  assert.deepEqual(musclesOf(ex("single-leg-romanian-deadlift")), { hams: 1, glutes: 1, lowback: 0.5 });
  assert.deepEqual(musclesOf(ex("squat")), { quads: 1, glutes: 0.5 });
  assert.deepEqual(musclesOf(ex("deadlift")), { glutes: 1, hams: 1, lowback: 1, quads: 0.5, traps: 0.5 });
  // the user's own exercise: by its name, else the group's default
  assert.deepEqual(musclesOf({ id: "x1", name: "Cable lateral raise 2", group: "плечи", kind: "reps" }), { sidedelt: 1 });
  assert.deepEqual(musclesOf({ id: "x2", name: "Мой жим", group: "грудь", kind: "reps" }), { chest: 1, frontdelt: 0.5, triceps: 0.5 });
  // own exercises are mostly named in Russian: the rules know Russian stems
  const own = (name, group) => musclesOf({ id: "x3", name, group, kind: "reps" });
  assert.deepEqual(own("Махи гантелями в стороны", "плечи"), { sidedelt: 1 });
  assert.deepEqual(own("Разведения в стороны сидя", "плечи"), { sidedelt: 1 });
  assert.deepEqual(own("Протяжка", "плечи"), { sidedelt: 1, traps: 0.5 });
  assert.deepEqual(own("Махи в наклоне", "плечи"), { reardelt: 1, traps: 0.5 });
  assert.deepEqual(own("Махи перед собой", "плечи"), { frontdelt: 1 });
  assert.deepEqual(own("Жим Арнольда", "плечи"), { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 });
  assert.deepEqual(own("Пуловер на блоке", "спина"), { lats: 1 });
  assert.deepEqual(own("Болгарские выпады", "ноги"), { quads: 1, glutes: 1 });
  assert.deepEqual(own("Сгибания ног лёжа", "ноги"), { hams: 1 });
  assert.deepEqual(musclesOf({ id: "x4", name: "Side raise", ru: "Махи в стороны", group: "плечи", kind: "reps" }), { sidedelt: 1 });
});

test("the user's choice wins; a tap cycles main -> helping -> none; empty = back to the rules", () => {
  const e = { ...ex("lateral-raise") };
  e.muscles = cycleMuscle(e, "traps");
  assert.deepEqual(e.muscles, { sidedelt: 1, traps: 1 });
  e.muscles = cycleMuscle(e, "traps");
  assert.equal(musclesOf(e).traps, 0.5);
  e.muscles = cycleMuscle(e, "traps");
  e.muscles = cycleMuscle(e, "sidedelt");
  e.muscles = cycleMuscle(e, "sidedelt");
  assert.deepEqual(e.muscles, {});
  assert.deepEqual(musclesOf(e), { sidedelt: 1 });
});

test("hard sets per muscle: helping muscles get half, sessions count only as a main muscle", () => {
  const exMap = { squat: ex("squat"), "hip-thrust": ex("hip-thrust") };
  const day = (d) => new Date(2026, 9, d, 18).getTime();
  const sets = (n) => Array.from({ length: n }, () => ({ w: "100", r: "8", done: true }));
  const load = muscleLoad([
    { startedAt: day(5), exercises: [{ exerciseId: "squat", sets: sets(4) }] },
    { startedAt: day(7), exercises: [{ exerciseId: "hip-thrust", sets: [...sets(3), { w: "60", r: "10", done: true, t: "w" }] }] },
  ], exMap, day(5) - 864e5, day(12));
  assert.equal(load.days, 2);
  assert.deepEqual(load.muscles.quads, { sets: 4, freq: 1, by: { squat: 4 } });
  assert.deepEqual(load.muscles.glutes, { sets: 2 + 3, freq: 1, by: { squat: 2, "hip-thrust": 3 } }); // which exercises gave the sets
  assert.deepEqual(load.muscles.hams, { sets: 1.5, freq: 0, by: { "hip-thrust": 1.5 } });
  assert.equal(hardSets([{ done: true }, { done: true, rir: 4 }, { done: true, t: "w" }, { done: true, g: "a" }, { done: true, g: "a" }]), 2);
});

test("growth status and what the week still needs", () => {
  assert.deepEqual(growthStatus(3.5, 1), ["low", "мало"]);
  assert.deepEqual(growthStatus(10, 2), ["optimal", "оптимум"]);
  assert.deepEqual(growthStatus(10, 1), ["grow", "рост"]);
  assert.deepEqual(growthStatus(21, 3), ["high", "очень много"]);
  assert.equal(weekHint(2.5, 1), "ещё 1,5 подх. до роста");
  assert.equal(weekHint(12, 1), "объём есть, нужна ещё одна тренировка на неделе");
});
