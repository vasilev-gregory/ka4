// Project conventions that ESLint can't express (the rest are in eslint.config.js; both run in `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(js|jsx|mjs)$/.test(f) ? [p] : [];
});
const code = [...files("src"), ...files("tests")];

test("every source file starts with a comment saying what it is", () => {
  const missing = code.filter((f) => !readFileSync(f, "utf8").startsWith("//"));
  assert.deepEqual(missing, []);
});

test("no line longer than 200 characters (wrap JSX props, long class lists)", () => {
  const long = code.flatMap((f) => readFileSync(f, "utf8").split("\n")
    .map((l, i) => [l, i]).filter(([l]) => l.length > 200).map(([, i]) => `${f}:${i + 1}`));
  assert.deepEqual(long, []);
});

test("amber / teal appear only in the accent theme (index.css)", () => {
  const css = readFileSync("src/index.css", "utf8");
  const outside = css.replace(/@theme \{[^}]*\}/, "").replace(/\.mode-stretch \{[^}]*\}/, "");
  assert.ok(!/\b(amber|teal)-\d/.test(outside));
});

test("new screens use the shared kit for primary buttons instead of copying the classes", () => {
  const copies = files("src").filter((f) => !f.endsWith("ui/kit.jsx"))
    .filter((f) => /<button[^>]*className="[^"]*rounded-xl bg-accent-400 py-3 font-semibold/.test(readFileSync(f, "utf8")));
  assert.deepEqual(copies, []);
});
