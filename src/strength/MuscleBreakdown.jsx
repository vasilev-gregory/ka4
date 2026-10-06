// Hard sets per muscle: the body map and the list with growth status. Used by the history (week, month, year)
// and by a workout's card (the workout itself, or its week).
import { useState } from "react";
import { fmtNum, plural } from "../core/util.js";
import { growthStatus, MUSCLE_NAME, MUSCLES, musclesOf } from "../model/muscles.js";
import { useApp } from "../ui/kit.jsx";
import { BodyMap, fillOpacity, HEAD, MUSCLE_FILL } from "../ui/BodyMap.jsx";

// statuses in the muscle colour (BodyMap): the fuller, the closer to the weekly target
const CHIP = { low: "bg-neutral-700/60 text-neutral-300", grow: "bg-rose-950 text-rose-300", optimal: "bg-rose-500 text-white", high: "bg-rose-200 text-rose-950" };
const TARGET = 10; // hard sets a week at which a muscle is filled completely (the optimum)
// legend stops: [sets, label]
const LEGEND = [[0, "0"], [4, "4 — рост"], [TARGET, "10+ — оптимум"]];
// one workout: growth statuses are about a week, so only the scale
const LEGEND_SINGLE = [[0, "0"], [TARGET, "10 — норма недели"]];

// a tap on the head: not a muscle, so a joke instead of numbers; each tap the next one
const HEAD_JOKES = [
  "Голова: 0 подходов. Мозг тоже мышца, но жим им пока никто не делал",
  "Голова: тренируется, когда честно считаешь RIR",
  "Голова: отвечает за «ну ещё один подход». Заливки не будет",
  "Голова: рекорд — вспомнить, какой вес был в прошлый раз",
  "Голова: в программе её нет, но без неё и до зала не дойти",
];

// "7,5 подх. · 2 раза"; averages over weeks are fractional
const fmtLoad = (sets, freq) => `${fmtNum(sets)} подх.${freq ? ` · ${fmtNum(freq)} ${Number.isInteger(freq) ? plural(freq, "раз", "раза", "раз") : "раза"}` : ""}`;

// load: { muscleId: { sets, freq } }; map: draw the body; only: list just these muscles; note(row): a line under a muscle;
// single: the load of one workout (no growth statuses, no frequency); exMap: names for the selected muscle's exercises,
// byNote: what their sets cover ("за месяц"); open: opens an exercise's card
export function MuscleBreakdown({ load, map = true, only, note, single = false, exMap, byNote, open }) {
  const [sel, setSel] = useState(null);
  const [joke, setJoke] = useState(-1);
  const rows = MUSCLES.filter(([id]) => load[id]?.sets > 0 && (!only || only.includes(id)))
    .map(([id, name]) => ({ id, name, ...load[id], status: growthStatus(load[id].sets, load[id].freq) }));
  const fill = Object.fromEntries(rows.map((r) => [r.id, r.sets / TARGET]));
  const pick = (m) => {
    if (m === HEAD) setJoke((j) => (j + 1) % HEAD_JOKES.length);
    setSel(sel === m && m !== HEAD ? null : m);
  };
  const loadText = (m) => (single ? fmtLoad(load[m].sets) : fmtLoad(load[m].sets, load[m].freq));
  return (
    <div>
      {map && <>
        <BodyMap fill={fill} selected={sel} onSelect={pick} />
        <div className="mx-auto mt-2 max-w-64">
          <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="h-2 w-full">
            {Array.from({ length: 20 }, (_, i) => (
              <rect key={i} x={i * 5} width="5.2" height="4" className={MUSCLE_FILL} fillOpacity={fillOpacity(i / 20 || 0.001)} />
            ))}
          </svg>
          <div className="relative mt-0.5 h-3 text-[10px] text-neutral-500">
            {(single ? LEGEND_SINGLE : LEGEND).map(([n, l]) => (
              <span key={n} className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(n / TARGET) * 100}%` }}>{l}</span>
            ))}
          </div>
        </div>
        <p className="mt-2 min-h-5 text-center text-xs text-neutral-300">
          {!sel ? <span className="text-neutral-500">Тап по мышце — подробности</span>
            : sel === HEAD ? HEAD_JOKES[joke]
            : fill[sel] ? `${MUSCLE_NAME[sel]}: ${loadText(sel)}${single ? "" : ` — ${growthStatus(load[sel].sets, load[sel].freq)[1]}`}`
            : `${MUSCLE_NAME[sel]}: тяжёлых подходов не было`}
        </p>
      </>}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className={`rounded-lg ${sel === r.id ? "bg-neutral-800" : ""}`}>
            <button onClick={() => pick(r.id)} aria-expanded={sel === r.id} className="block w-full px-1.5 py-1 text-left">
              <div className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-neutral-200">{r.name}</span>
                <span className="tabular-nums text-neutral-400">{loadText(r.id)}</span>
                {!single && <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${CHIP[r.status[0]]}`}>{r.status[1]}</span>}
              </div>
              <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-700/60">
                <div className="absolute inset-y-0 left-0 rounded-full bg-rose-500" style={{ width: `${Math.min(100, (r.sets / 20) * 100)}%` }} />
                <div className="absolute inset-y-0 w-px bg-neutral-500" style={{ left: "50%" }} />
              </div>
              {note && <div className="mt-0.5 text-[11px] text-neutral-500">{note(r)}</div>}
            </button>
            {sel === r.id && exMap && r.by && <MuscleExercises muscle={r.id} by={r.by} exMap={exMap} byNote={byNote} open={open} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// the exercises a selected muscle's sets came from, most sets first; a tap opens the exercise
function MuscleExercises({ muscle, by, exMap, byNote, open }) {
  const { nm1 } = useApp();
  const list = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return (
    <div className="px-1.5 pb-2" data-testid="muscle-exercises">
      <div className="mb-1 text-[11px] text-neutral-500">Засчитались{byNote ? ` ${byNote}` : ""}:</div>
      {list.map(([id, n]) => {
        const ex = exMap[id];
        const main = (musclesOf(ex)[muscle] || 0) >= 1;
        return (
          <button key={id} onClick={() => ex && open?.({ type: "exercise", id })}
            className="flex w-full items-center gap-2 rounded-md py-1 text-left text-xs active:bg-neutral-700">
            <span className="min-w-0 flex-1 truncate text-neutral-200">{ex ? nm1(ex) || ex.name : "Удалённое упражнение"}</span>
            <span className="text-[11px] text-neutral-500">{main ? "основная" : "помогает"}</span>
            <span className="w-16 shrink-0 text-right tabular-nums text-neutral-300">{fmtNum(n)} подх.</span>
          </button>
        );
      })}
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
    меньше 4 — скорее поддержка. На схеме мышца заливается цветом по мере подходов: еле видна — первые, полностью — 10 в неделю.
    Тап по мышце на схеме или в списке выделяет её и раскрывает упражнения, из которых сложились её подходы.
  </p>
);
