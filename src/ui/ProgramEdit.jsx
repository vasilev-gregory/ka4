// The parts of a program editor shared by strength and stretching: the name, the list of its items (hold the handle
// and drag to reorder, ✕ removes with «Вернуть»), and the start / delete buttons. What a row shows is up to the
// section; changes are saved as you go.
import { useEffect, useEffectEvent } from "react";
import { GripVertical, X } from "lucide-react";
import { moveItem, useSortable } from "./sortable.js";
import { Button, DeleteButton, useUndo } from "./kit.jsx";

export function ProgramName({ value, onChange }) {
  return (
    <input value={value} placeholder="Название программы" autoFocus={!value} onChange={(e) => onChange(e.target.value)}
      className="mb-4 w-full rounded-xl bg-neutral-900 px-3 py-3 text-base font-semibold outline-hidden focus:ring-2 focus:ring-accent-400" />
  );
}

// items: the program's items; change(fn): edits the program (fn gets its draft); what: the undo toast's word
// ("Упражнение убрано"); row(it, i) -> { body, tail, below }: the row's middle, its controls before ✕, and what
// opens under it
export function ProgramItems({ items, change, removed, row }) {
  const undo = useUndo();
  const sort = useSortable((from, to) => change((p) => moveItem(p.items, from, to)));
  const remove = (i) => {
    const item = items[i];
    change((p) => { p.items.splice(i, 1); });
    undo.offer(removed, () => change((p) => { p.items.splice(Math.min(i, p.items.length), 0, item); }));
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const { body, tail, below } = row(it, i);
        return (
          <div key={i + it.exerciseId} ref={sort.itemRef(i)} style={sort.itemStyle(i)}
            className={`rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
            <div className="flex items-center gap-0.5">
              <button {...sort.handleProps(i, items.length)} className="cursor-grab p-2 text-neutral-500" aria-label="Перетащить">
                <GripVertical size={18} />
              </button>
              {body}
              {tail}
              <button onClick={() => remove(i)} className="p-2 text-neutral-500" aria-label="Убрать"><X size={18} /></button>
            </div>
            {below}
          </div>
        );
      })}
      {undo.toast}
    </div>
  );
}

// start (its label says why it can't, e.g. a run going on) and delete the program
export function ProgramFooter({ startLabel, canStart, onStart, onDelete }) {
  return (
    <>
      <Button block disabled={!canStart} onClick={onStart} className="mt-6">{startLabel}</Button>
      <DeleteButton onConfirm={onDelete} confirmText="Удалить программу?">Удалить программу</DeleteButton>
    </>
  );
}

// leaving the editor of a program that stayed empty and unnamed: drop(), so no «Без названия» is left behind
export function useDropIfEmpty(drop) {
  const run = useEffectEvent(drop);
  useEffect(() => () => run(), []);
}
