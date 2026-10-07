// App version check and cache reset (service worker + Cache Storage), and when a new version may reload the page.

// Asks the server which build is current. Returns { latest, current, upToDate }; throws when offline.
export async function checkForUpdate() {
  const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
  const v = await res.json();
  return { latest: v.version, current: __VERSION__, upToDate: v.version === __VERSION__ };
}

// Wipes only the cached app files, never the app data, so workouts and settings survive.
// Then reloads from the network.
export async function hardRefresh() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {}
  window.location.reload();
}

// A freshly deployed version takes over with a page reload. Never in the middle of a workout or a stretch: the
// reload waits until no session runs (App reports it with setSessionRunning).
let running = false, waiting = false;
export function newVersionReady() {
  if (running) waiting = true;
  else window.location.reload();
}
export function setSessionRunning(on) {
  running = on;
  if (!on && waiting) { waiting = false; window.location.reload(); }
}
