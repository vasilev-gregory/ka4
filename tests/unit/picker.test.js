// The exercise picker's list: search by words, "твои" first, groups, sorting by the shown name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { exactName, matchesQuery, pickerSections, usageOf } from "../../src/model/picker.js";

const items = [
  { id: "a", name: "Squat", ru: "Присед", group: "ноги" },
  { id: "b", name: "Leg press", ru: "Жим ногами", group: "ноги" },
  { id: "c", name: "Bench press", ru: "Жим лёжа", group: "грудь" },
  { id: "d", name: "Zottman", group: "мои" },
];
const opts = { groupOf: (e) => e.group, groups: ["грудь", "ноги"], nameOf: (e) => e.ru || e.name };

test("words in any order, either language; an exact name", () => {
  assert.ok(matchesQuery(items[1], "ногами жим"));
  assert.ok(matchesQuery(items[1], "leg"));
  assert.ok(!matchesQuery(items[1], "жим лёжа"));
  assert.ok(exactName(items, " присед "));
  assert.ok(!exactName(items, "при"));
});

test("sections: «твои» by use, then groups in order (unknown ones last), each by the shown name", () => {
  const usage = usageOf([{ startedAt: 1, ids: ["a", "a"] }, { startedAt: 5, ids: ["c"] }, { startedAt: 2, ids: ["a"] }], [{ items: [{ exerciseId: "d" }] }]);
  assert.deepEqual(usage.a, { n: 2, last: 2 }); // once per session
  assert.deepEqual(usage.d, { n: 0.5, last: 0 });
  const s = pickerSections(items, { ...opts, usage });
  assert.deepEqual(s.map(([g, l]) => [g, l.map((e) => e.id)]), [["твои", ["a", "c", "d"]], ["ноги", ["b"]]]);
  const plain = pickerSections(items, { ...opts, query: "жим" });
  assert.deepEqual(plain.map(([g, l]) => [g, l.map((e) => e.id)]), [["грудь", ["c"]], ["ноги", ["b"]]]);
  assert.deepEqual(pickerSections(items, { ...opts, group: "мои" }).map(([g]) => g), ["мои"]);
});
