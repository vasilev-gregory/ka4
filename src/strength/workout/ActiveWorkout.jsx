// The running workout: header with time and volume, exercise cards, add / finish / pause, the
// "update the program?" question, undo of a deleted set, the exercise picker.
import { useState } from "react";
import { Play, Timer } from "lucide-react";
import { unlockAudio } from "../../core/sound.js";
import { fmtDur, plural, progTitle } from "../../core/util.js";
import {
  durations, fmtTotals, lastSession, liveRestKey, programDiff, restBefore, restShown, segmentsOf, setColumns, stats,
} from "../../model/workout.js";
import { bestE1rm, recordSets } from "../../model/records.js";
import * as A from "../../model/workoutActions.js";
import { nextStep } from "../../model/progression.js";
import { useHoldReorder, useLongPress, useSwipeRows } from "../../ui/gestures.js";
import { Button, DeleteButton, Sheet, useApp, useNow, useUndo } from "../../ui/kit.jsx";
import { useRestorable } from "../../ui/navigation.js";
import { useSortable } from "../../ui/sortable.js";
import { Picker } from "../ExerciseList.jsx";
import { ExerciseCard } from "./ExerciseCard.jsx";
import { WarmupCard } from "./WarmupCard.jsx";
import { WorkoutHelp } from "./WorkoutHelp.jsx";

const UNKNOWN_EXERCISE = { name: "Удалённое упражнение", kind: "reps" };

export function ActiveWorkout({ data, up, exMap, open }) {
  const { bwAt } = useApp();
  const a = data.active;
  // {} = add, { group } = add, list opened on that group, { replace: ei } = swap that exercise
  const [picker, setPicker] = useRestorable("workout-picker", null);
  const [askUpdate, setAskUpdate] = useState(false);
  const [askFinish, setAskFinish] = useState(false);
  const [help, setHelp] = useState(false);
  const [sel, setSel] = useState(null); // {ei, set: Set<si>} while selecting sets to merge / delete
  const undo = useUndo();
  const now = useNow(1000, !a.paused);
  const sort = useSortable((from, to) => up((d) => A.moveExercise(d, from, to)));
  const { drag: colDrag, headerProps } = useHoldReorder((from, to) => up((d) => A.moveColumn(d.settings, from, to)));
  const longPress = useLongPress();
  const { swipe, bind: swipeBind } = useSwipeRows({ disabled: !!sel, onStart: longPress.cancel });
  const { swipe: exSwipe, bind: exSwipeBind } = useSwipeRows({ disabled: !!sel || sort.dragging });

  const cols = setColumns(data.settings);
  const restOn = restShown(data.settings);
  const rests = restOn ? restBefore(a) : {};
  const liveKey = restOn ? liveRestKey(a) : null;
  const st = stats(a, exMap, bwAt);
  const segs = segmentsOf(a);
  const dur = durations(a, now);
  const program = a.programId ? data.programs.find((p) => p.id === a.programId) : null;
  const hasDone = a.exercises.some((e) => e.sets.some((s) => s.done));

  // sets not ticked are dropped on finishing: with some left, ask first
  const unticked = a.exercises.reduce((n, e) => n + e.sets.filter((x) => !x.done && x.t !== "w").length, 0);
  // off: «не в зачёт» (a bad day, the rest dropped): no program update either, that's not how the program goes
  const finish = (off = false) => {
    if (unticked && !askFinish) { setAskFinish(true); return; }
    setAskFinish(false);
    if (off === true) doFinish(false, true);
    else if (programDiff(a, data.programs)) setAskUpdate(true); else doFinish(false);
  };
  const doFinish = (updateProgram, off = false) => {
    setAskUpdate(false);
    const id = a.id;
    up((d) => A.finishWorkout(d, updateProgram, Date.now(), off));
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
    remove: () => {
      const removed = structuredClone(a.exercises[ei]);
      up((d) => A.removeExercise(d, ei));
      undo.offer("Упражнение убрано", () => up((d) => A.restoreExercise(d, ei, removed)));
    },
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
    deleteSelected: () => {
      const was = structuredClone(a.exercises[ei].sets);
      up((d) => A.deleteSets(d, ei, sel.set));
      setSel(null);
      undo.offer("Подходы удалены", () => up((d) => A.restoreSets(d, ei, was)));
    },
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
          <h1 className="flex items-center gap-2 text-lg font-bold">
            {a.name}
            <button onClick={() => setHelp(true)} aria-label="Как работать с подходами"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-400">?</button>
          </h1>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${a.paused ? "text-neutral-500" : "text-accent-400"}`}>
            {a.paused ? fmtDur(dur.main) : fmtDur(now - segs[segs.length - 1].start)}
          </div>
          <div className="text-xs text-neutral-400 tabular-nums">
            {fmtTotals(st)}
            {segs.length > 1 && <span className="block">основная {fmtDur(dur.main)}{dur.extra >= 60000 ? `, +${fmtDur(dur.extra)}` : ""}</span>}
          </div>
          {/* the rest strip was hidden: bring it back */}
          {!a.restEndsAt && a.lastSetAt && !a.paused && data.settings.countdown !== false && (
            <button onClick={() => up((d) => A.showRest(d, Date.now()))} className="mt-1 inline-flex items-center gap-1 text-xs text-accent-400">
              <Timer size={14} /> Таймер отдыха
            </button>
          )}
        </div>
      </div>

      {a.warmup && <WarmupCard warmup={a.warmup} startedAt={a.startedAt} now={now} onDone={() => { unlockAudio(); up((d) => A.finishWarmup(d)); }} />}

      {a.paused && (
        <Button block onClick={() => up((d) => A.resumeWorkout(d))} className="mb-3 flex items-center justify-center gap-2">
          <Play size={18} /> Продолжить тренировку
        </Button>
      )}

      {a.exercises.map((e, ei) => (
        <ExerciseCard key={ei + e.exerciseId} e={e} ei={ei} ex={exMap[e.exerciseId] || UNKNOWN_EXERCISE} exData={exMap[e.exerciseId]}
          last={lastSession(data.workouts, e.exerciseId)} step={nextStep(data.workouts, exMap[e.exerciseId])}
          records={recordSets(e.sets, exMap[e.exerciseId], bwAt(a.startedAt), bestE1rm(data.workouts, e.exerciseId, exMap[e.exerciseId], bwAt))}
          cols={cols} compact={sort.dragging} sort={sort} sortCount={a.exercises.length}
          g={{ swipe, swipeBind, exSwipe, exSwipeBind, headerProps, colDrag, numberProps: numberProps(ei) }}
          sel={sel} rests={rests} liveKey={liveKey} liveMs={now - a.lastSetAt} act={cardActions(ei)} open={open} />
      ))}

      <div className="flex gap-2">
        <Button variant="dashed" className="min-w-0 flex-1" onClick={() => setPicker({})}>Добавить упражнение</Button>
        <Button variant="dashed" className="w-28 shrink-0" onClick={() => setPicker({ group: "кардио" })}>+ Кардио</Button>
      </div>

      <div className="mt-6 flex gap-2">
        <DeleteButton inline onConfirm={() => up(A.discardWorkout)} confirmText="Не сохранять?">Отменить</DeleteButton>
        {a.paused ? (
          <>
            <Button className="flex-1" onClick={() => up((d) => A.resumeWorkout(d))}>Продолжить</Button>
            <Button variant="quiet" className="px-4" onClick={() => finish()}>Завершить</Button>
          </>
        ) : (
          <>
            <Button variant="quiet" className="px-4" onClick={() => up((d) => A.pauseWorkout(d))}>Пауза</Button>
            <Button className="flex-1" onClick={() => finish()}>Завершить</Button>
          </>
        )}
      </div>

      {askFinish && (
        <Sheet title="Завершить тренировку?" onClose={() => setAskFinish(false)}>
          <p className="mb-4 text-xs text-neutral-400">
            Не отмечено {unticked} {plural(unticked, "подход", "подхода", "подходов")} — они не сохранятся. Отмеченные останутся в истории.
          </p>
          <Button block onClick={() => finish()} className="mb-2">Завершить</Button>
          <Button variant="secondary" block onClick={() => finish(true)} className="mb-1">Плохой день, не в зачёт</Button>
          <p className="mb-3 text-xs text-neutral-500">Тренировка будет в истории и в счёте тренировок, но не в графиках, рекордах и «прошлом разе».</p>
          <Button variant="quiet" block onClick={() => setAskFinish(false)}>Продолжить тренировку</Button>
        </Sheet>
      )}
      {askUpdate && (
        <Sheet title="Обновить программу?" onClose={() => setAskUpdate(false)}>
          <p className="mb-4 text-xs text-neutral-400">
            Состав или подходы отличаются от «{progTitle(program)}». Можно записать в программу то, как ты тренировался сегодня.
          </p>
          <Button block onClick={() => doFinish(true)} className="mb-2">Обновить программу</Button>
          <Button variant="quiet" block onClick={() => doFinish(false)}>Оставить программу как была</Button>
        </Sheet>
      )}
      {/* shown by itself on the first workout, later from «?» */}
      {(help || !data.settings.gestureHintSeen) && (
        <WorkoutHelp rirOn={cols.includes("rir")}
          onClose={() => { setHelp(false); if (!data.settings.gestureHintSeen) up((d) => { d.settings.gestureHintSeen = true; }); }} />
      )}

      {undo.toast}

      {picker && <Picker data={data} up={up} onPick={pick} onClose={() => setPicker(null)}
        onPickMany={picker.replace !== undefined ? undefined : pickMany}
        group={picker.group} title={picker.replace !== undefined ? "Заменить упражнение" : picker.group ? "Добавить кардио" : undefined} />}
    </div>
  );
}
