// Backup: the text round trip and the reminder; body measurements saved and deleted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { backupText, parseBackup } from "../../src/model/backup.js";
import { seed, SCHEMA_VERSION } from "../../src/model/state.js";

test("a backup reads back as the same data, upgraded and without sync fields", () => {
  const d = { ...seed(), savedAt: 123 };
  d.workouts.push({ id: "w", startedAt: 1, finishedAt: 2, exercises: [] });
  const { data, summary } = parseBackup(backupText(d));
  assert.equal(data.savedAt, undefined);
  assert.equal(data.exportedAt, undefined);
  assert.equal(data.version, SCHEMA_VERSION);
  assert.equal(summary.workouts, 1);
  assert.ok(summary.exportedAt > 0);
});

test("anything else is refused", () => {
  assert.throws(() => parseBackup("not json"));
  assert.throws(() => parseBackup(JSON.stringify({ hello: 1 })));
});

test("backup reminder: due after a week, «напомнить завтра» brings it back in a day", async () => {
  const { backupDue, daysSinceBackup, markBackedUp, snoozeBackup } = await import("../../src/model/backup.js");
  const d = { workouts: [{}], settings: {}, stretch: { sessions: [] } };
  const now = 100 * 864e5;
  assert.equal(backupDue(d, now), true);
  markBackedUp(d, now);
  assert.equal(backupDue(d, now + 6 * 864e5), false);
  assert.equal(daysSinceBackup(d, now + 3.5 * 864e5), 3);
  snoozeBackup(d, now + 8 * 864e5);
  assert.equal(backupDue(d, now + 8.5 * 864e5), false);
  assert.equal(backupDue(d, now + 9.1 * 864e5), true);
});

test("measurements: saved at noon of the day with only the filled values; editing keeps the id; deleting", async () => {
  const { saveMeasurement, removeMeasurement } = await import("../../src/model/measureActions.js");
  const d = { measurements: [] };
  saveMeasurement(d, { day: "2026-10-06", values: { weight: "80,5", waist: "", chest: "0" } });
  const m = d.measurements[0];
  assert.deepEqual(m.values, { weight: "80,5" });
  assert.equal(new Date(m.date).getHours(), 12);
  saveMeasurement(d, { id: m.id, day: "2026-10-07", values: { weight: "80" } });
  assert.equal(d.measurements.length, 1);
  assert.equal(new Date(d.measurements[0].date).getDate(), 7);
  removeMeasurement(d, m.id);
  assert.equal(d.measurements.length, 0);
});
