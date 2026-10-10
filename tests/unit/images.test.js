// Every built-in exercise (strength, cardio, stretching) has its figure, and the figures only name muscles the app knows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { SEED_EX, ST_SEED } from "../../src/model/catalog.js";
import { MUSCLES } from "../../src/model/muscles.js";
import { slug } from "../../src/core/util.js";

const DIR = "src/assets/fig";
const ids = [...SEED_EX.map((r) => slug(r[0])), ...ST_SEED.map((r) => r[0])];

test("every built-in exercise has a figure", () => {
  assert.deepEqual(ids.filter((id) => !existsSync(`${DIR}/${id}.svg`)), []);
});

test("a figure's muscles are the app's muscle ids, filled by their CSS variable", () => {
  const known = new Set(MUSCLES.map(([id]) => id));
  for (const f of readdirSync(DIR)) {
    const svg = readFileSync(`${DIR}/${f}`, "utf8");
    const named = [...svg.matchAll(/class="m m-([a-z]+)" style="fill:var\(--m-([a-z]+),transparent\)"/g)];
    assert.ok(named.length > 0, f);
    for (const [, cls, v] of named) assert.ok(known.has(cls) && cls === v, `${f}: ${cls}`);
  }
});
