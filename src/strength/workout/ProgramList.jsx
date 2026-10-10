// No workout running: the programs to start from (shared rows, ui/ProgramRows) — the active split's first, in its
// order, marked with what this week did and which is next (model/splits) — the splits, and yesterday's auto-closed
// workout asking to update its program. A hold on programs picks them to make a split of, add to one, or delete.
// During a workout (reached by «‹» in it) programs open and edit as usual, the running one is marked «идёт» and its ▶
// goes back to the workout (onReturn), nothing else starts.
import { useState } from "react";
import { RUNNING_NOTE, runningSession } from "../../model/workout.js";
import { activeSplit, splitMarks } from "../../model/splits.js";
import { fmtDate, fmtWeekday, plural, progTitle, uid } from "../../core/util.js";
import { createProgram, removePrograms, restorePrograms } from "../../model/programActions.js";
import { resolvePendingProgramUpdate, startWorkout } from "../../model/workoutActions.js";
import { addSplitPrograms, createSplit } from "../../model/splitActions.js";
import { Button, Card, Header, useApp, useUndo } from "../../ui/kit.jsx";
import { ProgramRows } from "../../ui/ProgramRows.jsx";
import { PickedBar, SplitRows } from "../SplitRows.jsx";

// a split program's line: «✓ пн» per workout this week, «следующая» on the one to do now
function splitNote(m) {
  if (!m) return null;
  const done = m.done.map((w) => `✓ ${fmtWeekday(w.startedAt)}`).join(", ");
  const left = m.times - m.done.length;
  return [done, m.next ? "следующая по сплиту" : left > 0 && m.times > 1 && `ещё ${left}`].filter(Boolean).join(" · ") || null;
}

export function ProgramList({ data, up, exMap, open, onReturn }) {
  const { nm1 } = useApp();
  const last = data.workouts[data.workouts.length - 1];
  const pending = data.pendingProgramUpdate;
  const pendingProgram = pending && data.programs.find((x) => x.id === pending.programId);
  const split = activeSplit(data);
  const sm = split && split.items.length ? splitMarks(split, data.workouts) : null;
  const ordered = sm ? [...sm.order.map((id) => data.programs.find((p) => p.id === id)).filter(Boolean), ...data.programs.filter((p) => !sm.marks[p.id])]
    : data.programs;
  const create = () => {
    const id = uid();
    up((d) => createProgram(d, id));
    open({ type: "program", id });
  };
  const [picked, setPicked] = useState([]); // program ids picked by a hold
  const toggle = (id) => setPicked((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  const pickedInOrder = () => ordered.map((p) => p.id).filter((id) => picked.includes(id));
  const newSplit = (programIds = []) => {
    const id = uid();
    up((d) => createSplit(d, id, programIds));
    setPicked([]);
    open({ type: "split", id });
  };
  const undo = useUndo();
  const removePicked = () => {
    const was = { programs: structuredClone(data.programs), splits: structuredClone(data.splits) };
    const n = picked.length;
    up((d) => removePrograms(d, picked));
    setPicked([]);
    undo.offer(`${n} ${plural(n, "программа удалена", "программы удалены", "программ удалено")}`, () => up((d) => restorePrograms(d, was)));
  };
  const addTo = (splitId) => {
    const ids = pickedInOrder();
    up((d) => addSplitPrograms(d.splits.find((s) => s.id === splitId), ids));
    setPicked([]);
    open({ type: "split", id: splitId });
  };
  const start = (p) => up((d) => startWorkout(d, p));
  const a = data.active;
  const running = a ? a.programId || "" : null; // "": a workout without a program — nothing to mark, nothing starts
  return (
    <div className="p-4">
      <Header title="Силовая тренировка" />
      {last && <p className="mb-3 text-xs text-neutral-400">Прошлая: {last.name}, {fmtDate(last.startedAt)}</p>}
      {pendingProgram && (
        <Card className="mb-3">
          <div className="font-semibold">Вчерашняя тренировка завершена</div>
          <p className="mb-3 text-xs text-neutral-400">Она отличалась от «{progTitle(pendingProgram)}». Записать изменения в программу?</p>
          <div className="flex gap-2">
            <Button variant="quiet" size="sm" onClick={() => up((d) => resolvePendingProgramUpdate(d, false))}>Нет</Button>
            <Button size="sm" className="flex-1" onClick={() => up((d) => resolvePendingProgramUpdate(d, true))}>Обновить программу</Button>
          </div>
        </Card>
      )}
      <ProgramRows onOpen={(id) => open({ type: "program", id })} onCreate={create} onWithout={() => start(null)}
        blocked={runningSession(data) === "stretch" ? RUNNING_NOTE.stretch : null}
        running={running} onStart={(id) => (a ? onReturn() : start(data.programs.find((x) => x.id === id)))} select={{ ids: picked, toggle }}
        group={sm && { ids: sm.order, onTitle: () => open({ type: "split", id: split.id }),
          title: `Сплит «${progTitle(split)}» · ${sm.doneCount === sm.total ? "неделя закрыта ✓" : `${sm.doneCount} из ${sm.total} на этой неделе`}` }}
        programs={ordered.map((p) => ({
          id: p.id, name: p.name, canStart: p.items.length > 0, note: sm && splitNote(sm.marks[p.id]), next: !!sm?.marks[p.id]?.next,
          meta: p.items.map((i) => nm1(exMap[i.exerciseId])).filter(Boolean).join(", ") || "Пока без упражнений",
        }))} />
      {undo.toast}
      <SplitRows splits={data.splits} activeId={data.activeSplitId} onOpen={(id) => open({ type: "split", id })} onCreate={() => newSplit()} />
      {picked.length > 0 && (
        <>
          <div className="h-28" /> {/* room to scroll the list above the bar */}
          <PickedBar n={picked.length} splits={data.splits} onNew={() => newSplit(pickedInOrder())} onAdd={addTo} onDelete={removePicked} onCancel={() => setPicked([])} />
        </>
      )}
    </div>
  );
}
