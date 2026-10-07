// App version check and cache reset (service worker + Cache Storage), and taking over a new version: a screen
// «Обновляю приложение…» before the reload and a note «Обновлено» after it, so the blink reads as an update.
import { updatedFlag } from "../storage.js";

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
// changes (model/usePersistentData), so the running workout or stretch goes on in the new version. Plain DOM: it
// shows over whatever React is drawing.
export function newVersionReady() {
  const el = document.createElement("div");
  el.className = "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/90 text-neutral-200";
  el.innerHTML = '<div class="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-accent-400"></div>'
    + '<div class="text-sm">Обновляю приложение…</div>';
  document.body.append(el);
  updatedFlag.set();
  setTimeout(() => window.location.reload(), 700);
}

// after the reload of an update: a short note at the top that it was one; the first touch anywhere takes it away at
// once (and still does what it touched: the note lets touches through)
export function sayUpdated() {
  if (!updatedFlag.take()) return;
  const el = document.createElement("div");
  el.className = "pointer-events-none fixed inset-x-0 top-0 z-[100] mx-auto mt-[max(0.75rem,env(safe-area-inset-top))] w-fit rounded-full bg-neutral-800 px-4 py-2 "
    + "text-sm text-neutral-100 shadow-lg transition-opacity duration-500";
  el.textContent = `Обновлено ✓ · версия ${__VERSION__}`;
  document.body.append(el);
  const gone = () => { el.remove(); document.removeEventListener("pointerdown", gone, true); };
  document.addEventListener("pointerdown", gone, true);
  setTimeout(() => { el.style.opacity = "0"; }, 2500);
  setTimeout(gone, 3100);
}
