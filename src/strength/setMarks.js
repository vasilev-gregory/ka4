// How a done set is marked by its kind (model setKind), all in the mode's one colour — kinds differ by fill and icon,
// never by hue: a working set solid with ✓, a warm-up pale with ✓, one to failure solid with a flame (or RIR 0).
// One place for the running workout's rows, the workout card's table and the help.
import { Check, Flame } from "lucide-react";

export const SET_TEXT = { warmup: "text-neutral-400", work: "text-accent-300", fail: "text-accent-300" }; // the values
export const SET_CHECK = { warmup: "bg-accent-soft text-accent-200", work: "bg-accent-400 text-neutral-900", fail: "bg-accent-400 text-neutral-900" }; // ✓
export const SET_ICON = { warmup: Check, work: Check, fail: Flame }; // in ✓ (RIR on: its number instead)
export const SET_LABEL = { warmup: "text-neutral-300", work: "text-accent-400", fail: "text-accent-400" }; // the number / «Р»
