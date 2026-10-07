// Muscles: what each exercise works, hard sets per muscle, statuses and the user's own choice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { cycleMuscle, growthStatus, hardSets, MUSCLES, muscleLoad, musclesOf, programLoad, weekHint } from "../../src/model/muscles.js";

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
  // no false matches: an incline bench press among the shoulders, a decline one, french press, sumo squat
  assert.deepEqual(own("Жим гантелей на наклонной скамье", "плечи"), { frontdelt: 1, sidedelt: 0.5, triceps: 0.5 });
  assert.deepEqual(own("Жим лёжа с обратным наклоном", "грудь"), { chest: 1, frontdelt: 0.5, triceps: 0.5 });
  assert.deepEqual(own("Французский жим", "трицепс"), { triceps: 1 });
  assert.deepEqual(own("Приседания сумо", "ноги"), { quads: 1, glutes: 0.5 });
  assert.deepEqual(own("Становая тяга сумо", "ноги"), { glutes: 1, hams: 1, quads: 0.5, lowback: 0.5 });
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
  assert.deepEqual(growthStatus(3.5), ["low", "мало"]);
  assert.deepEqual(growthStatus(6), ["grow", "рост"]);
  assert.deepEqual(growthStatus(10), ["optimal", "хорошо"]); // frequency doesn't matter once the volume is there
  assert.deepEqual(growthStatus(25), ["optimal", "отлично"]);
  assert.deepEqual(growthStatus(31), ["high", "предел"]);
  assert.equal(weekHint(2.5), "ещё 1,5 подх. до роста");
  assert.equal(weekHint(12), "хорошо; до отличной ещё 8 подх.");
});

test("planned load of programs: sets per muscle, freq = programs where it is a main one", () => {
  const exMap = { squat: ex("squat"), "hip-thrust": ex("hip-thrust"), run: { id: "running", kind: "cardio", group: "кардио" } };
  const a = { id: "a", items: [{ exerciseId: "squat", sets: 3 }, { exerciseId: "run", sets: 1, min: 20 }] };
  const b = { id: "b", items: [{ exerciseId: "hip-thrust", sets: 4 }, { exerciseId: "squat", sets: 2 }] };
  assert.deepEqual(programLoad([a], exMap).muscles, { quads: { sets: 3, freq: 1, by: { squat: 3 } }, glutes: { sets: 1.5, freq: 0, by: { squat: 1.5 } } });
  const both = programLoad([a, b], exMap).muscles;
  assert.deepEqual(both.quads, { sets: 5, freq: 2, by: { squat: 5 } });
  assert.deepEqual(both.glutes, { sets: 6.5, freq: 1, by: { squat: 2.5, "hip-thrust": 4 } });
  assert.deepEqual(both.hams, { sets: 2, freq: 0, by: { "hip-thrust": 2 } });
});

test("one workout's norm per muscle: the week's 10–20 split over the workouts that train it, at most 11", async () => {
  const { sessionWindow, sessionWindows, sessionStatus, sessionHint } = await import("../../src/model/muscles.js");
  assert.deepEqual(sessionWindow(3), { lo: 3.5, hi: 6.5 }); // full body three times a week
  assert.deepEqual(sessionWindow(1.5), { lo: 6.5, hi: 11 }); // a split: the muscle in half of three workouts
  assert.deepEqual(sessionWindow(1), { lo: 10, hi: 11 });
  const w = sessionWindow(2); // { lo: 5, hi: 10 }
  assert.deepEqual([1, 3, 5, 10, 12].map((n) => sessionStatus(n, w)[1]), ["мало", "рабочая", "норма", "отлично", "перебор за раз"]);
  assert.equal(sessionHint(2.5, w), "до нормы на тренировку ещё 2,5 подх. (норма 5–10)");
  assert.equal(sessionHint(7, w), "норма; до отличного ещё 3 подх.");
  // from the programs: legs in 2 of 4 programs, 4 workouts a week -> legs twice a week
  const exMap = { squat: { id: "squat", name: "Squat", group: "ноги", kind: "reps" }, bench: { id: "bench", name: "Bench press", group: "грудь", kind: "reps" } };
  let n = 0;
  const P = (ids) => ({ id: `p${n++}`, items: ids.map((id) => ({ exerciseId: id, sets: 3 })) });
  const d = { settings: { perWeek: 4 }, programs: [P(["squat"]), P(["bench"]), P(["squat"]), P(["bench"])] };
  assert.deepEqual(sessionWindows(d, exMap)("quads"), { lo: 5, hi: 10 });
  assert.deepEqual(sessionWindows({ settings: {}, programs: [] }, exMap)("quads"), sessionWindow(3)); // no programs: every workout
  assert.deepEqual(sessionWindows(d, exMap)("glutes"), sessionWindow(2)); // helping in the squat programs counts too
});

test("a week not over yet says «пока мало», not «мало»", async () => {
  const { growthStatus } = await import("../../src/model/muscles.js");
  assert.deepEqual(growthStatus(2.5, true), ["low", "пока мало"]);
  assert.deepEqual(growthStatus(2.5), ["low", "мало"]);
  assert.equal(growthStatus(6, true)[0], "grow");
});
