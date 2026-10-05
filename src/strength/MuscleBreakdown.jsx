// Hard sets per muscle: the body map and the list with growth status. Used by the history (week, month, year)
// and by a workout's card (its week).
import { useState } from "react";
import { fmtNum, plural } from "../core/util.js";
import { growthStatus, MUSCLE_NAME, MUSCLES } from "../model/muscles.js";
import { BodyMap, LEVEL_FILL } from "../ui/BodyMap.jsx";

const CHIP = { low: "bg-neutral-800 text-neutral-400", grow: "bg-accent-950 text-accent-300", optimal: "bg-accent-400 text-black", high: "bg-red-950 text-red-300" };
const LEGEND = [["low", "мало"], ["grow", "рост"], ["optimal", "оптимум"], ["high", "очень много"]];

// "7,5 подх. · 2 раза"; averages over weeks are fractional
const fmtLoad = (sets, freq) => `${fmtNum(sets)} подх.${freq ? ` · ${fmtNum(freq)} ${Number.isInteger(freq) ? plural(freq, "раз", "раза", "раз") : "раза"}` : ""}`;

// load: { muscleId: { sets, freq } }; map: draw the body; only: list just these muscles; note(row): a line under a muscle
export function MuscleBreakdown({ load, map = true, only, note }) {
  const [sel, setSel] = useState(null);
  const rows = MUSCLES.filter(([id]) => load[id]?.sets > 0 && (!only || only.includes(id)))
    .map(([id, name]) => ({ id, name, ...load[id], status: growthStatus(load[id].sets, load[id].freq) }));
  const levels = Object.fromEntries(rows.map((r) => [r.id, r.status[0]]));
  const pick = (m) => setSel(sel === m ? null : m);
  return (
    <div>
      {map && <>
        <BodyMap levels={levels} selected={sel} onSelect={pick} />
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
          {LEGEND.map(([k, l]) => (
            <span key={k} className="flex items-center gap-1">
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><rect width="10" height="10" rx="2" className={LEVEL_FILL[k]} /></svg>{l}
            </span>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-center text-xs text-neutral-300">
          {!sel ? <span className="text-neutral-500">Тап по мышце — подробности</span>
            : levels[sel] ? `${MUSCLE_NAME[sel]}: ${fmtLoad(load[sel].sets, load[sel].freq)} — ${growthStatus(load[sel].sets, load[sel].freq)[1]}`
            : `${MUSCLE_NAME[sel]}: тяжёлых подходов не было`}
        </p>
      </>}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <button key={r.id} onClick={() => pick(r.id)} className={`block w-full rounded-lg px-1.5 py-1 text-left ${sel === r.id ? "bg-neutral-800" : ""}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-neutral-200">{r.name}</span>
              <span className="tabular-nums text-neutral-400">{fmtLoad(r.sets, r.freq)}</span>
              <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${CHIP[r.status[0]]}`}>{r.status[1]}</span>
            </div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-800">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent-400" style={{ width: `${Math.min(100, (r.sets / 20) * 100)}%` }} />
              <div className="absolute inset-y-0 w-px bg-neutral-500" style={{ left: "50%" }} />
            </div>
            {note && <div className="mt-0.5 text-[11px] text-neutral-500">{note(r)}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WhyButton({ on, toggle }) {
  return (
    <button onClick={toggle} aria-label="Как считается"
      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${on ? "bg-neutral-600 text-white" : "bg-neutral-800"}`}>?</button>
  );
}

// how the numbers are counted, under the "?"
export const MusclesWhy = () => (
  <p className="mb-2 text-[11px] leading-snug text-neutral-500">
    Считаются тяжёлые подходы (RIR 0–3, без разминок), дроп-сет — один подход. Мышца, которая в упражнении основная, получает подход,
    вспомогательная — половину (присед: квадрицепс — подход, ягодицы — половина); тренировка засчитывается мышце, если она была основной.
    Ориентир по исследованиям: 10+ подходов в неделю и 2+ тренировки на мышцу — оптимум (черта на шкале — 10), 4–9 тоже дают рост,
    меньше 4 — скорее поддержка. Тап по мышце на схеме или в списке выделяет её.
  </p>
);
