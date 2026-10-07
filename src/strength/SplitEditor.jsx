// A split: its name, its programs for the week (shared program parts, ui/ProgramEdit: drag to reorder, ✕ with
// «Вернуть»; a tap opens the program), whether it is the active one, and the muscles of its whole week — a muscle
// short of load leads to exercises for it, and the one picked goes into the program chosen next.
import { useState } from "react";
import { fmtNum, plural, progTitle } from "../core/util.js";
import { splitPrograms } from "../model/splits.js";
import { addSplitPrograms, dropEmptySplit, removeSplit, setActiveSplit } from "../model/splitActions.js";
import { addProgramItems } from "../model/workoutActions.js";
import { Picker } from "./ExerciseList.jsx";
import { Button, DeleteButton, Header, Sheet, SwitchRow, useApp } from "../ui/kit.jsx";
import { ProgramItems, ProgramName, useDropIfEmpty } from "../ui/ProgramEdit.jsx";
import { ProgramMuscles } from "./ProgramMuscles.jsx";

export function SplitEditor({ data, up, exMap, id, back, open }) {
  const { nm1 } = useApp();
  const [adding, setAdding] = useState(false);
  const [finding, setFinding] = useState(null); // { muscle, ex? }: exercises for a muscle, then the program to put one in
  const change = (fn) => up((d) => { const s = d.splits.find((x) => x.id === id); if (s) fn(s); });
  useDropIfEmpty(() => up((d) => dropEmptySplit(d, id)));
  const s = data.splits.find((x) => x.id === id);
  if (!s) return <div className="p-4"><Header title="Сплит удалён" back={back} /></div>;
  const progOf = (pid) => data.programs.find((p) => p.id === pid);
  const n = s.items.length;

  return (
    <div className="p-4 pb-28">
      <Header title="Сплит" back={back} />
      <ProgramName value={s.name} placeholder="Название сплита" onChange={(name) => change((x) => { x.name = name; })} />
      <ProgramItems items={s.items} change={change} removed="Тренировка убрана" row={(it) => {
        const p = progOf(it.programId);
        return {
          body: (
            <button onClick={() => p && open({ type: "program", id: p.id })} className="ml-1 min-w-0 flex-1 py-1 text-left">
              <div className="font-semibold">{progTitle(p, "Удалённая программа")}</div>
              {p && <div className="truncate text-xs text-neutral-400">{p.items.map((i) => nm1(exMap[i.exerciseId])).filter(Boolean).join(", ") || "Пока без упражнений"}</div>}
            </button>
          ),
        };
      }} />
      <Button variant="dashed" block onClick={() => setAdding(true)} className="mt-2">Добавить тренировку</Button>
      <p className="mt-2 text-xs text-neutral-500">
        {n ? `${n} ${plural(n, "тренировка", "тренировки", "тренировок")} в неделю. ` : ""}Порядок — в каком делать; одну программу можно поставить дважды.
      </p>
      <SwitchRow className="mt-4" title="Активный сплит" on={data.activeSplitId === id} onClick={() => up((d) => setActiveSplit(d, data.activeSplitId === id ? null : id))}
        hint="Вкладка «Тренировка» показывает его программы первыми и подсказывает следующую" />
      <ProgramMuscles programs={splitPrograms(s, data.programs)} week exMap={exMap} open={open} find={(m) => setFinding({ muscle: m })} />
      <DeleteButton onConfirm={() => { up((d) => removeSplit(d, id)); back(); }} confirmText="Удалить сплит? Программы останутся">Удалить сплит</DeleteButton>
      {finding && !finding.ex && (
        <Picker data={data} up={up} muscle={finding.muscle} title="Подобрать упражнение" onClose={() => setFinding(null)}
          onPick={(ex) => setFinding({ ...finding, ex })} />
      )}
      {finding && finding.ex && (
        <Sheet title={`«${nm1(finding.ex)}» — в какую тренировку?`} onClose={() => setFinding(null)}>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {splitPrograms(s, data.programs).filter((p, i, all) => all.indexOf(p) === i).map((p) => ( // each program once
              <button key={p.id} onClick={() => { up((d) => addProgramItems(d.programs.find((x) => x.id === p.id), [finding.ex])); setFinding(null); }}
                className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-left font-semibold active:bg-neutral-700">{progTitle(p)}</button>
            ))}
          </div>
        </Sheet>
      )}
      {adding && (
        <Sheet title="Добавить тренировку" onClose={() => setAdding(false)}>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {data.programs.map((p) => {
              const times = s.items.filter((it) => it.programId === p.id).length;
              return (
                <button key={p.id} onClick={() => { change((x) => addSplitPrograms(x, [p.id])); setAdding(false); }}
                  className="flex w-full items-center gap-2 rounded-xl bg-neutral-800 px-4 py-3 text-left active:bg-neutral-700">
                  <span className="min-w-0 flex-1 font-semibold">{progTitle(p)}</span>
                  {times > 0 && <span className="text-[11px] text-accent-300">уже в сплите{times > 1 ? ` ×${fmtNum(times)}` : ""}</span>}
                </button>
              );
            })}
            {data.programs.length === 0 && <p className="text-xs text-neutral-400">Программ пока нет — создай на вкладке «Тренировка» или из тренировки в истории.</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}

