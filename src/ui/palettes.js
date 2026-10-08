// The accent palettes a mode can be drawn in, and putting the picked ones on the page: strength's as --s-*, stretching's
// as --t-* on <html>, so every element, portals included, takes them (index.css maps them to the accent-* colours).
export const SHADES = [200, 300, 400, 500, 700, 900, 950];
export const PALETTES = {
  amber: { name: "жёлтый", c: ["#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#b45309", "#78350f", "#451a03"] },
  red: { name: "красный", c: ["#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#be123c", "#881337", "#4c0519"] },
  teal: { name: "бирюзовый", c: ["#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0f766e", "#134e4a", "#042f2e"] },
  aurora: { name: "северное сияние", c: ["#b5f8d8", "#7ef0bd", "#3ee8a0", "#1fcf86", "#0f8a5a", "#0b4a33", "#052a1d"] },
};
// each mode's colour when none is picked
export const DEFAULT_COLOR = { strength: "amber", stretch: "teal" };
export const colorOf = (settings, mode) => {
  const v = settings[mode === "stretch" ? "stretchColor" : "strengthColor"];
  return PALETTES[v] ? v : DEFAULT_COLOR[mode];
};

export function applyPalettes(settings) {
  const st = document.documentElement.style;
  for (const [mode, pre] of [["strength", "s"], ["stretch", "t"]]) {
    PALETTES[colorOf(settings, mode)].c.forEach((hex, i) => st.setProperty(`--${pre}-${SHADES[i]}`, hex));
  }
}
