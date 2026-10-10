// The accent palettes a mode can be drawn in, and putting the picked ones on the page: strength's as --s-*, stretching's
// as --t-* on <html>, so every element, portals included, takes them (index.css maps them to the accent-* colours).
// base: what weak shades mix into (the body map's lightly worked muscles, soft chips) — grey by default; the classic
// palettes, as they were first, mix into nothing: see-through over the dark.
export const SHADES = [200, 300, 400, 500, 700, 900, 950];
export const PALETTES = {
  amber: { name: "жёлтый", c: ["#fff3a3", "#ffe566", "#ffd93d", "#ffcc00", "#b38f00", "#665200", "#332900"] },
  amberGlow: { name: "янтарный", c: ["#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#b45309", "#78350f", "#451a03"], base: "transparent" },
  red: { name: "красный", c: ["#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#f03e3e", "#c92a2a", "#5c1616"] },
  roseGlow: { name: "малиновый", c: ["#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#be123c", "#881337", "#4c0519"], base: "transparent" },
  teal: { name: "бирюзовый", c: ["#99f6e4", "#5eead4", "#2dd4bf", "#14b8a6", "#0f766e", "#134e4a", "#042f2e"] },
  pink: { name: "розовый", c: ["#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#be185d", "#831843", "#500724"] },
  violet: { name: "фиолетовый", c: ["#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#6d28d9", "#4c1d95", "#2e1065"] },
  aurora: { name: "северное сияние", c: ["#b5f8d8", "#7ef0bd", "#3ee8a0", "#1fcf86", "#0f8a5a", "#0b4a33", "#052a1d"] },
};
// each mode's colour when none is picked
export const DEFAULT_COLOR = { strength: "amber", stretch: "teal" };
export const COLOR_KEY = { strength: "strengthColor", stretch: "stretchColor" };
// the modes never share a colour: strength's wins, a clashing stretching colour falls back to its default (or amber)
export const colorOf = (settings, mode) => {
  const pick = (m) => (PALETTES[settings[COLOR_KEY[m]]] ? settings[COLOR_KEY[m]] : DEFAULT_COLOR[m]);
  const s = pick("strength");
  if (mode !== "stretch") return s;
  const t = pick("stretch");
  if (t !== s) return t;
  return DEFAULT_COLOR.stretch !== s ? DEFAULT_COLOR.stretch : DEFAULT_COLOR.strength;
};

// a set done to failure is marked in its own colour, red — violet when strength is drawn in a reddish palette
const REDDISH = new Set(["red", "roseGlow", "pink"]);
export const failColor = (settings) => (REDDISH.has(colorOf(settings, "strength")) ? "#a78bfa" : "#f87171");

export function applyPalettes(settings) {
  const st = document.documentElement.style;
  st.setProperty("--fail", failColor(settings));
  for (const [mode, pre] of [["strength", "s"], ["stretch", "t"]]) {
    const p = PALETTES[colorOf(settings, mode)];
    p.c.forEach((hex, i) => st.setProperty(`--${pre}-${SHADES[i]}`, hex));
    st.setProperty(`--${pre}-base`, p.base || "#525252");
  }
}
