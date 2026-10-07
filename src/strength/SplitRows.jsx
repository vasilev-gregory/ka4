// The splits under the programs: a row per split (a tap opens it; the active one says so) and «+ Новый сплит».
import { plural, progTitle } from "../core/util.js";
import { Button } from "../ui/kit.jsx";

export function SplitRows({ splits, activeId, onOpen, onCreate }) {
  return (
    <div className="mt-6">
      <h2 className="mb-1 font-semibold">Сплиты</h2>
      <p className="mb-2 text-xs text-neutral-500">Программы на неделю: активный сплит подсказывает, какая тренировка следующая.</p>
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
