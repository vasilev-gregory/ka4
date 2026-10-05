// The running workout: header with time and volume, exercise cards, add / finish / pause, the
// "update the program?" question, undo of a deleted set, the exercise picker.
import { useState } from "react";
import { Play } from "lucide-react";
import { unlockAudio } from "../../core/sound.js";
import { fmtDur, fmtKg, progTitle } from "../../core/util.js";
import {
  durations, finalizeActive, lastSession, liveRestKey, programDiff, restBefore, restShown, segmentsOf, setColumns, stats,
} from "../../model/workout.js";
import { bestE1rm, recordSets } from "../../model/records.js";
import * as A from "../../model/workoutActions.js";
import { useHoldReorder, useLongPress, useSwipeRows } from "../../ui/gestures.js";
import { Button, Card, ConfirmButton, useApp, useNow, useUndo } from "../../ui/kit.jsx";
import { useWakeLock } from "../../ui/useWakeLock.js";
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
  const undo = useUndo();
  const now = useNow(1000, !a.paused);
  useWakeLock(!a.paused); // the screen stays on while training
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
      const s = a.exercises[ei]?.sets[si];
      if (!s) return;
      if (dir > 0) {
        unlockAudio();
        up((d) => A.toggleSet(d, ei, si));
        undo.offer(s.done ? "Отметка снята" : "Подход отмечен", () => up((d) => { A.toggleSet(d, ei, si); if (!s.done) A.clearRest(d); }));
        return;
      }
      const removed = structuredClone(s);
      up((d) => A.deleteSet(d, ei, si));
      undo.offer("Подход удалён", () => up((d) => A.restoreSet(d, ei, si, removed)));
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

      {!data.settings.gestureHintSeen && (
        <Card className="mb-3 text-xs leading-relaxed text-neutral-300">
          <div className="mb-1 text-sm font-semibold text-neutral-100">Жесты</div>
          Свайп подхода вправо — сделано, влево — удалить. Тап по номеру — разминка, удержание — выбрать несколько
          (дроп-сет, удаление). Удержание названия колонки — переставить колонки. Свайп по нижней панели — растяжка.
          <Button size="sm" variant="quiet" className="mt-2 block" onClick={() => up((d) => { d.settings.gestureHintSeen = true; })}>Понятно</Button>
        </Card>
      )}

      {a.paused && (
        <Button block onClick={() => up((d) => A.resumeWorkout(d))} className="mb-3 flex items-center justify-center gap-2">
          <Play size={18} /> Продолжить тренировку
        </Button>
      )}

      {a.exercises.map((e, ei) => (
        <ExerciseCard key={ei + e.exerciseId} e={e} ei={ei} ex={exMap[e.exerciseId] || UNKNOWN_EXERCISE} exData={exMap[e.exerciseId]}
          last={lastSession(data.workouts, e.exerciseId)}
          records={recordSets(e.sets, exMap[e.exerciseId], bwAt(a.startedAt), bestE1rm(data.workouts, e.exerciseId, exMap[e.exerciseId], bwAt))}
          cols={cols} compact={sort.dragging} sort={sort} sortCount={a.exercises.length}
          g={{ swipe, swipeBind, headerProps, colDrag, numberProps: numberProps(ei) }}
          sel={sel} rests={rests} liveKey={liveKey} liveMs={now - a.lastSetAt} act={cardActions(ei)} open={open} />
      ))}

      <Button variant="dashed" block onClick={() => setPicker({})}>Добавить упражнение</Button>

      <div className="mt-6 flex gap-2">
        <ConfirmButton onConfirm={() => up((d) => { d.active = null; })} confirmText="Удалить тренировку?"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-neutral-400" armedClassName="rounded-xl bg-red-600 px-4 py-3 text-white">
          Удалить
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

      {undo.toast}

      {picker && <Picker data={data} up={up} onPick={pick} onClose={() => setPicker(null)}
        onPickMany={picker.replace !== undefined ? undefined : pickMany}
        title={picker.replace !== undefined ? "Заменить упражнение" : undefined} />}
    </div>
  );
}
