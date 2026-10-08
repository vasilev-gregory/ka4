// Small helpers: ids.
import { test } from "node:test";
import assert from "node:assert/strict";
import { uid } from "../../src/core/util.js";

test("uid: a UUID, a new one each time", () => {
  const a = uid();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, uid());
});
