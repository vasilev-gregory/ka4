// Shared UI primitives and the app context hook.
import { useState, useEffect, createContext, useContext } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { IMGS } from "../model/images.js";

// Derived, read-only helpers that depend on user data/settings, provided by App to all screens.
export const AppCtx = createContext(null);

export const useApp = () => useContext(AppCtx);

export function useNow(ms, on = true) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, on]);
  return n;
}

export function ExImg({ ex, size = 40 }) {
  const src = ex && IMGS[ex.id];
  const st = { width: size, height: size };
  if (src) return <img src={src} alt="" style={st} className="shrink-0 rounded-full object-cover" />;
  return (
    <div style={st} className="flex shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-400">
      {(ex?.name || "?").slice(0, 2).toUpperCase()}
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
  const btn = compact ? "p-1.5 text-neutral-300" : "p-2 text-neutral-300";
  return (
    <div className="flex items-center rounded-lg bg-neutral-800">
      <button className={btn} onClick={() => onChange(Math.max(min, value - step))}><Minus size={compact ? 14 : 16} /></button>
      <span className={`${compact ? "w-6" : "w-12"} text-center tabular-nums`}>{fmt(value)}</span>
      <button className={btn} onClick={() => onChange(value + step)}><Plus size={compact ? 14 : 16} /></button>
    </div>
  );
}

export function SecStepper({ value, onChange, dim, min = 0, step = 5, unit = "с" }) {
  return (
    <div className={`flex items-center rounded-lg bg-neutral-800 ${dim ? "opacity-50" : ""}`}>
      <button className="p-1.5 text-neutral-300" onClick={() => onChange(Math.max(min, value - step))}><Minus size={14} /></button>
      <span className="w-12 text-center text-xs tabular-nums">{value} {unit}</span>
      <button className="p-1.5 text-neutral-300" onClick={() => onChange(value + step)}><Plus size={14} /></button>
    </div>
  );
}
