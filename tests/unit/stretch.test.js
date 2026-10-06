// Stretching domain logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, stExMap } from "../../src/model/stretch.js";
import { seed } from "../../src/model/state.js";

test("stretch timeline: circuit, sides, no trailing rest; the intro only where no rest comes before", () => {
  const d = seed();
  const p = { timing: { prep: 10, work: 30, sw: 5, rest: 15, rounds: 2, roundRest: 60, mode: "circuit" },
    items: [{ exerciseId: "st-figure-four" }, { exerciseId: "st-pizza" }] };
  const kinds = (q) => buildTimeline(q, stExMap(d.stretch)).map((x) => x.k).join(",");
  assert.equal(kinds(p), "prep,work,switch,work,rest,work,roundRest,work,switch,work,rest,work");
  // no rest between stretches: each one gets its intro; in order, a stretch's repeats rest in between
  assert.equal(kinds({ ...p, timing: { ...p.timing, rest: 0, roundRest: 0, rounds: 1 } }), "prep,work,switch,work,prep,work");
  assert.equal(kinds({ ...p, timing: { ...p.timing, mode: "sequence" } }), "prep,work,switch,work,rest,work,switch,work,rest,work,rest,work");
});

test("stretch load per area: per side, days per area, what made it up; a program's plan counts the same way", async () => {
  const { AREA_PARTS, stretchLoad, stretchPlan, stretchVerdict, stretchHint } = await import("../../src/model/stretch.js");
  const s = seed().stretch;
  const day = (d, h = 9) => new Date(2026, 9, d, h).getTime();
  s.sessions = [
    { id: "1", startedAt: day(5), work: { "st-hip-flexor-forward": 60, "st-lat": 30 } },
    { id: "2", startedAt: day(5, 20), work: { "st-hip-flexor-tall": 40 } },
    { id: "3", startedAt: day(7), work: { "st-hip-flexor-forward": 30, "st-unknown": 20 } },
  ];
  const { days, areas } = stretchLoad(s, day(5, 0), day(12, 0));
  assert.equal(days, 2);
  assert.deepEqual(areas["сгибатели бедра"], { sec: 130, freq: 2, by: { "st-hip-flexor-forward": 90, "st-hip-flexor-tall": 40 } });
  assert.deepEqual(areas["без группы"], { sec: 20, freq: 1, by: { "st-unknown": 20 } });
  // a two-sided stretch, 2 rounds: 2 × 30 s per side; a one-sided one: 30 s per round
  const p = { timing: { prep: 0, work: 30, sw: 5, rest: 10, rounds: 2, roundRest: 0, mode: "circuit" },
    items: [{ exerciseId: "st-hip-flexor-forward" }, { exerciseId: "st-pizza" }] };
  const plan = stretchPlan(p, Object.fromEntries(s.exercises.map((e) => [e.id, e])));
  assert.deepEqual(plan, { "сгибатели бедра": { sec: 60, by: { "st-hip-flexor-forward": 60 } }, "приводящие": { sec: 60, by: { "st-pizza": 60 } } });
  assert.deepEqual(stretchVerdict(299), ["low", "мало"]);
  assert.deepEqual(stretchVerdict(300), ["effect", "есть эффект"]);
  assert.deepEqual(stretchVerdict(600), ["max", "максимум"]);
  assert.equal(stretchHint(240), "до минимума ещё 1:00");
  assert.ok(s.exercises.every((e) => !e.area || AREA_PARTS[e.area]), "every built-in area is on the body map");
});

test("stretch period: sessions, time and the average week per area", async () => {
  const { stretchPeriod } = await import("../../src/model/stretch.js");
  const { periodOf } = await import("../../src/model/calendar.js");
  const s = seed().stretch;
  const at = (d) => new Date(2026, 9, d, 9).getTime();
  s.sessions = [
    { id: "1", startedAt: at(1), finishedAt: at(1) + 600e3, work: { "st-lat": 120 } },
    { id: "2", startedAt: at(6), finishedAt: at(6) + 300e3, work: { "st-lat": 60 } },
  ];
  const p = stretchPeriod(s, periodOf("month", at(1)), at(7));
  assert.equal(p.sessions, 2);
  assert.equal(p.time, 900e3);
  assert.equal(p.weeks, 2); // weeks of 28 Sep and 5 Oct
  assert.deepEqual(p.perWeek["широчайшие"], { sec: 90, freq: 1, by: { "st-lat": 180 } });
});

test("one session: hold per area and in all", async () => {
  const { sessionAreas, heldTotal } = await import("../../src/model/stretch.js");
  const s = seed().stretch;
  const x = { work: { "st-hip-flexor-forward": 60, "st-hip-flexor-tall": 30, "st-lat": 45 } };
  assert.deepEqual(sessionAreas(s, x)["сгибатели бедра"], { sec: 90, by: { "st-hip-flexor-forward": 60, "st-hip-flexor-tall": 30 } });
  assert.equal(heldTotal(x), 135);
});
