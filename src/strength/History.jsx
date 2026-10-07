// One workout's card: totals, the muscles it worked (and its week), rest, exercises with progress notes, the text
// export. Finished, or the running one as it would be if finished now (live: «Итог сейчас», no delete / «не в зачёт»).
import { useState } from "react";
import { Trophy } from "lucide-react";
import { fmtDur, fmtKg, fmtNum, plural } from "../core/util.js";
import { previousOfProgram, restBefore, restStats, stats, workoutSoFar } from "../model/workout.js";
import { SetTable } from "./SetTable.jsx";
import { workoutText } from "../model/workoutText.js";
import { WorkoutMuscles } from "./WorkoutMuscles.jsx";
import { SessionHeader, StatTiles } from "../ui/Session.jsx";
import { ExerciseRow } from "../ui/ExerciseCard.jsx";
import { sessionProgress } from "../model/records.js";
import { workoutKcal } from "../model/energy.js";
import { Button, Card, DeleteButton, Header, SwitchRow, useApp, useNow } from "../ui/kit.jsx";
import { stillCounted } from "../model/muscles.js";
import { removeWorkout, setWorkoutOff } from "../model/workoutActions.js";

// "+2,5 кг", "−1 кг", "так же"
const fmtDelta = (d) => (Math.abs(d) < 0.25 ? "так же" : `${d > 0 ? "+" : "−"}${fmtNum(Math.round(Math.abs(d) * 2) / 2)} кг`);

// how an exercise went against its previous session, as a line under it
function progressNote(data, w, e, ex, bwAt) {
  const p = sessionProgress(data.workouts, w, e, ex, bwAt);
  if (!p) return null;
  return p.record ? { text: "рекорд", good: true } : { text: `${fmtDelta(p.delta)} к прошлому разу`, good: p.delta >= 0.25 };
}

export function WorkoutDetail({ data, up, exMap, id, back, open, live = false }) {
  const { bwAt, nm1 } = useApp();
  const now = useNow(1000, live);
  const w = live ? data.active && workoutSoFar(data.active, now) : data.workouts.find((x) => x.id === id);
  if (!w) return <div className="p-4"><Header title={live ? "Тренировка завершена" : "Тренировка удалена"} back={back} /></div>;
  const st = stats(w, exMap, bwAt);
  const restsOf = restBefore(w); // "ei:si" -> ms before the set, or "drop"
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
      <SessionHeader name={live ? `${w.name} · итог сейчас` : w.name} startedAt={w.startedAt} back={back} />
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
            <ExerciseRow key={i} ex={ex} missing="Удалённое упражнение"
              onClick={() => open({ type: "exercise", id: e.exerciseId })}
              note={note && (
                <div className={`text-xs ${note.good ? "text-accent-400" : "text-neutral-500"}`}>
                  {note.text === "рекорд" && <Trophy size={12} className="mr-1 inline -mt-0.5" />}{note.text}
                </div>
              )}>
              <SetTable sets={e.sets} kind={ex ? ex.kind : "reps"} assist={ex && ex.assist} bw={ex && ex.bw} rest={(si) => restsOf[`${i}:${si}`]} />
            </ExerciseRow>
          );
        })}
      </div>
      <CopyText text={() => workoutText(data, w, exMap, bwAt, nm1, live)} />
      {!live && <>
        {w.off && <NotForNothing data={data} w={w} exMap={exMap} />}
        <SwitchRow title="Не в зачёт" className="mt-3" on={!!w.off} onClick={() => up((d) => setWorkoutOff(d, id, !w.off))}
          hint="Плохой день: остаётся в истории и в счёте тренировок, но не в графиках упражнений, рекордах и «прошлом разе»" />
        <DeleteButton onConfirm={() => { up((d) => removeWorkout(d, id)); back(); }} confirmText="Удалить из истории?" className="mt-3">
          Удалить тренировку
        </DeleteButton>
      </>}
    </div>
  );
}

// a workout «не в зачёт»: out of the progress, but it still counted — say so
function NotForNothing({ data, w, exMap }) {
  const { sets, muscles, nth } = stillCounted(data.workouts, w, exMap);
  return (
    <Card className="mt-3">
      <div className="font-semibold text-accent-400">Всё равно не зря</div>
      <p className="mt-1 text-xs text-neutral-300">Пришёл и сделал, что смог, — это лучше пропуска. Графики и рекорды этот день не тянет вниз, а сделанное засчиталось.</p>
      {sets > 0 && (
        <>
          <p className="mt-2 text-xs text-neutral-400">{sets} {plural(sets, "тяжёлый подход", "тяжёлых подхода", "тяжёлых подходов")} — в неделю мышц:</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {muscles.slice(0, 4).map(([name, n, week]) => (
              <li key={name}><span className="text-accent-300">+{fmtNum(n)}</span> {name} <span className="text-neutral-500">· за неделю {fmtNum(week)}</span></li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-2 text-xs text-neutral-400">{nth}-я тренировка за {new Date(w.startedAt).toLocaleString("ru", { month: "long" })}.</p>
    </Card>
  );
}

// the workout as text for a chat: copied to the clipboard; where copying is blocked, shown to select by hand
function CopyText({ text }) {
  const [state, setState] = useState(null); // null | "copied" | the text to select
  const copy = async () => {
    const t = text();
    try { await navigator.clipboard.writeText(t); setState("copied"); setTimeout(() => setState(null), 2000); } catch (e) { setState(t); }
  };
  return (
    <>
      <Button variant="secondary" block className="mt-6" onClick={copy}>{state === "copied" ? "Скопировано" : "Скопировать текстом"}</Button>
      {state && state !== "copied" && (
        <textarea readOnly value={state} rows={10} onFocus={(e) => e.target.select()}
          className="mt-2 w-full rounded-xl bg-neutral-900 p-3 text-xs text-neutral-300" />
      )}
    </>
  );
}
