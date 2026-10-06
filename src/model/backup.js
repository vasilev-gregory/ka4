// Backups: export as a file or text, and reading one back.
import { isoDay } from "../core/util.js";
import { migrate } from "./state.js";

// The whole data as backup text (savedAt is an internal sync detail, not part of a backup).
export function backupText(data) {
  const { savedAt: _s, ...clean } = data;
  return JSON.stringify({ ...clean, exportedAt: new Date().toISOString() });
}

// Parses backup text. Returns { data, summary } with data upgraded to the current schema; throws if the
// text isn't a backup of this app.
export function parseBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error("not a backup", { cause: e }); }
  if (!d || !Array.isArray(d.exercises) || !Array.isArray(d.programs) || !Array.isArray(d.workouts)) throw new Error("not a backup");
  const summary = { workouts: d.workouts.length, programs: d.programs.length, exportedAt: d.exportedAt ? Date.parse(d.exportedAt) : null };
  const { exportedAt: _e, ...rest } = d;
  return { data: migrate({ settings: { restSec: 120 }, active: null, ...rest }), summary };
}

// Sends the whole data as a .json file via the share sheet (Telegram etc.), or downloads it.
// Returns "shared" | "downloaded" | "cancelled".
export async function shareBackup(data, now = Date.now()) {
  const txt = backupText(data);
  const name = `kach-backup-${isoDay(now)}.json`;
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

export const backupDue = (data, now = Date.now()) =>
  (data.workouts.length + ((data.stretch && data.stretch.sessions.length) || 0) > 0) &&
  now - (data.settings.lastBackupAt || 0) > BACKUP_EVERY;

// a copy was made just now
export function markBackedUp(d, now = Date.now()) {
  d.settings.lastBackupAt = now;
}

// "remind me tomorrow": the reminder comes back in a day
export function snoozeBackup(d, now = Date.now()) {
  d.settings.lastBackupAt = now - BACKUP_EVERY + 864e5;
}

// whole days since the last copy, or null when there was none
export const daysSinceBackup = (data, now = Date.now()) => (data.settings.lastBackupAt ? Math.floor((now - data.settings.lastBackupAt) / 864e5) : null);
