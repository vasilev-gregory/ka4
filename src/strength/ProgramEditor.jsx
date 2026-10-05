// Strength program editor: name, exercises with how many sets to prefill, start, delete. Saved as you go.
import { useState } from "react";
import { X, RefreshCw, GripVertical } from "lucide-react";
import { startWorkout } from "../model/workoutActions.js";
import { defaultSets } from "../model/workout.js";
import { Picker } from "./ExerciseList.jsx";
import { Button, DeleteButton, ExImg, Header, Stepper, useApp, useUndo } from "../ui/kit.jsx";
import { moveItem, useSortable } from "../ui/sortable.js";

export function ProgramEditor({ data, up, exMap, id, back, goWorkout }) {
  const { nm1, nm2 } = useApp();
  const [picker, setPicker] = useState(false);
  const undo = useUndo();
  const change = (fn) => up((d) => { const p = d.programs.find((x) => x.id === id); if (p) fn(p); });
  const sort = useSortable((from, to) => change((p) => moveItem(p.items, from, to)));
  const p = data.programs.find((x) => x.id === id);
  if (!p) return <div className="p-4"><Header title="Программа удалена" back={back} /></div>;

  const remove = (i) => {
    const item = p.items[i];
    change((pp) => { pp.items.splice(i, 1); });
    undo.offer("Упражнение убрано", () => change((pp) => { pp.items.splice(Math.min(i, pp.items.length), 0, item); }));
  };
  const pick = (ex) => {
    const rep = picker.replace;
    change((pp) => {
      if (rep !== undefined) { if (pp.items[rep]) pp.items[rep].exerciseId = ex.id; }
      else pp.items.push({ exerciseId: ex.id, sets: defaultSets(ex) });
    });
    setPicker(false);
  };

  return (
    <div className="p-4 pb-28">
      <Header title="Программа" back={back} />
      <input value={p.name} placeholder="Название программы" autoFocus={!p.name}
        onChange={(e) => { const name = e.target.value; change((pp) => { pp.name = name; }); }}
        className="mb-4 w-full rounded-xl bg-neutral-900 px-3 py-3 text-base font-semibold outline-hidden focus:ring-2 focus:ring-accent-400" />
      <div className="space-y-2">
        {p.items.map((it, i) => (
          <div key={i + it.exerciseId} ref={sort.itemRef(i)} style={sort.itemStyle(i)}
            className={`flex items-center gap-1 rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
            <button {...sort.handleProps(i, p.items.length)} className="cursor-grab p-1 text-neutral-500" aria-label="Перетащить">
              <GripVertical size={18} />
            </button>
            <ExImg ex={exMap[it.exerciseId]} size={34} />
            <div className="ml-2 min-w-0 flex-1">
              <div className="truncate">{nm1(exMap[it.exerciseId]) || "Удалённое упражнение"}</div>
              {nm2(exMap[it.exerciseId]) && <div className="truncate text-xs text-neutral-500">{nm2(exMap[it.exerciseId])}</div>}
            </div>
            <Stepper compact value={it.sets} onChange={(v) => change((pp) => { pp.items[i].sets = v; })} />
            <button onClick={() => setPicker({ replace: i })} className="p-1 text-neutral-500" aria-label="Заменить"><RefreshCw size={16} /></button>
            <button onClick={() => remove(i)} className="p-1 text-neutral-500" aria-label="Убрать"><X size={18} /></button>
          </div>
        ))}
      </div>
      <Button variant="dashed" block onClick={() => setPicker(true)} className="mt-2">Добавить упражнение</Button>
      <p className="mt-2 text-xs text-neutral-500">Число справа — сколько подходов подставить при старте. Изменения сохраняются сразу.</p>

      <Button block disabled={!!data.active || !p.items.length} className="mt-6"
        onClick={() => { up((d) => startWorkout(d, p)); goWorkout(); }}>
        {data.active ? "Уже идёт тренировка" : "Начать тренировку"}
      </Button>
      <DeleteButton onConfirm={() => { up((d) => { d.programs = d.programs.filter((x) => x.id !== id); }); back(); }} confirmText="Удалить программу?">
        Удалить программу
      </DeleteButton>

      {undo.toast}
      {picker && (
        <Picker data={data} up={up} onClose={() => setPicker(false)} onPick={pick}
          title={picker.replace !== undefined ? "Заменить упражнение" : undefined}
          onPickMany={picker.replace !== undefined ? undefined : (list) => {
            change((pp) => { list.forEach((ex) => pp.items.push({ exerciseId: ex.id, sets: defaultSets(ex) })); });
            setPicker(false);
          }} />
      )}
    </div>
  );
}
