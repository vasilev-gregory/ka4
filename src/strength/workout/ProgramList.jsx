// No workout running: the programs to start from, and yesterday's auto-closed workout asking to update its program.
import { Play } from "lucide-react";
import { fmtDate, progTitle, uid } from "../../core/util.js";
import { resolvePendingProgramUpdate, startWorkout } from "../../model/workoutActions.js";
import { Button, Card, Header, useApp } from "../../ui/kit.jsx";

export function ProgramList({ data, up, exMap, open }) {
  const { nm1 } = useApp();
  const last = data.workouts[data.workouts.length - 1];
  const pending = data.pendingProgramUpdate;
  const pendingProgram = pending && data.programs.find((x) => x.id === pending.programId);
  const create = () => {
    const id = uid();
    up((d) => { d.programs.push({ id, name: "", items: [] }); });
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
      <div className="space-y-2">
        {data.programs.map((p) => (
          <div key={p.id} className="flex items-stretch gap-2 rounded-xl bg-neutral-900 p-2 pl-4">
            <button onClick={() => open({ type: "program", id: p.id })} className="min-w-0 flex-1 py-2 text-left">
              <div className="text-base font-semibold">{progTitle(p)}</div>
              <div className="mt-1 text-xs text-neutral-400">
                {p.items.map((i) => nm1(exMap[i.exerciseId])).filter(Boolean).join(", ") || "Пока без упражнений"}
              </div>
            </button>
            <button onClick={() => start(p)} aria-label="Начать" className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-black">
              <Play size={22} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="dashed" size="lg" className="flex-1" onClick={create}>+ Новая программа</Button>
          <Button variant="dashed" size="lg" className="flex-1" onClick={() => start(null)}>Без программы</Button>
        </div>
        <Button variant="dashed" size="lg" block onClick={() => start("cardio")}>Кардио</Button>
      </div>
    </div>
  );
}
