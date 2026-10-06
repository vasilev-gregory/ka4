// One finished workout: totals, the muscles it worked (and its week), rest, exercises with progress notes.
import { Trophy } from "lucide-react";
import { fmtDur, fmtKg, fmtNum, plural } from "../core/util.js";
import { fmtSets, previousOfProgram, restStats, stats } from "../model/workout.js";
import { WorkoutMuscles } from "./WorkoutMuscles.jsx";
import { SessionHeader, StatTiles } from "../ui/Session.jsx";
import { ExerciseRow } from "../ui/ExerciseCard.jsx";
import { sessionProgress } from "../model/records.js";
import { workoutKcal } from "../model/energy.js";
import { DeleteButton, Header, SwitchRow, useApp } from "../ui/kit.jsx";
import { removeWorkout, setWorkoutOff } from "../model/workoutActions.js";

// "+2,5 кг", "−1 кг", "так же"
const fmtDelta = (d) => (Math.abs(d) < 0.25 ? "так же" : `${d > 0 ? "+" : "−"}${fmtNum(Math.round(Math.abs(d) * 2) / 2)} кг`);

// how an exercise went against its previous session, as a line under it
function progressNote(data, w, e, ex, bwAt) {
  const p = sessionProgress(data.workouts, w, e, ex, bwAt);
  if (!p) return null;
  return p.record ? { text: "рекорд", good: true } : { text: `${fmtDelta(p.delta)} к прошлому разу`, good: p.delta >= 0.25 };
}

export function WorkoutDetail({ data, up, exMap, id, back, open }) {
  const { bwAt } = useApp();
  const w = data.workouts.find((x) => x.id === id);
  if (!w) return <div className="p-4"><Header title="Тренировка удалена" back={back} /></div>;
  const st = stats(w, exMap, bwAt);
  // volume against the previous workout of the same program
  const prevSame = previousOfProgram(data.workouts, w);
  const prevVol = prevSame ? stats(prevSame, exMap, bwAt).vol : 0;
  const volNote = prevVol > 0 ? `объём, ${st.vol >= prevVol ? "+" : "−"}${Math.round(Math.abs(st.vol / prevVol - 1) * 100)}%` : "объём";
  const kcal = workoutKcal(w, exMap, bwAt);
  const cardioOnly = st.cardioMin > 0 && !st.sets;
  const tiles = [
    [fmtDur(st.dur), st.extra >= 60000 ? `время, +${fmtDur(st.extra)} позже` : "время"],
    !cardioOnly && [fmtKg(st.vol), volNote],
    !cardioOnly && [st.sets, plural(st.sets, "подход", "подхода", "подходов")],
    st.cardioMin > 0 && [`${fmtNum(st.cardioMin)} мин`, st.cardioKm > 0 ? `кардио, ${fmtNum(st.cardioKm)} км` : "кардио"],
    kcal == null ? ["—", "ккал: укажи вес тела в замерах"] : [`≈${kcal}`, "ккал, оценка"],
  ].filter(Boolean);
  return (
    <div className="p-4 pb-28">
      <SessionHeader name={w.name} startedAt={w.startedAt} back={back} />
      <StatTiles tiles={tiles} />
      <WorkoutMuscles data={data} w={w} exMap={exMap} open={open} />
      {(() => {
        const rs = restStats(w);
        if (!rs.nSets && !rs.nEx) return null;
        return (
          <StatTiles className="-mt-3 mb-5" tiles={[[rs.nSets ? fmtDur(rs.sets) : "—", "средний отдых между подходами"], [rs.nEx ? fmtDur(rs.ex) : "—", "между упражнениями"]]} />
        );
      })()}
      <div className="space-y-2">
        {w.exercises.map((e, i) => {
          const ex = exMap[e.exerciseId];
          const note = ex && progressNote(data, w, e, ex, bwAt);
          return (
            <ExerciseRow key={i} ex={ex} missing="Удалённое упражнение" text={fmtSets(e.sets, ex ? ex.kind : "reps")}
              onClick={() => open({ type: "exercise", id: e.exerciseId })}
              note={note && (
                <div className={`text-xs ${note.good ? "text-accent-400" : "text-neutral-500"}`}>
                  {note.text === "рекорд" && <Trophy size={12} className="mr-1 inline -mt-0.5" />}{note.text}
                </div>
              )} />
          );
        })}
      </div>
      <SwitchRow title="Не в зачёт" className="mt-6" on={!!w.off} onClick={() => up((d) => setWorkoutOff(d, id, !w.off))}
        hint="Плохой день: остаётся в истории и в счёте тренировок, но не в графиках упражнений, рекордах и «прошлом разе»" />
      <DeleteButton onConfirm={() => { up((d) => removeWorkout(d, id)); back(); }} confirmText="Удалить из истории?" className="mt-3">
        Удалить тренировку
      </DeleteButton>
    </div>
  );
}
