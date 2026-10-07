// Hard sets per muscle on the shared load breakdown (ui/LoadBreakdown): the week's scale (10 a week «оптимум»), or one
// workout's per-muscle window (model/muscles sessionWindows), statuses and the exercises behind a muscle.
// Used by the history, a workout and a program.
import { fmtNum, plural } from "../core/util.js";
import { growthStatus, MUSCLES, musclesOf, SESSION_CAP, sessionHint, sessionStatus } from "../model/muscles.js";
import { ByList, LoadBreakdown } from "../ui/LoadBreakdown.jsx";
import { useApp } from "../ui/kit.jsx";

const TARGET = 10; // hard sets a week at which a muscle is filled completely («оптимум»)
const ITEMS = MUSCLES.map(([id, name]) => ({ id, name, parts: [id] }));
const SCALE = {
  target: TARGET, barMax: 30, mark: TARGET, fill: "fill-rose-500", bar: "bg-rose-500", empty: "тяжёлых подходов не было",
  legend: [[0, "0"], [4, "4 — рост"], [TARGET, "10+ — оптимум"]],
  // statuses in the muscle colour: the fuller, the closer to the weekly target
  chip: { low: "bg-neutral-700/60 text-neutral-300", grow: "bg-rose-950 text-rose-300", optimal: "bg-rose-500 text-white", high: "bg-rose-200 text-rose-950" },
};
// one workout or program: each muscle against its own window, so values come as parts of its «максимум» (10 = full)
const SINGLE = { ...SCALE, target: 10, barMax: 13, mark: 10, legend: [[0, "0"], [10, "максимум за тренировку"]] };

// "7,5 подх. · 2 раза"; averages over weeks are fractional
const fmtLoad = (sets, freq) => `${fmtNum(sets)} подх.${freq ? ` · ${fmtNum(freq)} ${Number.isInteger(freq) ? plural(freq, "раз", "раза", "раз") : "раза"}` : ""}`;

// load: { muscleId: { sets, freq, by } }; windows(m): one workout / program — that muscle's window per workout
// (statuses against it, no frequency); note(row): a line
// under a muscle; exMap, byNote ("за месяц"), open: the exercises behind a picked muscle and opening their cards
export function MuscleBreakdown({ load, map = true, only, note, windows, exMap, byNote, open }) {
  const single = !!windows;
  const { nm1 } = useApp();
  const shown = Object.fromEntries(Object.entries(load).map(([m, l]) => [m, {
    value: single ? Math.min(l.sets, SESSION_CAP) / windows(m).hi * 10 : l.sets,
    text: single ? fmtLoad(l.sets) : fmtLoad(l.sets, l.freq), status: single ? sessionStatus(l.sets, windows(m)) : growthStatus(l.sets),
  }]));
  const expand = exMap && ((m) => load[m].by && (
    <ByList title={`Засчитались${byNote ? ` ${byNote}` : ""}`} entries={Object.entries(load[m].by).map(([id, n]) => {
      const ex = exMap[id];
      return { id, value: n, text: `${fmtNum(n)} подх.`, name: ex ? nm1(ex) || ex.name : "Удалённое упражнение",
        tag: (musclesOf(ex)[m] || 0) >= 1 ? "основная" : "помогает", onClick: ex && open ? () => open({ type: "exercise", id }) : undefined };
    })} />
  ));
  const rowNote = note || (single ? (r) => sessionHint(r.sets, windows(r.id)) : null);
  return <LoadBreakdown items={ITEMS} load={shown} scale={single ? SINGLE : SCALE} map={map} only={only}
    note={rowNote && ((m) => rowNote({ id: m, ...load[m] }))} expand={expand} />;
}

// how the numbers are counted, under the "?"
export const MusclesWhy = () => (
  <p className="mb-2 text-[11px] leading-snug text-neutral-500">
    Считаются тяжёлые подходы (RIR 0–3, без разминок), дроп-сет — один подход. Мышца, которая в упражнении основная, получает подход,
    вспомогательная — половину (присед: квадрицепс — подход, ягодицы — половина); тренировка засчитывается мышце, если она была основной.
    Ориентир по исследованиям (Pelland и др., 2024–25): рост — от 4 подходов в неделю, хорошо — от 10 (черта на шкале), отлично — 20,
    после ~30 прироста почти нет; сколько раз в неделю — почти не важно, важен объём. На схеме мышца заливается по мере подходов,
    полностью — к 10 в неделю. Одна тренировка — своя норма: недельные 10–20 делятся на тренировки этой мышцы (тренировок в неделю —
    в настройках, доля — по программам), но не больше 11 за раз: дальше прироста не видно.
    Тап по мышце на схеме или в списке выделяет её и раскрывает упражнения, из которых сложились её подходы.
  </p>
);
