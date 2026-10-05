// Backups outside the browser (share sheet / download) and app-cache reset.
import { isoDay } from "../core/util.js";

// Sends the whole data as a .json file via the share sheet (Telegram etc.), or downloads it.
// Returns "shared" | "downloaded" | "cancelled".
export async function shareBackup(data) {
  const { savedAt: _s, ...clean } = data;
  const txt = JSON.stringify({ ...clean, exportedAt: new Date().toISOString() });
  const name = `kach-backup-${isoDay(Date.now())}.json`;
  const file = new File([txt], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Кач: резервная копия" });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}

export const BACKUP_EVERY = 7 * 864e5;

export const backupDue = (data) =>
  (data.workouts.length + ((data.stretch && data.stretch.sessions.length) || 0) > 0) &&
  Date.now() - (data.settings.lastBackupAt || 0) > BACKUP_EVERY;

// Wipes only the cached app files (service worker + Cache Storage), never localStorage,
// so workouts and settings survive. Then reloads from the network.
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
