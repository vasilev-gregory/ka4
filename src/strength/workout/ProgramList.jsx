// No workout running: the programs to start from (shared rows, ui/ProgramRows), and yesterday's auto-closed
// workout asking to update its program.
import { fmtDate, progTitle, uid } from "../../core/util.js";
import { createProgram, resolvePendingProgramUpdate, startWorkout } from "../../model/workoutActions.js";
import { Button, Card, Header, useApp } from "../../ui/kit.jsx";
import { ProgramRows } from "../../ui/ProgramRows.jsx";

export function ProgramList({ data, up, exMap, open }) {
  const { nm1 } = useApp();
  const last = data.workouts[data.workouts.length - 1];
  const pending = data.pendingProgramUpdate;
  const pendingProgram = pending && data.programs.find((x) => x.id === pending.programId);
  const create = () => {
    const id = uid();
    up((d) => createProgram(d, id));
    open({ type: "program", id });
  };
  const start = (p) => up((d) => startWorkout(d, p));
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
        onStart={(id) => start(data.programs.find((x) => x.id === id))}
        programs={data.programs.map((p) => ({
          id: p.id, name: p.name, canStart: p.items.length > 0,
          meta: p.items.map((i) => nm1(exMap[i.exerciseId])).filter(Boolean).join(", ") || "Пока без упражнений",
        }))} />
    </div>
  );
}
