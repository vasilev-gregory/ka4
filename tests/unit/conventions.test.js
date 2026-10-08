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

test("amber / rose / teal appear only in the accent theme (index.css)", () => {
  const css = readFileSync("src/index.css", "utf8");
  const outside = css.replace(/@theme \{[^}]*\}/, "").replace(/\.mode-stretch \{[^}]*\}/, "").replace(/\.mode-strength \{[^}]*\}/, "");
  assert.ok(!/\b(amber|teal|rose)-\d/.test(outside));
});

test("new screens use the shared kit for primary buttons instead of copying the classes", () => {
  const copies = files("src").filter((f) => !f.endsWith("ui/kit.jsx"))
    .filter((f) => /<button[^>]*className="[^"]*rounded-xl bg-accent-400 py-3 font-semibold/.test(readFileSync(f, "utf8")));
  assert.deepEqual(copies, []);
});

// ---- ARCHITECTURE.md: one place per task ----
const screens = files("src").filter((f) => !f.startsWith(join("src", "model")));
const offenders = (list, re) => list.filter((f) => re.test(readFileSync(f, "utf8")));

test("exercise names go through nm1 / nm2 (useApp), not ex.ru || ex.name", () => {
  assert.deepEqual(offenders(screens, /\.ru \|\| [a-z]/), []);
});

test("screens don't change the data's collections themselves: that's model/*Actions.js", () => {
  assert.deepEqual(offenders(screens, /\b[ds]\.(workouts|programs|exercises|measurements|sessions)\s*(=[^=]|\.push\(|\.splice\()|\bd\.active\s*=[^=]/), []);
});

test("sounds and vibration only through core/sound.js and the countdown hook", () => {
  const allowed = [join("src", "core", "sound.js"), join("src", "ui", "useCountdownSignals.js"), join("src", "settings", "SettingsTab.jsx")];
  assert.deepEqual(offenders(files("src").filter((f) => !allowed.includes(f)), /navigator\.vibrate|import \{[^}]*\b(beep|blip|tick)\b[^}]*\} from "[./]*core\/sound\.js"/), []);
});

test("choice chips are kit's Chip, not copied classes", () => {
  assert.deepEqual(offenders(files("src").filter((f) => !f.endsWith(join("ui", "kit.jsx"))), /rounded-full px-3 py-1 text-xs/), []);
});

test("browser history is only touched by ui/navigation.js (screens: open(); overlays: useBackCloses)", () => {
  assert.deepEqual(offenders(files("src").filter((f) => !f.endsWith(join("ui", "navigation.js"))), /history\.(pushState|back|go)\(/), []);
});
