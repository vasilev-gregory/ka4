// Strength history tab: the shared calendar (ui/PeriodNav), the period's analysis (hard sets per muscle, totals)
// and its workouts.
import { fmtDate, fmtNum, plural } from "../core/util.js";
import { fmtTotals, fmtWDur, stats } from "../model/workout.js";
import { weekLoad } from "../model/muscles.js";
import { workoutKcal } from "../model/energy.js";
import { periodSummary } from "../model/periods.js";
import { inPeriod } from "../model/calendar.js";
import { Header, useApp } from "../ui/kit.jsx";
import { PeriodCard, PeriodNav, TOTAL_NOTE, usePeriod } from "../ui/PeriodNav.jsx";
import { MuscleBreakdown, MusclesWhy } from "./MuscleBreakdown.jsx";

// week: hard sets per muscle. month / year: totals and the average week per muscle.
function PeriodPanel({ zoom, range, workouts, exMap, open }) {
  const { bwAt } = useApp();
  let title, load, empty;
  if (zoom === "week") {
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
  const any = Object.keys(load).length > 0;
  return (
    <PeriodCard title={title} averaged={zoom !== "week" && any} why={<MusclesWhy />}>
      {any ? <MuscleBreakdown load={load} exMap={exMap} open={open} byNote={TOTAL_NOTE[zoom]} /> : <p className="text-xs text-neutral-500">{empty}</p>}
    </PeriodCard>
  );
}

export function HistoryTab({ data, exMap, open }) {
  const { bwAt } = useApp();
  const period = usePeriod("strength");
  const { zoom, range } = period;
  const all = data.active ? [...data.workouts, data.active] : data.workouts;
  const list = inPeriod(data.workouts, range).reverse();

  return (
    <div className="p-4">
      <Header title="История силовых" />
      <PeriodNav period={period} dates={all.map((w) => w.startedAt)}>
        {/* the running workout counts in the week's sets, but not in the totals of a month / year */}
        <PeriodPanel zoom={zoom} range={range} workouts={zoom === "week" ? all : data.workouts} exMap={exMap} open={open} />
      </PeriodNav>
      {data.workouts.length === 0 && <p className="text-neutral-400">Здесь появятся завершённые тренировки.</p>}
      <div className="space-y-2">
        {list.map((w) => {
          const st = stats(w, exMap, bwAt);
          const kcal = workoutKcal(w, exMap, bwAt);
          return (
            <button key={w.id} onClick={() => open({ type: "workout", id: w.id })} className="w-full rounded-xl bg-neutral-900 p-4 text-left active:bg-neutral-800">
              <div className="text-xs text-neutral-400">{fmtDate(w.startedAt)}</div>
              <div className="font-semibold">{w.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtWDur(st)}, {fmtTotals(st)}{kcal != null && `, ≈${kcal} ккал`}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
