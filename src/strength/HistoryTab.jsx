// Strength history tab: the shared calendar (ui/PeriodNav), the period's muscles (MusclesPanel, the same block as in a
// workout's card) and its workouts — on a day with their exercises and sets, as in the workout's card.
import { fmtTotals, fmtWDur, stats } from "../model/workout.js";
import { workoutKcal } from "../model/energy.js";
import { inPeriod } from "../model/calendar.js";
import { Header, useApp } from "../ui/kit.jsx";
import { PeriodNav, usePeriod } from "../ui/PeriodNav.jsx";
import { HistoryRow } from "../ui/Session.jsx";
import { MusclesPanel } from "./MusclesPanel.jsx";
import { WorkoutExercises } from "./History.jsx";

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
        <MusclesPanel data={data} zoom={zoom} range={range} exMap={exMap} open={open} />
      </PeriodNav>
      {data.workouts.length === 0 && <p className="text-neutral-400">Здесь появятся завершённые тренировки.</p>}
      <div className="space-y-2">
        {list.map((w) => {
          const st = stats(w, exMap, bwAt);
          const kcal = workoutKcal(w, exMap, bwAt);
          return (
            <div key={w.id} className="space-y-2">
              <HistoryRow startedAt={w.startedAt} name={w.name} onClick={() => open({ type: "workout", id: w.id })}
                summary={`${fmtWDur(st)}, ${fmtTotals(st)}${kcal != null ? `, ≈${kcal} ккал` : ""}${w.off ? ", не в зачёт" : ""}`} />
              {zoom === "day" && <WorkoutExercises data={data} w={w} exMap={exMap} open={open} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
