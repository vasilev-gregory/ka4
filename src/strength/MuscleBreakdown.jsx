// Hard sets per muscle on the shared load breakdown (ui/LoadBreakdown): the strength scale (10 sets a week is
// the optimum), growth statuses and the exercises behind a muscle. Used by the history, a workout and a program.
import { fmtNum, plural } from "../core/util.js";
import { growthStatus, MUSCLES, musclesOf } from "../model/muscles.js";
import { ByList, LoadBreakdown } from "../ui/LoadBreakdown.jsx";
import { useApp } from "../ui/kit.jsx";

const TARGET = 10; // hard sets a week at which a muscle is filled completely (the optimum)
const ITEMS = MUSCLES.map(([id, name]) => ({ id, name, parts: [id] }));
const SCALE = {
  target: TARGET, barMax: 20, mark: TARGET, fill: "fill-rose-500", bar: "bg-rose-500", empty: "тяжёлых подходов не было",
  legend: [[0, "0"], [4, "4 — рост"], [TARGET, "10+ — оптимум"]],
  // statuses in the muscle colour: the fuller, the closer to the weekly target
  chip: { low: "bg-neutral-700/60 text-neutral-300", grow: "bg-rose-950 text-rose-300", optimal: "bg-rose-500 text-white", high: "bg-rose-200 text-rose-950" },
};
// one workout or program: growth statuses are about a week, so only the scale
const SINGLE = { ...SCALE, legend: [[0, "0"], [TARGET, "10 — норма недели"]] };

// "7,5 подх. · 2 раза"; averages over weeks are fractional
const fmtLoad = (sets, freq) => `${fmtNum(sets)} подх.${freq ? ` · ${fmtNum(freq)} ${Number.isInteger(freq) ? plural(freq, "раз", "раза", "раз") : "раза"}` : ""}`;

// load: { muscleId: { sets, freq, by } }; single: one workout / program (no statuses, no frequency); note(row): a line
// under a muscle; exMap, byNote ("за месяц"), open: the exercises behind a picked muscle and opening their cards
export function MuscleBreakdown({ load, map = true, only, note, single = false, exMap, byNote, open }) {
  const { nm1 } = useApp();
  const shown = Object.fromEntries(Object.entries(load).map(([m, l]) => [m, {
    value: l.sets, text: single ? fmtLoad(l.sets) : fmtLoad(l.sets, l.freq), status: single ? null : growthStatus(l.sets, l.freq),
  }]));
  const expand = exMap && ((m) => load[m].by && (
    <ByList title={`Засчитались${byNote ? ` ${byNote}` : ""}`} entries={Object.entries(load[m].by).map(([id, n]) => {
      const ex = exMap[id];
      return { id, value: n, text: `${fmtNum(n)} подх.`, name: ex ? nm1(ex) || ex.name : "Удалённое упражнение",
        tag: (musclesOf(ex)[m] || 0) >= 1 ? "основная" : "помогает", onClick: ex && open ? () => open({ type: "exercise", id }) : undefined };
    })} />
  ));
  return <LoadBreakdown items={ITEMS} load={shown} scale={single ? SINGLE : SCALE} map={map} only={only}
    note={note && ((m) => note({ id: m, ...load[m] }))} expand={expand} />;
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
