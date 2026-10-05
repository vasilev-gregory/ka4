// Importing other apps' exports: CSV reading, Hevy, exercise matching, merging into history.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../../src/model/imports/csv.js";
import { parseHevy, parseHevyDate } from "../../src/model/imports/hevy.js";
import { readImport } from "../../src/model/imports/index.js";
import { oneSided } from "../../src/model/imports/gymkeeper.js";
import { applyImport, matchExercise, planImport } from "../../src/model/importActions.js";
import { seed } from "../../src/model/state.js";

const HEVY = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"Legs","26 Jan 2024, 18:45","26 Jan 2024, 19:40","","Squat (Barbell)","","","0","warmup","60","8","","",""',
  '"Legs","26 Jan 2024, 18:45","26 Jan 2024, 19:40","","Squat (Barbell)","","","1","normal","100","5","","","8"',
  '"Legs","26 Jan 2024, 18:45","26 Jan 2024, 19:40","","Squat (Barbell)","","","2","dropset","80","6","","",""',
  '"Legs","26 Jan 2024, 18:45","26 Jan 2024, 19:40","","Plank","","","0","normal","","","","60",""',
  '"Legs","26 Jan 2024, 18:45","26 Jan 2024, 19:40","","Zercher Squat","","note, with comma","0","failure","70","10","","",""',
  '"Push","28 Jan 2024, 9:05","28 Jan 2024, 10:00","","Bench Press (Barbell)","","","0","normal","90","5","","",""',
].join("\n");

test("CSV: quotes, commas and line breaks inside fields, BOM, semicolons", () => {
  const { headers, rows } = parseCsv('﻿a,b\n"x, y","line\none"\n1,"say ""hi"""\n');
  assert.deepEqual(headers, ["a", "b"]);
  assert.deepEqual(rows, [{ a: "x, y", b: "line\none" }, { a: "1", b: 'say "hi"' }]);
  assert.deepEqual(parseCsv("a;b\n1,5;2\n").rows, [{ a: "1,5", b: "2" }]);
});

test("Hevy: workouts, warm-ups, drop sets, failure, RPE, timed exercises", () => {
  assert.equal(parseHevyDate("26 Jan 2024, 18:45"), new Date(2024, 0, 26, 18, 45).getTime());
  const [legs, push] = parseHevy(HEVY);
  assert.equal(legs.name, "Legs");
  assert.equal(legs.finishedAt - legs.startedAt, 55 * 60e3);
  const [squat, plank, zercher] = legs.exercises;
  assert.deepEqual(squat.sets.map((s) => [s.w, s.r, s.t, s.rir]), [["60", "8", "w", undefined], ["100", "5", undefined, 2], ["80", "6", undefined, undefined]]);
  assert.ok(squat.sets[1].g && squat.sets[1].g === squat.sets[2].g, "a drop set joins the set before it");
  assert.equal(plank.time, true); assert.equal(plank.sets[0].r, "60");
  assert.equal(zercher.sets[0].rir, 0);
  assert.equal(push.exercises[0].name, "Bench Press (Barbell)");
  assert.equal(readImport("workouts.csv", HEVY).source, "hevy");
});

test("exercise names from other apps find ours, never ignoring the equipment", () => {
  const ex = seed().exercises;
  assert.equal(matchExercise(ex, "Bench Press (Barbell)").id, "barbell-bench-press");
  assert.equal(matchExercise(ex, "Squat (Barbell)").id, "squat");
  assert.equal(matchExercise(ex, "Lateral Raise (Cable)").id, "cable-lateral-raise", "not our dumbbell lateral raise");
  assert.equal(matchExercise(ex, "приседания со штангой").id, "squat");
  assert.equal(matchExercise(ex, "Zercher Squat"), null);
});

test("every exercise from the imported histories (Hevy, GymKeeper) is in the catalog", () => {
  const names = JSON.parse(readFileSync(new URL("../fixtures/imported-exercise-names.json", import.meta.url), "utf8"));
  const ex = seed().exercises;
  assert.deepEqual(names.filter((n) => !matchExercise(ex, n)), []);
});

test("import adds workouts in date order with the exercises we have; unknown ones are listed, not created", () => {
  const d = seed();
  d.workouts.push({ id: "mine", startedAt: new Date(2024, 0, 27).getTime(), finishedAt: new Date(2024, 0, 27, 1).getTime(), exercises: [] });
  const workouts = parseHevy(HEVY);
  const exercisesBefore = d.exercises.length;
  const plan = planImport(d, workouts);
  assert.equal(plan.add.length, 2);
  assert.deepEqual([...plan.missing], [["Plank", 1], ["Zercher Squat", 1]]);
  applyImport(d, plan, "hevy");
  assert.equal(d.exercises.length, exercisesBefore, "nothing created");
  assert.deepEqual(d.workouts.map((w) => (w.id === "mine" ? "mine" : w.name)), ["Legs", "mine", "Push"]);
  assert.deepEqual(d.workouts[0].exercises.map((e) => e.exerciseId), ["squat"]); // Plank and Zercher Squat left out
  assert.equal(d.workouts[0].source, "hevy");
  assert.ok(d.workouts[0].exercises[0].sets.every((s) => s.done));
  assert.equal(planImport(d, workouts).add.length, 0, "the same file twice adds nothing");
  assert.equal(planImport(d, workouts).already, 2);
});

test("a Кач backup is recognised as such; an unknown file says what is supported", () => {
  assert.equal(readImport("kach.json", JSON.stringify(seed())).kind, "backup");
  assert.throws(() => readImport("x.csv", "foo,bar\n1,2"), /Не узнаю формат/);
});

test("a real Hevy export (Russian): dates, names matched to ours, nothing existing is touched", () => {
  const text = readFileSync(new URL("../fixtures/hevy-ru.csv", import.meta.url), "utf8");
  const workouts = parseHevy(text);
  assert.equal(workouts.length, 3);
  assert.deepEqual(workouts.map((w) => w.startedAt), [new Date(2026, 8, 29, 10, 4), new Date(2026, 8, 30, 7, 6), new Date(2026, 9, 3, 11, 35)].map(Number)); // "30 сент. 2026, 07:06" …

  const d = seed();
  const mine = { id: "mine", name: "Моя", startedAt: Date.now(), finishedAt: Date.now(), exercises: [{ exerciseId: "squat", sets: [{ w: "100", r: "5", p: "", done: true }] }] };
  d.workouts.push(structuredClone(mine));
  d.exercises.find((e) => e.id === "squat").photo = "data:mine";
  const before = structuredClone(d);

  applyImport(d, planImport(d, workouts), "hevy");
  // everything that was there is still there, unchanged
  assert.deepEqual(d.workouts.find((w) => w.id === "mine"), mine);
  before.exercises.forEach((e) => assert.deepEqual(d.exercises.find((x) => x.id === e.id), e));
  assert.deepEqual(d.programs, before.programs);
  assert.deepEqual(d.settings, before.settings);
  assert.equal(d.workouts.length, before.workouts.length + 3);
  // "Присед (Штанга)" went into our squat, next to the user's own squat history
  assert.ok(d.workouts.filter((w) => w.source === "hevy").some((w) => w.exercises.some((e) => e.exerciseId === "squat")));
  // importing the same file again adds nothing
  const n = d.workouts.length;
  applyImport(d, planImport(d, workouts), "hevy");
  assert.equal(d.workouts.length, n);
});

test("a real GymKeeper export: days, warm-ups, drop sets, measurements; added, never replacing", () => {
  const text = readFileSync(new URL("../fixtures/gymkeeper.csv", import.meta.url), "utf8");
  const r = readImport("gymkeeper.csv", text);
  assert.equal(r.source, "gymkeeper");
  const [first, second] = r.workouts;
  assert.equal(first.startedAt, new Date(2022, 5, 21, 12).getTime()); // "6/21/22", no time in the file: noon
  assert.equal(first.finishedAt - first.startedAt, 57 * 60e3); // "57 min"
  const lunge = first.exercises.find((e) => e.name === "Lunge (Dumbbell)");
  assert.deepEqual(lunge.sets.map((s) => [s.w, s.r]), [["20", "7"], ["10", "12"], ["", "20"], ["10", "10"]]);
  assert.ok(lunge.sets[0].g && lunge.sets[0].g === lunge.sets[1].g, "Drop 20 → Drop 10 is one drop set");
  const bench = second.exercises.find((e) => e.name === "Bench Press (Barbell)");
  assert.deepEqual(bench.sets.map((s) => s.rir ?? null), [4, 4, 1, null, null]); // Easy, Easy, Hard, Drop, Drop
  const row = second.exercises.find((e) => e.name === "Bent Over Row (Barbell)");
  assert.ok(row.sets[2].g && row.sets[2].g === row.sets[3].g, "a heavier set right before a single Drop starts the drop set");
  assert.deepEqual(r.measurements.map((m) => m.values), [{ weight: "120" }, { weight: "112.5", waist: "109", glutes: "117", chest: "119", thigh: "72" }]);

  const d = seed();
  d.measurements = [{ id: "m", date: r.measurements[0].date + 3600e3, values: { weight: "121" } }]; // same day: kept, not doubled
  const plan = planImport(d, r.workouts, r.measurements);
  assert.equal(plan.matched.get("Squat (Barbell)").id, "squat");
  applyImport(d, plan, "gymkeeper");
  assert.deepEqual(d.measurements.map((m) => m.values.weight), ["121", "112.5"]);
  assert.equal(d.workouts.length, 2);
});

test("GymKeeper's internal .db (a Realm file) is refused with what to do instead", () => {
  const bytes = new Uint8Array(64);
  bytes.set(new TextEncoder().encode("T-DB"), 16);
  assert.throws(() => readImport("backup.db", "", bytes), /Экспорт/);
});

test("one-arm / one-leg notes put the sets into the one-sided variation", () => {
  const head = "Date,Type,Name,№,Val_1,Unit_1,Val_2,Unit_2,Comment";
  const csv = [head,
    '1/10/26,📅,,,,,,,"60 min"',
    '1/10/26,🏋️‍♂️,"Seated Row · Cable",,,,,,""',
    '1/10/26,🔹,"Seated Row · Cable",1,50,kg,12,rep,"Normal"',
    '1/10/26,🔹,"Seated Row · Cable",2,25,kg,12,rep,"Hard (1h)"',
    '1/10/26,🔹,"Seated Row · Cable",3,20,kg,10,rep,"Drop (1рук)"',
    '1/10/26,🔹,"Seated Row · Cable",4,50,kg,10,rep,"Hard (2рук)"',
    '1/10/26,🏋️‍♂️,"Lateral Raise · Cable",,,,,,""',
    '1/10/26,🔹,"Lateral Raise · Cable",1,5,kg,15,rep,"Normal (1р)"',
    '1/10/26,🏋️‍♂️,"Leg Press · Machine",,,,,,""',
    '1/10/26,🔹,"Leg Press · Machine",1,80,kg,12,rep,"Normal (г,1 нога)"',
    '1/10/26,🏋️‍♂️,"Hip Thrust",,,,,,""',
    '1/10/26,🔹,"Hip Thrust",1,20,kg,12,rep,"Normal (1dumb)"',
  ].join("\n");
  assert.equal(oneSided("cbl1h"), "arm"); assert.equal(oneSided("single"), "arm"); assert.equal(oneSided("1dumb"), null); assert.equal(oneSided("2h"), null);
  const { workouts } = readImport("gk.csv", csv);
  const ex = workouts[0].exercises;
  assert.deepEqual(ex.map((e) => [e.name, e.sets.map((s) => s.w).join(" ")]), [
    ["Seated Row (Cable)", "50 50"], ["Seated Row (Cable) одной рукой", "25 20"],
    ["Lateral Raise (Cable) одной рукой", "5"], ["Leg Press (Machine) одной ногой", "80"], ["Hip Thrust", "20"]]);
  assert.ok(ex[1].sets[0].g && ex[1].sets[0].g === ex[1].sets[1].g, "a drop set within the one-arm sets");

  const d = seed();
  applyImport(d, planImport(d, workouts), "gymkeeper");
  assert.deepEqual(d.workouts[0].exercises.map((e) => e.exerciseId),
    ["seated-row", "one-arm-seated-row", "one-arm-cable-lateral-raise", "single-leg-leg-press", "hip-thrust"]); // "1dumb": one dumbbell, not one arm
});
