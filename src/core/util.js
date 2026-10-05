// Small pure helpers: ids, number parsing, formatting, dates.
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// What a number field keeps from typing / pasting: digits and (if decimal) one "," or ".".
export function numericInput(v, decimal) {
  const s = String(v).replace(decimal ? /[^\d.,]/g : /\D/g, "");
  if (!decimal) return s;
  const i = s.search(/[.,]/);
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/[.,]/g, "");
}

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

export const DAY = 864e5;

export function weekStartOf(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export const isoDay = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

// Russian plural: plural(3, "подход", "подхода", "подходов") -> "подхода"
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  return b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}

// "3 подх. · 2 раза": hard sets and sessions of a muscle group in a week
export const fmtGroupWeek = (sets, times) => `${sets} подх. · ${times} ${plural(times, "раз", "раза", "раз")}`;

export const fmtNum = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

// Programs start without a name; wherever a name is shown, an empty one reads as this.
export const progTitle = (p, fallback = "Без названия") => ((p && p.name && p.name.trim()) || fallback);
