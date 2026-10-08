// Hard sets per muscle on the shared load breakdown (ui/LoadBreakdown): the week's scale (10 a week «оптимум»), or one
// workout's own scale (model/muscles sessionStatus) with its week beside it, statuses and the exercises behind a muscle.
// Used by the history, a workout and a program.
import { fmtNum, plural } from "../core/util.js";
import { growthStatus, MUSCLES, musclesOf, SESSION_CAP, SESSION_GOOD, SESSION_GROW, sessionHint, sessionStatus, muscleNick, WEEK_CAP } from "../model/muscles.js";
import { ByList, LoadBreakdown } from "../ui/LoadBreakdown.jsx";
import { useApp } from "../ui/kit.jsx";

const TARGET = 10; // hard sets a week at which a muscle is filled completely («оптимум»)
const ITEMS = MUSCLES.map(([id, name]) => ({ id, name, parts: [id] }));
const SCALE = {
  target: TARGET, barMax: 30, mark: TARGET, fill: "fill-accent-400", bar: "bg-accent-400", empty: "тяжёлых подходов не было",
  legend: [[0, "0"], [4, "4 — рост"], [TARGET, "10+ — оптимум"]],
  // statuses in the mode's accent, as stretching's: the fuller, the closer to the weekly target
  chip: { low: "bg-neutral-700/60 text-neutral-300", grow: "bg-accent-900 text-accent-200", optimal: "bg-accent-400 text-black", high: "bg-accent-200 text-accent-950" },
};
// one workout or program: its own scale, full at «оптимум» (6)
const SINGLE = { ...SCALE, target: SESSION_GOOD, barMax: SESSION_CAP + 1, mark: SESSION_GOOD,
  legend: [[0, "0"], [SESSION_GROW, "3 — рост"], [SESSION_GOOD, "6+ — оптимальный"]] };

// "7,5 подх. · 2 раза"; averages over weeks are fractional
const fmtLoad = (sets, freq) => `${fmtNum(sets)} подх.${freq ? ` · ${fmtNum(freq)} ${Number.isInteger(freq) ? plural(freq, "раз", "раза", "раз") : "раза"}` : ""}`;

// load: { muscleId: { sets, freq, by } }; single: one workout / program (its own scale, no frequency); week(m): with
// single, the muscle's sets in that week so far, shown beside (a program has none); note(row): a line
// under a muscle; exMap, byNote ("за месяц"), open: the exercises behind a picked muscle and opening their cards;
// find(m): a plan's editor — exercises for a muscle (ui/LoadBreakdown find)
export function MuscleBreakdown({ load, map = true, only, note, single = false, week, exMap, byNote, open, find }) {
  const { nm1 } = useApp();
  const shown = Object.fromEntries(Object.entries(load).map(([m, l]) => [m, {
    value: l.sets, text: single ? fmtLoad(l.sets) : fmtLoad(l.sets, l.freq), status: single ? sessionStatus(l.sets) : growthStatus(l.sets),
    nick: single ? muscleNick(l.sets) : muscleNick(l.sets, WEEK_CAP),
  }]));
  const expand = exMap && ((m) => load[m].by && (
    <ByList title={`Засчитались${byNote ? ` ${byNote}` : ""}`} entries={Object.entries(load[m].by).map(([id, n]) => {
      const ex = exMap[id];
      return { id, value: n, text: `${fmtNum(n)} подх.`, name: ex ? nm1(ex) || ex.name : "Удалённое упражнение",
        tag: (musclesOf(ex)[m] || 0) >= 1 ? "основная" : "помогает", onClick: ex && open ? () => open({ type: "exercise", id }) : undefined };
    })} />
  ));
  const rowNote = note || (single ? (r) => sessionHint(r.sets, week ? week(r.id) : null) : null);
  return <LoadBreakdown items={ITEMS} load={shown} scale={single ? SINGLE : SCALE} map={map} only={only}
    note={rowNote && ((m) => rowNote({ id: m, ...load[m] }))} expand={expand} find={find && { label: "Подобрать упражнение", go: find }} />;
}

// how the numbers are counted, under the "?"
export const MusclesWhy = () => (
  <p className="mb-2 text-[11px] leading-snug text-neutral-500">
    Считаются тяжёлые подходы (RIR 0–3, без разминок), дроп-сет — один подход. Мышца, которая в упражнении основная, получает подход,
    вспомогательная — половину (присед: квадрицепс — подход, ягодицы — половина); тренировка засчитывается мышце, если она была основной.
    Ориентир по исследованиям (Pelland и др., 2024–25): рост — от 4 подходов в неделю, хорошо — от 10 (черта на шкале), отлично — 20,
    после ~30 прироста почти нет; сколько раз в неделю — почти не важно, важен объём. На схеме мышца заливается по мере подходов,
    полностью — к 10 в неделю. Одна тренировка — своя шкала: 3 подхода — уже рост, 6–11 — оптимальный рост, больше 11 за раз прироста не видно
    (силы лучше отдать другой группе); рядом — сколько у мышцы за неделю.
    Тап по мышце на схеме или в списке выделяет её и раскрывает упражнения, из которых сложились её подходы.
  </p>
);
