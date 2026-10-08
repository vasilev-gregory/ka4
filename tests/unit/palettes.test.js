// Mode colours: defaults, any palette per mode, and the two modes never sharing one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorOf, PALETTES } from "../../src/ui/palettes.js";

test("palettes: strength yellow and stretching teal by default, unknown values fall back", () => {
  assert.equal(colorOf({}, "strength"), "amber");
  assert.equal(colorOf({}, "stretch"), "teal");
  assert.equal(colorOf({ strengthColor: "lime", stretchColor: "red" }, "strength"), "amber");
  assert.equal(colorOf({ strengthColor: "aurora", stretchColor: "red" }, "stretch"), "red");
});

test("palettes: the modes never share a colour — strength keeps it, stretching falls back", () => {
  assert.equal(colorOf({ stretchColor: "amber" }, "stretch"), "teal");
  assert.equal(colorOf({ strengthColor: "red", stretchColor: "red" }, "stretch"), "teal");
  assert.equal(colorOf({ strengthColor: "red", stretchColor: "red" }, "strength"), "red");
  assert.equal(colorOf({ strengthColor: "teal" }, "stretch"), "amber");
  assert.equal(colorOf({ strengthColor: "teal", stretchColor: "teal" }, "stretch"), "amber");
});

test("palettes: pink and violet are there for either mode", () => {
  assert.equal(colorOf({ strengthColor: "pink" }, "strength"), "pink");
  assert.equal(colorOf({ stretchColor: "violet" }, "stretch"), "violet");
});

test("palettes: the classic amber and rose are back next to the new ones, see-through over the dark", () => {
  assert.equal(colorOf({ strengthColor: "amberGlow" }, "strength"), "amberGlow");
  assert.equal(PALETTES.amberGlow.base, "transparent");
  assert.equal(PALETTES.amber.base, undefined); // grey
});
