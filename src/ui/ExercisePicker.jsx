// Picking exercises, the same for strength and stretching: search in both languages, group chips, "твои" on top,
// rows with the picture and both names, "уже в программе", one tap (single) or several then «Добавить (N)», and
// creating a new one (the section supplies its own form). The list itself comes from model/picker.js.
import { useState } from "react";
import { X, Check, Search } from "lucide-react";
import { CLOSEST, exactName, pickerSections } from "../model/picker.js";
import { Button, Chip, ExImg, Header, useApp } from "./kit.jsx";
import { useBackCloses, useRestorable } from "./navigation.js";

// items: exercises / stretches; groups, groupOf(e): the sections (and the chips, unless filters are given);
// filters: rows of chips [{ id, chips: [[value, label]], fits(e, value) }], the first with «все», the others tapped
// again to clear; start: { [filter id]: the chip chosen at the start }; usage: model/picker usageOf;
// already: ids in the program; tags(e, inMine): small words on the right; onPick(e) for one, onPickMany(list) for
// several (the picker stays open); action: the button's word; newLabel: «+ Новое упражнение»;
// createForm({ name, cancel, done(ex) }): the section's form for a new one
export function ExercisePicker({ title, items, groups, groupOf, filters: rows, start = {}, usage, already = [], tags, onPick, onPickMany, onClose,
  action = "Добавить", newLabel, createForm }) {
  const { nm1, nm2 } = useApp();
  useBackCloses(onClose); // the system back closes the picker, not the screen under it
  const multi = !!onPickMany;
  const [q, setQ] = useRestorable("picker-query", "");
  const allGroups = [...groups, ...new Set(items.map(groupOf).filter((g) => !groups.includes(g)))];
  const filters = rows || [{ id: "group", chips: allGroups.map((g) => [g, g]), fits: (e, g) => groupOf(e) === g }];
  const [chips, setChips] = useRestorable("picker-filters", start); // { [filter id]: value }
  const keep = (e) => filters.every((f) => !chips[f.id] || f.fits(e, chips[f.id]));
  const pickChip = (id, v) => setChips((c) => ({ ...c, [id]: c[id] === v ? "" : v }));
  const [creating, setCreating] = useState(null); // the name a new one starts with
  const [chosenIds, setChosenIds] = useRestorable("picker-chosen", []); // ids: kept if the app is closed meanwhile
  const chosen = chosenIds.map((id) => items.find((e) => e.id === id)).filter(Boolean);
  const isChosen = (e) => chosenIds.includes(e.id);
  const setChosen = (fn) => setChosenIds(fn(chosen).map((e) => e.id));
  const tap = (e) => (multi ? setChosen((c) => (isChosen(e) ? c.filter((x) => x.id !== e.id) : [...c, e])) : onPick(e));
  const sections = pickerSections(items, { query: q, keep, groupOf, groups, usage, nameOf: nm1 });
  const startCreate = () => { setCreating(q.trim()); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const created = (e) => { setCreating(null); setQ(""); if (multi) setChosen((c) => [...c, e]); else onPick(e); };

  return (
    <div data-testid="picker" className="fixed inset-0 z-50 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto max-w-md p-4 pb-32">
        <Header title={title} right={<button onClick={onClose} className="p-2 text-neutral-400" aria-label="Закрыть"><X size={22} /></button>} />
        <div className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3">
          <Search size={18} className="text-neutral-500" />
          <input autoFocus={!multi} value={q} onChange={(e) => { setQ(e.target.value); setCreating(null); }} placeholder="Поиск по-русски или по-английски"
            className="flex-1 bg-transparent py-3 outline-hidden placeholder:text-neutral-500" />
          {q && <button onClick={() => setQ("")} className="-mr-2 p-2 text-neutral-400" aria-label="Очистить поиск"><X size={20} /></button>}
        </div>

        {creating != null ? createForm({ name: creating, cancel: () => setCreating(null), done: created })
          : <Button variant="dashed" block size="sm" onClick={startCreate} className="mt-2">{newLabel}</Button>}

        {filters.map((f, i) => (
          <div key={f.id} className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1" data-testid={`filter-${f.id}`}>
            {i === 0 && <Chip on={!chips[f.id]} onClick={() => setChips((c) => ({ ...c, [f.id]: "" }))}>все</Chip>}
            {f.chips.map(([v, l]) => <Chip key={v} secondary={i > 0} on={chips[f.id] === v} onClick={() => pickChip(f.id, v)}>{l}</Chip>)}
          </div>
        ))}

        {sections.length === 0 && <p className="mt-4 text-neutral-400">Ничего не нашлось.</p>}
        {sections.map(([g, list]) => (
          <div key={g} className="mt-4">
            <div className={`mb-1 px-1 text-xs ${g === "твои" ? "font-semibold text-accent-400" : "text-neutral-500"}`}>{{ твои: "Твои", [CLOSEST]: "Точно такого нет, ближе всего:" }[g] || g}</div>
            <div className="divide-y divide-neutral-800 rounded-xl bg-neutral-900">
              {list.map((e) => (
                <button key={e.id} onClick={() => tap(e)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left active:bg-neutral-800 ${isChosen(e) ? "bg-neutral-800" : ""}`}>
                  <ExImg ex={e} />
                  <span className="min-w-0 flex-1">
                    <span className="block">{nm1(e)}</span>
                    {nm2(e) && <span className="block text-xs text-neutral-500">{nm2(e)}</span>}
                  </span>
                  {already.includes(e.id) && <span className="text-[11px] text-accent-300">уже в программе</span>}
                  {(tags ? tags(e, g === "твои") : []).map((t) => <span key={t} className="ml-1 text-[11px] text-neutral-500">{t}</span>)}
                  {multi && (
                    <span className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isChosen(e) ? "bg-accent-400 text-black" : "border border-neutral-700"}`}>
                      {isChosen(e) && <Check size={14} />}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {q.trim() && !exactName(items, q) && creating == null && (
          <Button variant="dashed" block onClick={startCreate} className="mt-4">+ Создать «{q.trim()}»</Button>
        )}
      </div>
      {multi && chosen.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 bg-black/90 px-4 pt-3">
          <div className="mx-auto max-w-md pb-3">
            <Button block onClick={() => onPickMany(chosen)}>{action} ({chosen.length})</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// the frame of a section's "new exercise" form: its fields, then «Отмена» / «Создать»
export function CreateForm({ children, canCreate, cancel, create }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-neutral-700 p-3">
      {children}
      <div className="flex gap-2">
        <Button variant="quiet" size="sm" onClick={cancel}>Отмена</Button>
        <Button size="sm" className="flex-1" disabled={!canCreate} onClick={create}>Создать</Button>
      </div>
    </div>
  );
}

export const NameInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="mb-2 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400" />
);
