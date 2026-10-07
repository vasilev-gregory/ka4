// Strength history tab: the shared calendar (ui/PeriodNav), the period's analysis (hard sets per muscle, totals)
// and its workouts.
import { fmtNum, plural } from "../core/util.js";
import { fmtTotals, fmtWDur, stats } from "../model/workout.js";
import { muscleLoad, sessionWindows, weekLoad } from "../model/muscles.js";
import { workoutKcal } from "../model/energy.js";
import { periodSummary } from "../model/periods.js";
import { inPeriod } from "../model/calendar.js";
import { Header, useApp } from "../ui/kit.jsx";
import { PeriodCard, PeriodNav, TOTAL_NOTE, usePeriod } from "../ui/PeriodNav.jsx";
import { HistoryRow } from "../ui/Session.jsx";
import { MuscleBreakdown, MusclesWhy } from "./MuscleBreakdown.jsx";

// day: that day's hard sets per muscle against the per-workout norm (as a workout's card). week: hard sets per muscle.
// month / year: totals and the average week per muscle.
function PeriodPanel({ data, zoom, range, workouts, exMap, open }) {
  const { bwAt } = useApp();
  let title, load, empty;
  if (zoom === "day") {
    const day = inPeriod(workouts, range);
    const n = day.length;
    // one workout that day (the usual case): the same muscles as in its card, under its name
    title = n === 1 ? day[0].name : n ? `${n} ${plural(n, "тренировка", "тренировки", "тренировок")}` : "";
    load = muscleLoad(workouts, exMap, range.from, range.to).muscles;
    empty = n ? "Тяжёлых подходов не было." : "В этот день тренировок не было.";
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
  const any = Object.keys(load).length > 0;
  return (
    <PeriodCard title={title} averaged={(zoom === "month" || zoom === "year") && any} why={<MusclesWhy />}>
      {any ? <MuscleBreakdown load={load} exMap={exMap} open={open} byNote={TOTAL_NOTE[zoom]}
        windows={zoom === "day" ? sessionWindows(data, exMap) : undefined} />
        : <p className="text-xs text-neutral-500">{empty}</p>}
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
        <PeriodPanel data={data} zoom={zoom} range={range} workouts={zoom === "week" || zoom === "day" ? all : data.workouts} exMap={exMap} open={open} />
      </PeriodNav>
      {data.workouts.length === 0 && <p className="text-neutral-400">Здесь появятся завершённые тренировки.</p>}
      <div className="space-y-2">
        {list.map((w) => {
          const st = stats(w, exMap, bwAt);
          const kcal = workoutKcal(w, exMap, bwAt);
          return (
            <HistoryRow key={w.id} startedAt={w.startedAt} name={w.name} onClick={() => open({ type: "workout", id: w.id })}
              summary={`${fmtWDur(st)}, ${fmtTotals(st)}${kcal != null ? `, ≈${kcal} ккал` : ""}${w.off ? ", не в зачёт" : ""}`} />
          );
        })}
      </div>
    </div>
  );
}
