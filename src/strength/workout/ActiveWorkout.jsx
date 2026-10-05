// The running workout: header with time and volume, exercise cards, add / finish / pause, the
// "update the program?" question, undo of a deleted set, the exercise picker.
import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { unlockAudio } from "../../core/sound.js";
import { fmtDur, fmtKg, progTitle } from "../../core/util.js";
import {
  durations, finalizeActive, lastSession, liveRestKey, programDiff, restBefore, restShown, segmentsOf, setColumns, stats,
} from "../../model/workout.js";
import * as A from "../../model/workoutActions.js";
import { useHoldReorder, useLongPress, useSwipeRows } from "../../ui/gestures.js";
import { Button, ConfirmButton, useApp, useNow } from "../../ui/kit.jsx";
import { moveItem, useSortable } from "../../ui/sortable.js";
import { Picker } from "../ExerciseList.jsx";
import { ExerciseCard } from "./ExerciseCard.jsx";

const UNKNOWN_EXERCISE = { name: "Удалённое упражнение", kind: "reps" };

export function ActiveWorkout({ data, up, exMap, open }) {
  const { bwAt } = useApp();
  const a = data.active;
  const [picker, setPicker] = useState(null); // {} = add, { replace: ei } = swap that exercise
  const [askUpdate, setAskUpdate] = useState(false);
  const [sel, setSel] = useState(null); // {ei, set: Set<si>} while selecting sets to merge / delete
  const [undo, setUndo] = useState(null); // {ei, si, set} right after a swipe-delete
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 5000); return () => clearTimeout(t); }, [undo]);
  const now = useNow(1000, !a.paused);
  const sort = useSortable((from, to) => up((d) => { moveItem(d.active.exercises, from, to); }));
  const { drag: colDrag, headerProps } = useHoldReorder((from, to) => up((d) => A.moveColumn(d.settings, from, to)));
  const longPress = useLongPress();
  const { swipe, bind: swipeBind } = useSwipeRows({ disabled: !!sel, onStart: longPress.cancel });

  const cols = setColumns(data.settings);
  const restOn = restShown(data.settings);
  const rests = restOn ? restBefore(a) : {};
  const liveKey = restOn ? liveRestKey(a) : null;
  const st = stats(a, exMap, bwAt);
  const segs = segmentsOf(a);
  const dur = durations(a, now);
  const program = a.programId ? data.programs.find((p) => p.id === a.programId) : null;
  const hasDone = a.exercises.some((e) => e.sets.some((s) => s.done));

  const finish = () => (programDiff(a, data.programs) ? setAskUpdate(true) : doFinish(false));
  const doFinish = (updateProgram) => {
    setAskUpdate(false);
    const id = a.id;
    up((d) => { finalizeActive(d, updateProgram); });
    if (hasDone) open({ type: "workout", id });
  };
  const pick = (ex) => {
    up((d) => (picker.replace !== undefined ? A.replaceExercise(d, picker.replace, ex) : A.addExercises(d, [ex])));
    setPicker(null);
  };
  const pickMany = (list) => { up((d) => A.addExercises(d, list)); setPicker(null); };

  // actions of one exercise card
  const cardActions = (ei) => ({
    replace: () => setPicker({ replace: ei }),
    remove: () => up((d) => A.removeExercise(d, ei)),
    addSet: () => up((d) => A.addSet(d, ei)),
    editSet: (si, patch) => up((d) => A.setSet(d, ei, si, patch)),
    toggleSet: (si) => { unlockAudio(); up((d) => A.toggleSet(d, ei, si)); },
    swipeSet: (si, dir) => {
      if (dir > 0) { unlockAudio(); up((d) => A.toggleSet(d, ei, si)); return; }
      const removed = a.exercises[ei]?.sets[si];
      if (!removed) return;
      setUndo({ ei, si, set: structuredClone(removed) });
      up((d) => A.deleteSet(d, ei, si));
    },
    mergeSelected: () => { up((d) => A.mergeSets(d, ei, sel.set)); setSel(null); },
    unmergeSelected: () => { up((d) => A.unmergeSets(d, ei, sel.set)); setSel(null); },
    deleteSelected: () => { up((d) => A.deleteSets(d, ei, sel.set)); setSel(null); },
    cancelSelection: () => setSel(null),
  });
  // set number: tap = warm-up on/off (or select while selecting), hold = start selecting
  const numberProps = (ei) => (si) => longPress.bind({
    onLong: () => setSel({ ei, set: new Set([si]) }),
    onTap: () => {
      if (sel && sel.ei === ei) {
        setSel((prev) => { const n = new Set(prev.set); if (n.has(si)) n.delete(si); else n.add(si); return n.size ? { ei, set: n } : null; });
      } else up((d) => A.toggleWarmup(d, ei, si));
    },
  });

  return (
    <div className="p-4 pb-44">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">{a.paused ? "На паузе" : segs.length > 1 ? `Продолжение, отрезок ${segs.length}` : "Идёт тренировка"}</p>
          <h1 className="text-lg font-bold">{a.name}</h1>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${a.paused ? "text-neutral-500" : "text-accent-400"}`}>
            {a.paused ? fmtDur(dur.main) : fmtDur(now - segs[segs.length - 1].start)}
          </div>
          <div className="text-xs text-neutral-400 tabular-nums">
            {st.sets} подх., {fmtKg(st.vol)}
            {segs.length > 1 && <span className="block">основная {fmtDur(dur.main)}{dur.extra >= 60000 ? `, +${fmtDur(dur.extra)}` : ""}</span>}
          </div>
        </div>
      </div>

      {a.paused && (
        <Button block onClick={() => up((d) => A.resumeWorkout(d))} className="mb-3 flex items-center justify-center gap-2">
          <Play size={18} /> Продолжить тренировку
        </Button>
      )}

      {a.exercises.map((e, ei) => (
        <ExerciseCard key={ei + e.exerciseId} e={e} ei={ei} ex={exMap[e.exerciseId] || UNKNOWN_EXERCISE} exData={exMap[e.exerciseId]}
          last={lastSession(data.workouts, e.exerciseId)} cols={cols} compact={sort.dragging} sort={sort} sortCount={a.exercises.length}
          g={{ swipe, swipeBind, headerProps, colDrag, numberProps: numberProps(ei) }}
          sel={sel} rests={rests} liveKey={liveKey} liveMs={now - a.lastSetAt} act={cardActions(ei)} open={open} />
      ))}

      <Button variant="dashed" block onClick={() => setPicker({})}>Добавить упражнение</Button>

      <div className="mt-6 flex gap-2">
        <ConfirmButton onConfirm={() => up((d) => { d.active = null; })} confirmText="Удалить тренировку?"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-neutral-400" armedClassName="rounded-xl bg-red-600 px-4 py-3 text-white">
          Отменить
        </ConfirmButton>
        {a.paused ? (
          <>
            <Button className="flex-1" onClick={() => up((d) => A.resumeWorkout(d))}>Продолжить</Button>
            <button onClick={finish} className="rounded-xl bg-neutral-800 px-4 py-3">Завершить</button>
          </>
        ) : (
          <>
            <button onClick={() => up((d) => A.pauseWorkout(d))} className="rounded-xl bg-neutral-800 px-4 py-3">Пауза</button>
            <Button className="flex-1" onClick={finish}>Завершить</Button>
          </>
        )}
      </div>

      {askUpdate && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3" onClick={() => setAskUpdate(false)}>
          <div className="safe-bottom mx-auto w-full max-w-md rounded-2xl bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-base font-semibold">Обновить программу?</div>
            <p className="mb-4 text-xs text-neutral-400">
              Состав или подходы отличаются от «{progTitle(program)}». Можно записать в программу то, как ты тренировался сегодня.
            </p>
            <Button block onClick={() => doFinish(true)} className="mb-2">Обновить программу</Button>
            <Button variant="quiet" block onClick={() => doFinish(false)}>Оставить программу как была</Button>
          </div>
        </div>
      )}

      {undo && (
        <div className="fixed inset-x-0 top-0 z-50 px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-black shadow-lg">
            <span className="flex-1">Подход удалён</span>
            <button onClick={() => { const u = undo; setUndo(null); up((d) => A.restoreSet(d, u.ei, u.si, u.set)); }}
              className="font-semibold text-accent-700">Вернуть</button>
          </div>
        </div>
      )}

      {picker && <Picker data={data} up={up} onPick={pick} onClose={() => setPicker(null)}
        onPickMany={picker.replace !== undefined ? undefined : pickMany}
        title={picker.replace !== undefined ? "Заменить упражнение" : undefined} />}
    </div>
  );
}
