// Backup text round trip.
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
