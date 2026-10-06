// Strength program editor on the shared parts (ui/ProgramEdit): exercises with how many sets to prefill (cardio: a
// plan), replace, the muscles they plan for, start, delete. Saved as you go.
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { addProgramItems, removeProgram, replaceProgramItem, startWorkout } from "../model/workoutActions.js";
import { CARDIO_PLAN } from "../model/workout.js";
import { fmtNum } from "../core/util.js";
import { Picker } from "./ExerciseList.jsx";
import { ProgramMuscles } from "./ProgramMuscles.jsx";
import { Button, ExImg, Header, SecStepper, Stepper, useApp } from "../ui/kit.jsx";
import { ProgramFooter, ProgramItems, ProgramName } from "../ui/ProgramEdit.jsx";

export function ProgramEditor({ data, up, exMap, id, back, goWorkout, open }) {
  const { nm1, nm2 } = useApp();
  const [picker, setPicker] = useState(false);
  const change = (fn) => up((d) => { const p = d.programs.find((x) => x.id === id); if (p) fn(p); });
  const p = data.programs.find((x) => x.id === id);
  if (!p) return <div className="p-4"><Header title="Программа удалена" back={back} /></div>;

  const pick = (ex) => {
    const rep = picker.replace;
    change((pp) => (rep !== undefined ? replaceProgramItem(pp, rep, ex, exMap) : addProgramItems(pp, [ex])));
    setPicker(false);
  };

  return (
    <div className="p-4 pb-28">
      <Header title="Программа" back={back} />
      <ProgramName value={p.name} onChange={(name) => change((pp) => { pp.name = name; })} />
      <ProgramItems items={p.items} change={change} removed="Упражнение убрано" row={(it, i) => ({
        body: <>
          <ExImg ex={exMap[it.exerciseId]} size={34} />
          <button onClick={() => exMap[it.exerciseId] && open({ type: "exercise", id: it.exerciseId })} className="ml-2 min-w-0 flex-1 text-left">
            <div className="truncate">{nm1(exMap[it.exerciseId]) || "Удалённое упражнение"}</div>
            {nm2(exMap[it.exerciseId]) && <div className="truncate text-xs text-neutral-500">{nm2(exMap[it.exerciseId])}</div>}
          </button>
        </>,
        tail: <>
          {exMap[it.exerciseId]?.kind === "cardio" ? <CardioPlan it={it} set={(plan) => change((pp) => { pp.items[i] = { ...pp.items[i], ...plan }; })} />
            : <Stepper compact value={it.sets} onChange={(v) => change((pp) => { pp.items[i].sets = v; })} />}
          <button onClick={() => setPicker({ replace: i })} className="p-1 text-neutral-500" aria-label="Заменить"><RefreshCw size={16} /></button>
        </>,
      })} />
      <Button variant="dashed" block onClick={() => setPicker(true)} className="mt-2">Добавить упражнение</Button>
      <p className="mt-2 text-xs text-neutral-500">Число справа — сколько подходов подставить при старте, у кардио — план в минутах или километрах (тап по единице). Изменения сохраняются сразу.</p>
      <ProgramMuscles program={p} exMap={exMap} open={open} />

      <ProgramFooter canStart={!data.active && p.items.length > 0} startLabel={data.active ? "Уже идёт тренировка" : "Начать тренировку"}
        onStart={() => { up((d) => startWorkout(d, p)); goWorkout(); }}
        onDelete={() => { up((d) => removeProgram(d, id)); back(); }} />

      {picker && (
        <Picker data={data} up={up} onClose={() => setPicker(false)} onPick={pick} already={p.items.map((x) => x.exerciseId)}
          title={picker.replace !== undefined ? "Заменить упражнение" : undefined}
          onPickMany={picker.replace !== undefined ? undefined : (list) => {
            change((pp) => addProgramItems(pp, list));
            setPicker(false);
          }} />
      )}
    </div>
  );
}

// a cardio line's plan: minutes or km; a tap on the unit switches
function CardioPlan({ it, set }) {
  const km = it.km != null;
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => set(km ? { km: undefined, min: CARDIO_PLAN.min } : { min: undefined, km: CARDIO_PLAN.km })}
        aria-label="Минуты или километры" className="rounded-md bg-neutral-800 px-1.5 py-1 text-[11px] text-neutral-400">{km ? "км" : "мин"}</button>
      {km ? <SecStepper value={it.km} min={0.5} step={0.5} unit="" fmt={fmtNum} onChange={(v) => set({ km: v })} />
        : <SecStepper value={it.min ?? CARDIO_PLAN.min} min={5} unit="" onChange={(v) => set({ min: v })} />}
    </div>
  );
}
