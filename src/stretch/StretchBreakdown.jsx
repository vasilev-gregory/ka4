// Minutes of stretching per muscle area on the shared load breakdown (ui/LoadBreakdown): the stretching scale
// (5 min a week gives an effect, 10 is the most that still adds), filled in the mode's accent, and the stretches
// behind an area. Used by the history, the finished run and the program editor.
import { useApp } from "../ui/kit.jsx";
import { fmtDur, fmtNum, plural } from "../core/util.js";
import { ST_AREAS, ST_WEEK_MAX, ST_WEEK_MIN } from "../model/catalog.js";
import { AREA_PARTS, NO_AREA, stretchHint, stretchVerdict } from "../model/stretch.js";
import { ByList, LoadBreakdown } from "../ui/LoadBreakdown.jsx";

const SCALE = {
  target: ST_WEEK_MAX, barMax: ST_WEEK_MAX * 1.2, marks: [ST_WEEK_MIN, ST_WEEK_MAX], fill: "fill-accent-500", bar: "bg-accent-500", empty: "растяжки не было",
  legend: [[0, "0"], [ST_WEEK_MIN, "5 мин — эффект"], [ST_WEEK_MAX, "10+ — максимум"]],
  chip: { low: "bg-neutral-700/60 text-neutral-300", effect: "bg-accent-500/25 text-accent-200", max: "bg-accent-500 text-black" },
};
// one run or program: verdicts are about a week, so only the scale
const SINGLE = { ...SCALE, legend: [[0, "0"], [ST_WEEK_MAX, "10 мин — максимум недели"]] };

const fmtSec = (sec) => fmtDur(Math.round(sec) * 1000);
// how often a week: like strength, "N раз(а)"
const fmtDays = (n) => (n ? ` · ${fmtNum(n)} ${Number.isInteger(n) ? plural(n, "раз", "раза", "раз") : "раза"}` : "");

// areas: { area: { sec, freq?, by } }; single: one run / program (no verdicts); week: a line under an area saying
// what the week still needs; exMap, byNote: the stretches behind a picked area; open: opens a stretch's card;
// find(area): a program's editor — stretches for an area (ui/LoadBreakdown find)
export function StretchBreakdown({ areas, map = true, only, single = false, week = false, exMap, byNote, open, find }) {
  const { nm1 } = useApp();
  const items = [...ST_AREAS, ...Object.keys(areas).filter((a) => !ST_AREAS.includes(a) && a !== NO_AREA), NO_AREA]
    .map((a) => ({ id: a, name: a, parts: AREA_PARTS[a] || [] }));
  const load = Object.fromEntries(Object.entries(areas).map(([a, l]) => [a, {
    value: l.sec, text: `${fmtSec(l.sec)}${single ? "" : fmtDays(l.freq)}`, status: single ? null : stretchVerdict(l.sec),
  }]));
  const expand = exMap && ((a) => (
    <ByList title={`Растяжки${byNote ? ` ${byNote}` : ""}`} entries={Object.entries(areas[a].by).map(([id, sec]) => ({
      id, value: sec, text: fmtSec(sec), name: nm1(exMap[id], "Удалённая растяжка"), onClick: exMap[id] && open ? () => open({ type: "stretchExercise", id }) : undefined,
    }))} />
  ));
  return <LoadBreakdown items={items} load={load} scale={single ? SINGLE : SCALE} map={map} only={only}
    note={week ? (a) => stretchHint(areas[a].sec) : undefined} expand={expand} find={find && { label: "Подобрать растяжку", go: find }} />;
}

// how the numbers are counted, under the "?"
export const StretchWhy = () => (
  <p className="mb-2 text-[11px] leading-snug text-neutral-500">
    Считается время удержания на одну сторону. По обзору Thomas et al. (2018) для прироста гибкости нужно не меньше 5 минут
    в неделю на группу мышц (черта на шкале), и чем чаще в неделю, тем лучше — ориентир 5 дней. Более свежие сводные данные
    показывают, что после ~10 минут в неделю прирост почти не растёт. На схеме область заливается по мере минут: полностью — 10 в неделю.
    Тап по области раскрывает растяжки, из которых сложилось время.
  </p>
);
