// How a set is marked by its kind (model setKind): warm-up blue, working set in the accent, to failure in its own colour
// (--fail, ui/palettes). One place for the running workout's rows and the workout card's table.
export const SET_TEXT = { warmup: "text-sky-300", work: "text-accent-300", fail: "text-fail" }; // the values of a done set
export const SET_CHECK = { warmup: "bg-sky-400 text-neutral-900", work: "bg-accent-400 text-neutral-900", fail: "bg-fail text-neutral-900" }; // its ✓
export const SET_LABEL = { warmup: "text-sky-400", work: "text-accent-400", fail: "text-fail" }; // its number
