// A new version takes over at once, a running workout or not (everything is saved as it changes).
import { test } from "node:test";
import assert from "node:assert/strict";

test("a new version reloads at once", async () => {
  let reloads = 0;
  globalThis.window = { location: { reload: () => { reloads++; } } };
  const { newVersionReady } = await import("../../src/core/appUpdate.js");
  newVersionReady();
  assert.equal(reloads, 1);
  delete globalThis.window;
});
