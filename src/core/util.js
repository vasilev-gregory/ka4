// Small pure helpers: ids, number parsing, formatting, dates.
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const num = (v) => parseFloat(String(v ?? "").replace(",", ".")) || 0;

export const pad = (n) => String(n).padStart(2, "0");

export function fmtDur(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const fmtKg = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} т` : `${Math.round(v)} кг`);

export const fmtDate = (ts) => new Date(ts).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });

export const fmtShort = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" });

// Rough evidence-based targets per muscle group per week (Schoenfeld et al. meta-analyses, RP volume landmarks):
// hard sets = working sets taken close to failure (RIR 0-3); 10+ sets and 2+ sessions a week is the sweet spot,
// ~4-9 sets still grows, under 4 is roughly maintenance. Drop sets / ladders count as one set.
export const DAY = 864e5;

export function weekStartOf(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export const isoDay = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const fmtNum = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

// Programs start without a name; wherever a name is shown, an empty one reads as this.
export const progTitle = (p, fallback = "Без названия") => ((p && p.name && p.name.trim()) || fallback);
