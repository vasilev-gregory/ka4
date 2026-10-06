// A finished workout's muscles: the body map of this workout's hard sets, or of its whole week with growth statuses.
import { muscleLoad, weekHint, weekLoad } from "../model/muscles.js";
import { weekStartOf } from "../core/util.js";
import { ViewsCard } from "../ui/Session.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["workout", "Тренировка"], ["week", "Неделя"]];

export function WorkoutMuscles({ data, w, exMap, open }) {
  const own = muscleLoad([w], exMap, -Infinity, Infinity).muscles;
  if (!Object.keys(own).length) return null; // cardio only, or no hard sets
  return (
    <ViewsCard title="Мышцы" views={VIEWS} className="-mt-3 mb-5">
      {(view) => (view === "workout" ? <MuscleBreakdown key="workout" load={own} single exMap={exMap} open={open} byNote="в этой тренировке" />
        : <MuscleBreakdown key="week" load={weekLoad(data.workouts, exMap, weekStartOf(w.startedAt)).muscles}
          note={(r) => weekHint(r.sets, r.freq)} exMap={exMap} open={open} byNote="за неделю" />)}
    </ViewsCard>
  );
}
