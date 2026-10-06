// Body measurements: saving one (a day's values; editing keeps its id) and deleting. Each takes the app data
// (an immer draft inside up()).
import { num, uid } from "../core/util.js";

// day: "YYYY-MM-DD"; values: { key: "number as typed" } — only the filled ones are kept; stored at noon of that day
export function saveMeasurement(d, { id, day, values }) {
  const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => num(v) > 0));
  const [y, mo, dd] = day.split("-").map(Number);
  const date = new Date(y, mo - 1, dd, 12).getTime();
  if (!Array.isArray(d.measurements)) d.measurements = [];
  const m = id && d.measurements.find((x) => x.id === id);
  if (m) { m.values = clean; m.date = date; } else d.measurements.push({ id: uid(), date, values: clean });
}

export function removeMeasurement(d, id) {
  d.measurements = (d.measurements || []).filter((x) => x.id !== id);
}
