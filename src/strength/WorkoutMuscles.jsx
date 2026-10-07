// A workout's muscles (finished, or the running one live): the body map of its hard sets on the per-session scale,
// or of its whole week with growth statuses.
import { muscleLoad, sessionWindows, weekHint, weekLoad } from "../model/muscles.js";
import { weekStartOf } from "../core/util.js";
import { ViewsCard } from "../ui/Session.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["workout", "Тренировка"], ["week", "Неделя"]];

export function WorkoutMuscles({ data, w, exMap, open }) {
  const own = muscleLoad([w], exMap, -Infinity, Infinity).muscles;
  if (!Object.keys(own).length) return null; // cardio only, or no hard sets (yet)
  const all = data.workouts.includes(w) ? data.workouts : [...data.workouts, w]; // the running one counts in its week
  return (
    <ViewsCard title="Мышцы" views={VIEWS} className="-mt-3 mb-5">
      {(view) => (view === "workout" ? <MuscleBreakdown key="workout" load={own} windows={sessionWindows(data, exMap)} exMap={exMap} open={open} byNote="в этой тренировке" />
        : <MuscleBreakdown key="week" load={weekLoad(all, exMap, weekStartOf(w.startedAt)).muscles}
          note={(r) => weekHint(r.sets)} exMap={exMap} open={open} byNote="за неделю" />)}
    </ViewsCard>
  );
}
