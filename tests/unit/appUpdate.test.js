// A new version takes over at once, a running workout or not (everything is saved as it changes): a screen says
// «Обновляю приложение…», the page reloads, and after it the app says it was updated, once.
import { test } from "node:test";
import assert from "node:assert/strict";

test("a new version shows «Обновляю…», reloads, then says «Обновлено» once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let reloads = 0;
  const shown = [];
  const store = {};
  globalThis.window = { location: { reload: () => { reloads++; } } };
  const listeners = [];
  globalThis.document = { createElement: () => ({ style: {}, remove() { this.removed = true; } }), body: { append: (el) => shown.push(el) },
    addEventListener: (type, f) => listeners.push(f), removeEventListener: () => {} };
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  globalThis.__VERSION__ = "42";
  const bc = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined; // storage.js would open one, and an open channel keeps the test process alive
  const { newVersionReady, sayUpdated } = await import("../../src/core/appUpdate.js");
  newVersionReady();
  assert.match(shown[0].innerHTML, /Обновляю приложение…/);
  assert.equal(reloads, 0);
  t.mock.timers.tick(700);
  assert.equal(reloads, 1);
  sayUpdated(); // the reloaded page
  assert.equal(shown[1].textContent, "Обновлено ✓ · версия 42");
  listeners[0](); // a touch anywhere: gone at once, no waiting
  assert.equal(shown[1].removed, true);
  sayUpdated();
  assert.equal(shown.length, 2);
  globalThis.BroadcastChannel = bc;
  for (const k of ["window", "document", "sessionStorage", "__VERSION__"]) delete globalThis[k];
});
