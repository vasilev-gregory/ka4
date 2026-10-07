// App version check and cache reset (service worker + Cache Storage), and taking over a new version.

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

// A freshly deployed version takes over with a page reload right away, in a workout too: everything is saved as it
// changes (model/usePersistentData), so the running workout or stretch goes on in the new version.
export function newVersionReady() {
  window.location.reload();
}
