// Shared UI primitives and the app context hook.
import { useState, useEffect, createContext, useContext, useRef, lazy, Suspense } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { IMGS } from "../model/images.js";
import { WINDOWS, windowStart } from "../model/periods.js";
import { useBackCloses } from "./navigation.js";

// Derived, read-only helpers that depend on user data/settings, provided by App to all screens.
export const AppCtx = createContext(null);

export const useApp = () => useContext(AppCtx);

export function useNow(ms, on = true) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const first = setTimeout(() => setN(Date.now()), 0); // resuming: the time now, not when it stopped
    const t = setInterval(() => setN(Date.now()), ms);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [ms, on]);
  return n;
}

// Picture of an exercise: own photo from the phone > built-in thumbnail > initials.
export const exPhoto = (ex) => (ex && (ex.photo || IMGS[ex.id])) || null;
export function ExImg({ ex, size = 40 }) {
  const src = exPhoto(ex);
  const st = { width: size, height: size };
  if (src) return <img src={src} alt="" style={st} className="shrink-0 rounded-full object-cover" />;
  return (
    <div style={st} className="flex shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-400">
      {(ex?.name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

// Pick a picture from the phone, crop it to a square and shrink it (~10 KB) so it can live
// inside the saved data (and therefore in backups).
export function PhotoPicker({ ex, onChange }) {
  const ref = useRef(null);
  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const S = 192, m = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = S;
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url);
      onChange(c.toDataURL("image/jpeg", 0.75));
    };
    img.src = url;
  };
  return (
    <div className="flex items-center gap-3">
      <ExImg ex={ex} size={48} />
      <button onClick={() => ref.current && ref.current.click()} className="rounded-lg bg-accent-400 px-3 py-2 text-xs font-semibold text-black">
        {ex && ex.photo ? "Другое фото" : "Добавить фото"}
      </button>
      {ex && ex.photo && <button onClick={() => onChange(null)} className="text-xs text-neutral-500">убрать</button>}
      <input ref={ref} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}

export function ConfirmButton({ onConfirm, children, className = "", armedClassName = "", confirmText = "Точно?" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={armed ? armedClassName : className}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmText : children}
    </button>
  );
}

export function Header({ title, back, right }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {back && (
        <button onClick={back} className="-ml-2 shrink-0 p-2 text-neutral-400" aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className="min-w-0 flex-1 text-xl font-bold leading-tight tracking-tight">{title}</h1>
      {right}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 1, fmt = (v) => v, compact }) {
  const btn = compact ? "p-2 text-neutral-300" : "p-2.5 text-neutral-300";
  return (
    <div className="flex items-center rounded-lg bg-neutral-800">
      <button className={btn} aria-label="Меньше" onClick={() => onChange(Math.max(min, value - step))}><Minus size={compact ? 14 : 16} /></button>
      <span className={`${compact ? "w-6" : "w-12"} text-center tabular-nums`}>{fmt(value)}</span>
      <button className={btn} aria-label="Больше" onClick={() => onChange(value + step)}><Plus size={compact ? 14 : 16} /></button>
    </div>
  );
}

export function SecStepper({ value, onChange, dim, min = 0, step = 5, unit = "с", fmt = (v) => v }) {
  return (
    <div className={`flex items-center rounded-lg bg-neutral-800 ${dim ? "opacity-50" : ""}`}>
      <button className="p-2 text-neutral-300" aria-label="Меньше" onClick={() => onChange(Math.max(min, value - step))}><Minus size={14} /></button>
      <span className="w-12 text-center text-xs tabular-nums">{fmt(value)} {unit}</span>
      <button className="p-2 text-neutral-300" aria-label="Больше" onClick={() => onChange(value + step)}><Plus size={14} /></button>
    </div>
  );
}

const BUTTON = {
  primary: "rounded-xl bg-accent-400 font-semibold text-black disabled:opacity-40",
  secondary: "rounded-xl bg-neutral-900 active:bg-neutral-800 disabled:opacity-60",
  dashed: "rounded-xl border border-dashed border-neutral-700 text-neutral-300",
  quiet: "rounded-xl bg-neutral-800 text-neutral-300",
};
const BUTTON_SIZE = { md: "py-3", lg: "p-4", sm: "px-4 py-2.5", xs: "px-3 py-2 text-xs" };

// variant: primary (accent) | secondary | dashed (add something) | quiet; block = full width
export function Button({ variant = "primary", size = "md", block, className = "", ...props }) {
  return <button {...props} className={`${BUTTON[variant]} ${BUTTON_SIZE[size]} ${block ? "w-full" : ""} ${className}`} />;
}

export const Card = ({ className = "", ...props }) => <div {...props} className={`rounded-xl bg-neutral-900 p-4 ${className}`} />;

// small on/off or selected/unselected label
export const Pill = ({ on, children, className = "" }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-400"} ${className}`}>
    {children ?? (on ? "вкл" : "выкл")}
  </span>
);

// Strips above the tab bar (rest timer, a folded stretching run): one stack, so they never cover each other.
export const FloatingStack = ({ children }) => (
  <div className="above-nav pointer-events-none fixed inset-x-0 z-40 flex flex-col gap-2 px-3 [&>*]:pointer-events-auto">{children}</div>
);

// one strip of the stack; accent: it's time to act (the rest is over)
export const FloatingBar = ({ accent = false, progress, children }) => (
  <div className={`mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-lg ${accent ? "bg-accent-400 text-neutral-900" : "bg-neutral-100 text-neutral-900"}`}>
    {progress != null && <ProgressBar pct={progress} className="h-1.5 rounded-none bg-neutral-300" barClassName="bg-accent-500" />}
    <div className="flex items-center gap-2 p-3">{children}</div>
  </div>
);

// how far something has gone, 0..100
export const ProgressBar = ({ pct, className = "h-2 rounded-full bg-neutral-800", barClassName = "bg-accent-400" }) => (
  <div className={`w-full overflow-hidden ${className}`}>
    <div className={`h-full ${barClassName}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, transition: "width 200ms linear" }} />
  </div>
);

// a choice chip (a group, a kind, a muscle): on = chosen, half = chosen as a lesser one (a helping muscle);
// secondary: a second, quieter row of choices
export const Chip = ({ on, half, onClick, children, secondary = false, className = "" }) => {
  const look = on ? (secondary ? "bg-neutral-100 text-black" : "bg-accent-400 text-black") : half ? "bg-accent-950 text-accent-300" : "bg-neutral-800 text-neutral-300";
  return <button onClick={onClick} aria-pressed={!!on} className={`shrink-0 rounded-full px-3 py-1 text-xs ${look} ${className}`}>{children}</button>;
};

// a settings row that toggles something: title, hint, вкл/выкл on the right
export function SwitchRow({ title, hint, on, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl bg-neutral-900 p-4 text-left ${className}`}>
      <div>
        <div className="font-semibold">{title}</div>
        {hint && <div className="text-xs text-neutral-400">{hint}</div>}
      </div>
      <Pill on={on} />
    </button>
  );
}

// one of a few options: [[value, label], …]
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {options.map(([v, l]) => (
        <button key={String(v)} onClick={() => onChange(v)}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${value === v ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
      ))}
    </div>
  );
}

// "Delete …" at the bottom of a screen: the first tap arms it (turns red), the second deletes
// inline: a compact button in a row of buttons instead of a full-width line at the bottom
export const DeleteButton = ({ onConfirm, confirmText, children, inline = false, className = "" }) => (
  <ConfirmButton onConfirm={onConfirm} confirmText={confirmText}
    className={inline ? `rounded-xl bg-neutral-900 px-4 py-3 text-neutral-400 ${className}` : `mt-3 w-full py-3 text-neutral-500 ${className}`}
    armedClassName={inline ? `rounded-xl bg-red-600 px-4 py-3 text-white ${className}` : `mt-3 w-full rounded-xl bg-red-600 py-3 text-white ${className}`}>
    {children}
  </ConfirmButton>
);

const TrendChartLazy = lazy(() => import("./TrendChart.jsx"));
const fmtSpan = (t) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit" });

// A value over time with its own time window: presets (3 мес … всё) and Grafana-style zoom: drag across
// the chart to focus on that stretch. points: [{ t, v }], oldest first, all of them.
// header(shown): optional line above the chart about the visible points.
export function Trend({ points, unit, header, height = "h-48" }) {
  const [win, setWin] = useState(0);
  const [zoom, setZoom] = useState(null); // { from, to }
  const [sel, setSel] = useState(null); // selection being dragged, px within the box
  const box = useRef(null);
  const drag = useRef(null);
  const since = windowStart(win);
  const shown = points.filter((p) => (zoom ? p.t >= zoom.from && p.t <= zoom.to : p.t >= since));
  // x on screen -> time, over the plot area (the grid), not the axis labels
  const toT = (x) => {
    const r = (box.current.querySelector(".recharts-cartesian-grid") || box.current).getBoundingClientRect();
    const a = shown[0].t, b = shown[shown.length - 1].t;
    return a + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (b - a);
  };
  const gesture = {
    style: { touchAction: "pan-y" },
    onPointerDown: (e) => { drag.current = shown.length >= 2 ? { x: e.clientX, y: e.clientY, active: false } : null; },
    onPointerMove: (e) => {
      const g = drag.current;
      if (!g) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // a scroll
        if (Math.abs(dx) < 10) return;
        g.active = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      }
      const left = box.current.getBoundingClientRect().left;
      setSel([g.x - left, e.clientX - left]);
    },
    onPointerUp: (e) => {
      const d = drag.current;
      drag.current = null;
      setSel(null);
      if (!d || !d.active) return;
      const [from, to] = [toT(d.x), toT(e.clientX)].sort((x, y) => x - y);
      if (points.filter((p) => p.t >= from && p.t <= to).length >= 2) setZoom({ from, to });
    },
    onPointerCancel: () => { drag.current = null; setSel(null); },
  };
  return (
    <div>
      <Segmented options={WINDOWS} value={zoom ? null : win} onChange={(v) => { setWin(v); setZoom(null); }} />
      {shown.length < 2 ? <p className="py-8 text-center text-xs text-neutral-500">За этот срок меньше двух точек.</p> : <>
        {header && <div className="px-1 pt-2 text-xs text-neutral-400">{header(shown)}</div>}
        <div ref={box} data-testid="trend" className={`relative mt-2 select-none [&_*]:outline-none ${height}`} {...gesture}>
          <Suspense fallback={null}><TrendChartLazy points={shown} unit={unit} /></Suspense>
          {sel && <div className="pointer-events-none absolute inset-y-0 bg-accent-400/20"
            style={{ left: Math.min(...sel), width: Math.abs(sel[1] - sel[0]) }} />}
        </div>
      </>}
      <div className="flex h-7 items-center justify-between px-1 text-[11px] text-neutral-500">
        {zoom ? <>
          <span className="tabular-nums">{fmtSpan(zoom.from)} – {fmtSpan(zoom.to)}</span>
          <button onClick={() => setZoom(null)} className="px-1 text-accent-400">Сбросить</button>
        </> : <span>Проведи пальцем по графику, чтобы приблизить отрезок</span>}
      </div>
    </div>
  );
}

// "Подход удалён · Вернуть" at the top for a few seconds. undo: { text, run } or null.
export function useUndo(ms = 5000) {
  const [undo, setUndo] = useState(null);
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), ms); return () => clearTimeout(t); }, [undo, ms]);
  const toast = undo && (
    <div className="fixed inset-x-0 top-0 z-50 px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-black shadow-lg">
        <span className="flex-1">{undo.text}</span>
        <button onClick={() => { const u = undo; setUndo(null); u.run(); }} className="font-semibold text-accent-700">Вернуть</button>
      </div>
    </div>
  );
  return { offer: (text, run) => setUndo({ text, run }), toast };
}

// Floating sheet over a dimmed screen: questions and hints. A tap outside closes it.
export function Sheet({ title, onClose, children }) {
  useBackCloses(onClose); // the system back closes the sheet, not the screen under it
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3" onClick={onClose}>
      <div className="safe-bottom mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-neutral-900 p-4 shadow-xl"
        role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-base font-semibold">{title}</div>
        {children}
      </div>
    </div>
  );
}
