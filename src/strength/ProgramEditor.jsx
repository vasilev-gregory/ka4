// Strength program editor: edits a draft, explicit save.
import { useState } from "react";
import { X, RefreshCw, GripVertical } from "lucide-react";
import { startWorkout } from "../model/workout.js";
import { Picker } from "./ExerciseList.jsx";
import { ConfirmButton, ExImg, Header, Stepper, useApp } from "../ui/kit.jsx";
import { moveItem, useSortable } from "../ui/sortable.js";

export function ProgramEditor({ data, up, exMap, id, back, goWorkout }) {
  const { nm1, nm2 } = useApp();
  const saved = data.programs.find((x) => x.id === id);
  const [draft, setDraft] = useState(() => (saved ? structuredClone(saved) : null));
  const [picker, setPicker] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const mut = (fn) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });
  const sort = useSortable((from, to) => mut((pp) => { moveItem(pp.items, from, to); }));
  if (!saved || !draft) return <div className="p-4"><Header title="Программа удалена" back={back} /></div>;

  const p = draft;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = () => up((d) => { const i = d.programs.findIndex((x) => x.id === id); if (i >= 0) d.programs[i] = structuredClone(draft); });
  const tryBack = () => (dirty ? setLeaveAsk(true) : back());

  return (
    <div className="p-4 pb-44">
      <Header title="Программа" back={tryBack} />
      <input value={p.name} onChange={(e) => mut((pp) => { pp.name = e.target.value; })}
        className="mb-4 w-full rounded-xl bg-neutral-900 px-3 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-amber-400" />
      <div className="space-y-2">
        {p.items.map((it, i) => (
          <div key={i + it.exerciseId} ref={(el) => { sort.refs.current[i] = el; }} style={sort.itemStyle(i)}
            className={`flex items-center gap-1 rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
            <button {...sort.handleProps(i, p.items.length)} className="cursor-grab p-1 text-neutral-500" aria-label="Перетащить">
              <GripVertical size={18} />
            </button>
            <ExImg ex={exMap[it.exerciseId]} size={34} />
            <div className="ml-2 min-w-0 flex-1">
              <div className="truncate">{nm1(exMap[it.exerciseId]) || "Удалённое упражнение"}</div>
              {nm2(exMap[it.exerciseId]) && <div className="truncate text-xs text-neutral-500">{nm2(exMap[it.exerciseId])}</div>}
            </div>
            <Stepper compact value={it.sets} onChange={(v) => mut((pp) => { pp.items[i].sets = v; })} />
            <button onClick={() => setPicker({ replace: i })} className="p-1 text-neutral-500" aria-label="Заменить"><RefreshCw size={16} /></button>
            <button onClick={() => mut((pp) => { pp.items.splice(i, 1); })} className="p-1 text-neutral-500" aria-label="Убрать"><X size={18} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setPicker(true)} className="mt-2 w-full rounded-xl border border-dashed border-neutral-700 py-3 text-neutral-300">
        Добавить упражнение
      </button>
      <p className="mt-2 text-xs text-neutral-500">Число справа — сколько подходов подставить при старте.</p>

      <button
        disabled={!!data.active}
        onClick={() => { if (dirty) save(); startWorkout(up, draft); goWorkout(); }}
        className="mt-6 w-full rounded-xl bg-neutral-800 py-3 font-semibold disabled:opacity-40">
        {data.active ? "Уже идёт тренировка" : dirty ? "Сохранить и начать тренировку" : "Начать тренировку"}
      </button>
      <ConfirmButton onConfirm={() => { up((d) => { d.programs = d.programs.filter((x) => x.id !== id); }); back(); }}
        confirmText="Удалить программу?" className="mt-3 w-full py-3 text-neutral-500" armedClassName="mt-3 w-full rounded-xl bg-red-600 py-3 text-white">
        Удалить программу
      </ConfirmButton>

      {(dirty || leaveAsk) && (
        <div className="above-nav fixed inset-x-0 z-40 px-3">
          <div className="mx-auto max-w-md rounded-2xl bg-neutral-900 p-3 shadow-lg">
            {leaveAsk && <p className="mb-2 text-xs text-neutral-300">Есть несохранённые изменения</p>}
            <div className="flex gap-2">
              <button onClick={() => { setDraft(structuredClone(saved)); setLeaveAsk(false); if (leaveAsk) back(); }}
                className="rounded-xl bg-neutral-800 px-4 py-3 text-neutral-300">
                {leaveAsk ? "Не сохранять" : "Отменить"}
              </button>
              <button onClick={() => { save(); if (leaveAsk) back(); setLeaveAsk(false); }}
                className="flex-1 rounded-xl bg-amber-400 py-3 font-semibold text-black">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <Picker data={data} up={up} onClose={() => setPicker(false)}
          title={picker.replace !== undefined ? "Заменить упражнение" : undefined}
          onPickMany={picker.replace !== undefined ? undefined : (list) => { mut((pp) => { list.forEach((ex) => pp.items.push({ exerciseId: ex.id, sets: 3 })); }); setPicker(false); }}
          onPick={(ex) => {
            const rep = picker.replace;
            mut((pp) => {
              if (rep !== undefined) { if (pp.items[rep]) pp.items[rep].exerciseId = ex.id; }
              else pp.items.push({ exerciseId: ex.id, sets: 3 });
            });
            setPicker(false);
          }} />
      )}
    </div>
  );
}
