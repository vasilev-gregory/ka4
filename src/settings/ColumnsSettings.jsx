// Which set columns are shown and in what order (weight and reps are always on).
import { GripVertical } from "lucide-react";
import { COLUMNS } from "../model/catalog.js";
import { columnConfig } from "../model/workout.js";
import { Pill } from "../ui/kit.jsx";
import { moveItem, useSortable } from "../ui/sortable.js";

export function ColumnsSettings({ settings, up }) {
  const cfg = columnConfig(settings);
  const change = (fn) => up((d) => { const c = columnConfig(d.settings); fn(c); d.settings.columns = c; });
  const sort = useSortable((from, to) => change((c) => moveItem(c, from, to)));
  const toggle = (key) => change((c) => { const it = c.find((x) => x.key === key); it.on = !it.on; });
  return (
    <div className="mb-6">
      <h2 className="mb-1 font-semibold">Колонки подхода</h2>
      <p className="mb-2 text-xs text-neutral-500">Перетаскивай за ⋮⋮, чтобы поменять порядок. Вес и повторы выключить нельзя.</p>
      <div className="space-y-1.5">
        {cfg.map((c, i) => {
          const fixed = c.key === "w" || c.key === "r";
          return (
            <div key={c.key} ref={sort.itemRef(i)} style={sort.itemStyle(i)}
              className={`flex items-center gap-2 rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
              <button {...sort.handleProps(i, cfg.length)} className="cursor-grab p-1 text-neutral-500" aria-label="Перетащить"><GripVertical size={18} /></button>
              <span className={`flex-1 ${c.on || fixed ? "" : "text-neutral-500"}`}>{COLUMNS[c.key]}</span>
              {fixed ? <span className="px-3 text-xs text-neutral-600">всегда</span> : (
                <button onClick={() => toggle(c.key)}><Pill on={c.on} /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
