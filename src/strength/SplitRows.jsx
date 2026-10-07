// The splits under the programs: a row per split (a tap opens it; the active one says so) and «+ Новый сплит»; and
// the bar for programs picked by a hold: a new split of them, into an existing one, or delete them.
import { plural, progTitle } from "../core/util.js";
import { Button } from "../ui/kit.jsx";
import { useBackCloses } from "../ui/navigation.js";

export function SplitRows({ splits, activeId, onOpen, onCreate }) {
  return (
    <div className="mt-6">
      <h2 className="mb-1 font-semibold">Сплиты</h2>
      <p className="mb-2 text-xs text-neutral-500">
        Программы на неделю: активный сплит подсказывает, какая тренировка следующая. Удержи программу выше — собрать сплит из неё
        (и других) или добавить в готовый.
      </p>
      <div className="space-y-2">
        {splits.map((s) => (
          <button key={s.id} onClick={() => onOpen(s.id)} className="flex w-full items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-left active:bg-neutral-800">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{progTitle(s)}</span>
              <span className="block text-xs text-neutral-400">{s.items.length} {plural(s.items.length, "тренировка", "тренировки", "тренировок")} в неделю</span>
            </span>
            {s.id === activeId && <span className="rounded-md bg-accent-400 px-1.5 py-0.5 text-[11px] font-semibold text-black">активный</span>}
          </button>
        ))}
        <Button variant="dashed" block onClick={onCreate}>+ Новый сплит</Button>
      </div>
    </div>
  );
}

// n programs picked: «Новый сплит» of them, «В «…»» an existing split, «Удалить» them, «Отмена» (the system back too)
export function PickedBar({ n, splits, onNew, onAdd, onDelete, onCancel }) {
  useBackCloses(onCancel);
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-black px-4 pt-3" data-testid="picked-bar">
      <div className="mx-auto max-w-md pb-3">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
          <span>Выбрано: {n} — собрать в сплит</span>
          <span className="flex gap-3">
            <button onClick={onDelete} className="p-1 text-red-400">Удалить</button>
            <button onClick={onCancel} className="p-1 text-neutral-300">Отмена</button>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1" onClick={onNew}>Новый сплит</Button>
          {splits.map((s) => (
            <Button key={s.id} variant="secondary" className="flex-1" onClick={() => onAdd(s.id)}>В «{progTitle(s)}»</Button>
          ))}
        </div>
      </div>
    </div>
  );
}
