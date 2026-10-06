// A finished workout's muscles: the body map of this workout's hard sets, or of its whole week with growth statuses.
import { useState } from "react";
import { muscleLoad, weekHint, weekLoad } from "../model/muscles.js";
import { weekStartOf } from "../core/util.js";
import { Segmented } from "../ui/kit.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["workout", "Тренировка"], ["week", "Неделя"]];

export function WorkoutMuscles({ data, w, exMap, open }) {
  const [view, setView] = useState("workout");
  const own = muscleLoad([w], exMap, -Infinity, Infinity).muscles;
  if (!Object.keys(own).length) return null; // cardio only, or no hard sets
  const week = view === "week" && weekLoad(data.workouts, exMap, weekStartOf(w.startedAt)).muscles;
  return (
    <div className="-mt-3 mb-5 rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 font-semibold">Мышцы</div>
      <Segmented options={VIEWS} value={view} onChange={setView} />
      <div className="mt-3">
        {view === "workout" ? <MuscleBreakdown key="workout" load={own} single exMap={exMap} open={open} byNote="в этой тренировке" />
          : <MuscleBreakdown key="week" load={week} note={(r) => weekHint(r.sets, r.freq)} exMap={exMap} open={open} byNote="за неделю" />}
      </div>
    </div>
  );
}
