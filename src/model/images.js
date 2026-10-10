// Built-in exercise pictures: src/assets/fig/<exercise-id>.svg, a figure doing the exercise, drawn by
// scripts/figures/build.py. Only loaders here: a figure's file is fetched when it is first shown (ui/ExFigure).
// Pictures added from the phone are stored on the exercise itself as `photo`.
export const FIGS = Object.fromEntries(Object.entries(import.meta.glob("../assets/fig/*.svg", { query: "?raw", import: "default" }))
  .map(([path, load]) => [path.split("/").pop().replace(/\.svg$/, ""), load]));
