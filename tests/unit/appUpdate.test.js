// A new version's reload waits until no workout or stretch runs.
import { test } from "node:test";
import assert from "node:assert/strict";

test("a new version reloads at once when idle, after the session when one runs", async () => {
  let reloads = 0;
  globalThis.window = { location: { reload: () => { reloads++; } } };
  const { newVersionReady, setSessionRunning } = await import("../../src/core/appUpdate.js");
  setSessionRunning(true);
  newVersionReady();
  assert.equal(reloads, 0); // mid-workout: wait
  setSessionRunning(true);
  assert.equal(reloads, 0);
  setSessionRunning(false);
  assert.equal(reloads, 1); // the workout is over: now
  newVersionReady();
  assert.equal(reloads, 2); // idle: at once
  delete globalThis.window;
});
