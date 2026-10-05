// Reading a file someone picked or shared to Кач: our own backup, or another app's export.
// Returns { kind: "backup", backup } | { kind: "workouts", source, workouts, measurements }; throws with a message to show.
import { parseBackup } from "../backup.js";
import { parseCsv } from "./csv.js";
import { isGymKeeper, parseGymKeeper } from "./gymkeeper.js";
import { isHevy, parseHevy } from "./hevy.js";

export const SOURCES = { hevy: "Hevy", gymkeeper: "GymKeeper" };

// name: file name; text: its contents as text; bytes: Uint8Array (for binary formats)
export function readImport(name, text, bytes) {
  const lower = (name || "").toLowerCase();
  // GymKeeper's backup is its Realm database ("T-DB" at byte 16); a SQLite file would say "SQLite format 3"
  const magic = bytes ? new TextDecoder().decode(bytes.slice(0, 24)) : "";
  if (magic.slice(16, 20) === "T-DB" || magic.startsWith("SQLite format 3") || lower.endsWith(".db")) {
    throw new Error("Это внутренняя база GymKeeper, её прочитать нельзя. В GymKeeper сделай «Экспорт» тренировок в CSV и загрузи этот файл.");
  }
  if (lower.endsWith(".json") || /^\s*\{/.test(text)) return { kind: "backup", backup: parseBackup(text) };
  const { headers } = parseCsv(text.slice(0, 4000));
  if (isHevy(headers)) {
    const workouts = parseHevy(text);
    if (!workouts.length) throw new Error("В файле Hevy не нашлось тренировок.");
    return { kind: "workouts", source: "hevy", workouts, measurements: [] };
  }
  if (isGymKeeper(headers)) {
    const { workouts, measurements } = parseGymKeeper(text);
    if (!workouts.length && !measurements.length) throw new Error("В файле GymKeeper не нашлось тренировок.");
    return { kind: "workouts", source: "gymkeeper", workouts, measurements };
  }
  throw new Error("Не узнаю формат файла. Поддерживаются копия Кача и CSV-экспорт Hevy и GymKeeper.");
}
