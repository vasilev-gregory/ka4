// The stretching run saved in the data: the clock, skips, pause, edits under the run, gaps, closing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../../src/model/state.js";
import { addRunRound, adjustRunPhase, closeRun, discardRun, goToPhase, playProgram, runState, tickRun, togglePauseRun } from "../../src/model/stretchRunActions.js";
import { setItemTiming } from "../../src/model/stretchActions.js";

// prep 10 | figure four (two sides): work 30, switch 5, work 30 | rest 15 | pizza (one side): work 30
const setup = () => {
  const s = seed().stretch;
  s.programs = [{ id: "p", name: "Утро", timing: { prep: 10, work: 30, sw: 5, rest: 15, rounds: 1, roundRest: 60, mode: "circuit" },
    items: [{ exerciseId: "st-figure-four" }, { exerciseId: "st-pizza" }] }];
  return s;
};
const T0 = 1_000_000;
// the clock ticking every second from `from` to `to`, as it does while the app is open
const runFor = (s, from, to) => { for (let t = from; t <= to; t += 1000) tickRun(s, t); };
const kind = (s, now) => { const st = runState(s, now); return st.phase ? `${st.phase.k}${st.phase.side ? ":" + st.phase.side : ""}` : "done"; };

test("the clock runs through the phases, counts each hold that ran out and puts the run into history", () => {
  const s = setup();
  playProgram(s, "p", T0);
  assert.equal(kind(s, T0), "prep");
  tickRun(s, T0 + 10_000); // the intro ran out
  assert.equal(kind(s, T0 + 10_000), "work:левая сторона");
  tickRun(s, T0 + 25_000);
  assert.equal(runState(s, T0 + 25_000).left, 15_000);
  runFor(s, T0 + 25_000, T0 + 130_000); // 10 + 30 + 5 + 30 + 15 + 30 = 120: done
  assert.equal(s.active.done, true);
  assert.equal(s.sessions.length, 1);
  assert.deepEqual(s.sessions[0].work, { "st-figure-four": 30, "st-pizza": 30 }); // one side counted
  assert.equal(s.sessions[0].complete, true);
  closeRun(s, T0 + 140_000);
  assert.equal(s.active, undefined);
  assert.equal(s.sessions.length, 1);
});

test("a skipped hold doesn't count, going back repeats it and it counts again", () => {
  const s = setup();
  playProgram(s, "p", T0);
  goToPhase(s, 1, T0 + 1000); // skip the intro
  goToPhase(s, 2, T0 + 13_000); // skip the left side after 12 s
  assert.equal(kind(s, T0 + 13_000), "switch");
  goToPhase(s, 1, T0 + 14_000); // back to the left side: from its start
  assert.equal(runState(s, T0 + 14_000).left, 30_000);
  runFor(s, T0 + 14_000, T0 + 44_000); // ran out
  assert.deepEqual(s.active.held, { "st-figure-four": 30 });
  goToPhase(s, 1, T0 + 45_000); // and once more
  runFor(s, T0 + 45_000, T0 + 75_000);
  assert.deepEqual(s.active.held, { "st-figure-four": 60 });
});

test("pause holds the clock; ±5 and the editor change the current phase's length; a round more", () => {
  const s = setup();
  playProgram(s, "p", T0);
  goToPhase(s, 1, T0); // work, left: 30 s
  togglePauseRun(s, T0 + 10_000);
  assert.equal(runState(s, T0 + 50_000).left, 20_000);
  adjustRunPhase(s, 5, T0 + 50_000); // saved in the program, the run follows
  assert.equal(runState(s, T0 + 50_000).left, 25_000);
  assert.equal(s.programs[0].items[0].over.work, 35);
  setItemTiming(s.programs[0], 0, "work", 40); // the editor, under the run
  assert.equal(runState(s, T0 + 50_000).stale, true);
  tickRun(s, T0 + 50_000); // syncs
  assert.equal(runState(s, T0 + 50_000).left, 30_000);
  togglePauseRun(s, T0 + 60_000);
  assert.equal(runState(s, T0 + 70_000).left, 20_000);
  const before = runState(s, T0).tl.length;
  addRunRound(s);
  assert.ok(runState(s, T0).tl.length > before);
});

test("switching a stretch's sides off under the run keeps it on that stretch", () => {
  const s = setup();
  playProgram(s, "p", T0);
  goToPhase(s, 1, T0); // work, left side of the figure four
  s.exercises.find((e) => e.id === "st-figure-four").sides = false;
  tickRun(s, T0 + 5000);
  assert.equal(kind(s, T0 + 5000), "work");
  assert.equal(runState(s, T0 + 5000).left, 25_000); // the same step: its clock goes on
});

test("back after a long gap: the phase that was on counts, the next one waits paused", () => {
  const s = setup();
  playProgram(s, "p", T0);
  goToPhase(s, 1, T0);
  tickRun(s, T0 + 10 * 60_000);
  assert.deepEqual(s.active.held, { "st-figure-four": 30 });
  assert.equal(kind(s, T0 + 10 * 60_000), "switch");
  assert.equal(runState(s, T0 + 10 * 60_000).left, 5000);
  assert.ok(s.active.pausedLeft != null);
});

test("closing mid-run: saved with what was held, the hold going on as far as it went; a short run is not saved", () => {
  const s = setup();
  playProgram(s, "p", T0);
  goToPhase(s, 1, T0);
  runFor(s, T0, T0 + 30_000); // left side done
  goToPhase(s, 3, T0 + 31_000); // right side
  closeRun(s, T0 + 81_000); // 50 s in: ended long ago, so the whole 30
  assert.deepEqual(s.sessions[0].work, { "st-figure-four": 30 }); // the right side isn't counted (one side)
  const t = setup();
  playProgram(t, "p", T0);
  closeRun(t, T0 + 20_000);
  assert.equal(t.sessions.length, 0);
  playProgram(t, "p", T0); // a run going on stays; a finished one would be replaced
  playProgram(t, "other", T0);
  assert.equal(t.active.programId, "p");
});

test("a quick run without a program: default times, into history, can be kept as a program", async () => {
  const { playQuick, keepQuickProgram } = await import("../../src/model/stretchRunActions.js");
  const s = setup();
  s.defaults = { prep: 0, work: 20, sw: 5, rest: 10, rounds: 1, roundRest: 60, mode: "circuit" };
  playQuick(s, ["st-pizza", "st-lat"], T0);
  assert.equal(s.programs.length, 1); // nothing added to the programs
  assert.equal(kind(s, T0), "work");
  adjustRunPhase(s, 5, T0); // ±5 goes into the run's own program
  assert.equal(s.active.program.items[0].over.work, 25);
  runFor(s, T0, T0 + 60_000); // 25 + 10 + 20
  assert.equal(s.active.done, true);
  assert.equal(s.sessions[0].name, "Быстрая растяжка");
  keepQuickProgram(s);
  assert.equal(s.programs.length, 2);
  assert.deepEqual(s.programs[1].items.map((it) => it.exerciseId), ["st-pizza", "st-lat"]);
  assert.equal(s.programs[1].items[0].over.work, 25);
  keepQuickProgram(s); // once
  assert.equal(s.programs.length, 2);
});

test("a cancelled run is dropped without a trace", () => {
  const s = setup();
  playProgram(s, "p", T0);
  runFor(s, T0, T0 + 90_000);
  discardRun(s);
  assert.equal(s.active, undefined);
  assert.equal(s.sessions.length, 0);
});
