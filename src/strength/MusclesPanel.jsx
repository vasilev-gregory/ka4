// The muscles of a period (drawn by ui/PeriodCard), one block for the history and a workout's card: day (the workout's own ladder, with its
// week beside), week (hard sets and steps), month / year (totals and the average week). onZoom: its own switch.
import { fmtNum, plural, weekStartOf } from "../core/util.js";
import { fmtTotals } from "../model/workout.js";
import { muscleLoad, weekHint, weekLoad } from "../model/muscles.js";
import { periodSummary } from "../model/periods.js";
import { inPeriod } from "../model/calendar.js";
import { useApp } from "../ui/kit.jsx";
import { PeriodCard, TOTAL_NOTE } from "../ui/PeriodNav.jsx";
import { MuscleBreakdown, MusclesWhy } from "./MuscleBreakdown.jsx";

export function MusclesPanel({ data, zoom, range, onZoom, extra, exMap, open, className }) {
  // the running workout counts in a day / week (not in the totals of a month / year); extra: a workout not saved yet
  const live = extra && !data.workouts.includes(extra) ? [extra] : [];
  const active = data.active && !(extra && extra.id === data.active.id) ? [data.active] : [];
  const all = [...data.workouts, ...active, ...live];
  const workouts = zoom === "day" || zoom === "week" ? all : data.workouts;
  const { bwAt } = useApp();
  let title, load, empty, weekOf;
  if (zoom === "day") {
    const day = inPeriod(workouts, range);
    const n = day.length;
    // one workout that day (the usual case): the same muscles as in its card, under its name
    title = n === 1 ? day[0].name : n ? `${n} ${plural(n, "тренировка", "тренировки", "тренировок")}` : "";
    load = muscleLoad(workouts, exMap, range.from, range.to).muscles;
    empty = n ? "Тяжёлых подходов не было." : "В этот день тренировок не было.";
    const wk = muscleLoad(workouts, exMap, weekStartOf(range.from), range.to).muscles; // the week up to this day
    weekOf = (m) => (wk[m] ? wk[m].sets : 0);
  } else if (zoom === "week") {
    const an = weekLoad(workouts, exMap, range.from);
    title = `тренировок: ${an.days}`;
    load = an.muscles;
    empty = "На этой неделе тяжёлых подходов не было.";
  } else {
    const s = periodSummary(workouts, exMap, bwAt, range);
    title = s.workouts ? [`${s.workouts} ${plural(s.workouts, "тренировка", "тренировки", "тренировок")}`, fmtTotals(s),
      s.kcal > 0 && `≈${fmtNum(Math.round(s.kcal / (s.kcal < 1000 ? 10 : 100)) * (s.kcal < 1000 ? 10 : 100))} ккал`].filter(Boolean).join(", ") : "";
    load = s.perWeek;
    empty = s.workouts ? "Тяжёлых подходов не было." : zoom === "month" ? "В этом месяце тренировок не было." : "В этом году тренировок не было.";
  }
  return (
    <PeriodCard title={title} why={<MusclesWhy />} items={load} empty={empty} zoom={zoom} onZoom={onZoom} className={className}>
      <MuscleBreakdown load={load} exMap={exMap} open={open} byNote={TOTAL_NOTE[zoom]}
        single={zoom === "day"} week={zoom === "day" ? weekOf : undefined} note={zoom === "week" ? (r) => weekHint(r.sets) : undefined} />
    </PeriodCard>
  );
}
