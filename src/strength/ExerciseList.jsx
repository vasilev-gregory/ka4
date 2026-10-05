// Exercise search/browse with "yours first", group filter, inline creation; Picker wraps it (single or multi select).
import { useState, useMemo } from "react";
import { X, Check, Search } from "lucide-react";
import { uid } from "../core/util.js";
import { GROUPS } from "../model/catalog.js";
import { Button, ExImg, Header, useApp } from "../ui/kit.jsx";

export function ExerciseList({ data, up, onSelect, autoFocus, selected }) {
  const { nm1, nm2 } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(""); // muscle group, "" = all
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRu, setNewRu] = useState("");
  const [grp, setGrp] = useState("спина");
  const [kind, setKind] = useState("reps");
  const ql = q.trim().toLowerCase();
  const words = ql.split(/\s+/).filter(Boolean);
  const allGroups = [...GROUPS, ...new Set(data.exercises.map((e) => e.group).filter((g) => !GROUPS.includes(g)))];
  // every typed word must appear in the English or Russian name: "dumb curl", "тяга одной"
  const filtered = data.exercises.filter((e) => {
    if (filter && e.group !== filter) return false;
    const hay = `${e.name} ${e.ru || ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  // "yours" first: exercises you've done (most often first) or have in a program
  const usage = useMemo(() => {
    const u = {};
    data.workouts.forEach((w) => w.exercises.forEach((e) => {
      const x = u[e.exerciseId] || (u[e.exerciseId] = { n: 0, last: 0 });
      x.n += 1; x.last = Math.max(x.last, w.startedAt);
    }));
    data.programs.forEach((p) => p.items.forEach((it) => { if (!u[it.exerciseId]) u[it.exerciseId] = { n: 0.5, last: 0 }; }));
    return u;
  }, [data.workouts, data.programs]);
  const mine = filtered.filter((e) => usage[e.id])
    .sort((x, y) => usage[y.id].n - usage[x.id].n || usage[y.id].last - usage[x.id].last || x.name.localeCompare(y.name));
  const rest = filtered.filter((e) => !usage[e.id]);
  const byGroup = [
    ...(mine.length ? [["твои", mine]] : []),
    ...allGroups.map((g) => [g, rest.filter((e) => e.group === g).sort((x, y) => x.name.localeCompare(y.name))]).filter(([, l]) => l.length),
  ];
  const exact = data.exercises.some((e) => e.name.toLowerCase() === ql || (e.ru || "").toLowerCase() === ql);

  const chip = (active) => `shrink-0 rounded-full px-3 py-1 text-xs ${active ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`;
  const startCreate = (name) => { setNewName(name); setNewRu(""); if (filter) setGrp(filter); setCreating(true); };
  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const ex = { id: uid(), name, ...(newRu.trim() ? { ru: newRu.trim() } : {}), group: grp, kind };
    up((d) => { d.exercises.push(ex); });
    setQ(""); setCreating(false);
    onSelect(ex);
  };
  const createForm = (
    <div className="mt-3 rounded-xl border border-dashed border-neutral-700 p-3">
      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название"
        className="mb-2 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400" />
      <input value={newRu} onChange={(e) => setNewRu(e.target.value)} placeholder="Второе название (необязательно)"
        className="mb-3 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400" />
      <div className="mb-2 text-xs text-neutral-400">Группа мышц</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {GROUPS.map((g) => <button key={g} onClick={() => setGrp(g)} className={chip(grp === g)}>{g}</button>)}
      </div>
      <div className="mb-3 flex gap-1.5">
        {[["reps", "вес и повторы"], ["time", "вес и время"]].map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1 text-xs ${kind === k ? "bg-neutral-100 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setCreating(false)} className="rounded-lg bg-neutral-800 px-4 py-2.5 text-neutral-300">Отмена</button>
        <button onClick={create} disabled={!newName.trim()} className="flex-1 rounded-lg bg-accent-400 py-2.5 font-semibold text-black disabled:opacity-40">Создать</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3">
        <Search size={18} className="text-neutral-500" />
        <input autoFocus={autoFocus} value={q} onChange={(e) => { setQ(e.target.value); setCreating(false); }}
          placeholder="Поиск по-русски или по-английски"
          className="flex-1 bg-transparent py-3 outline-hidden placeholder:text-neutral-500" />
        {q && <button onClick={() => setQ("")} className="-mr-2 p-2 text-neutral-400" aria-label="Очистить поиск"><X size={20} /></button>}
      </div>

      {creating ? createForm : (
        <button onClick={() => startCreate(q.trim())} className="mt-2 w-full rounded-xl border border-dashed border-neutral-700 py-2.5 text-sm text-neutral-300">
          + Новое упражнение
        </button>
      )}

      <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button onClick={() => setFilter("")} className={chip(!filter)}>все</button>
        {allGroups.map((g) => (
          <button key={g} onClick={() => setFilter(filter === g ? "" : g)} className={chip(filter === g)}>{g}</button>
        ))}
      </div>

      {byGroup.length === 0 && <p className="mt-4 text-neutral-400">Ничего не нашлось.</p>}

      {byGroup.map(([g, list]) => (
        <div key={g} className="mt-4">
          <div className={`mb-1 px-1 text-xs ${g === "твои" ? "font-semibold text-accent-400" : "text-neutral-500"}`}>
            {g === "твои" ? "Твои упражнения" : g}
          </div>
          <div className="divide-y divide-neutral-800 rounded-xl bg-neutral-900">
            {list.map((e) => (
              <button key={e.id} onClick={() => onSelect(e)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left active:bg-neutral-800 ${selected && selected.has(e.id) ? "bg-neutral-800" : ""}`}>
                <ExImg ex={e} />
                <span className="min-w-0 flex-1">
                  <span className="block">{nm1(e)}</span>
                  {nm2(e) && <span className="block text-xs text-neutral-500">{nm2(e)}</span>}
                </span>
                {g === "твои" && <span className="ml-2 text-[11px] text-neutral-500">{e.group}</span>}
                {e.kind === "time" && <span className="ml-2 text-xs text-neutral-500">на время</span>}
                {selected && (
                  <span className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected.has(e.id) ? "bg-accent-400 text-black" : "border border-neutral-700"}`}>
                    {selected.has(e.id) && <Check size={14} />}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {ql && !exact && !creating && (
        <Button variant="dashed" block onClick={() => { startCreate(q.trim()); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-4">
          + Создать «{q.trim()}»
        </Button>
      )}
    </div>
  );
}

// With onPickMany the picker stays open: tap to select several, then "Добавить (N)".
export function Picker({ data, up, onPick, onPickMany, onClose, title = "Добавить упражнение" }) {
  const multi = !!onPickMany;
  const [chosen, setChosen] = useState([]);
  const toggle = (ex) => setChosen((c) => (c.some((x) => x.id === ex.id) ? c.filter((x) => x.id !== ex.id) : [...c, ex]));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto max-w-md p-4 pb-32">
        <Header title={title} right={<button onClick={onClose} className="p-2 text-neutral-400"><X size={22} /></button>} />
        <ExerciseList data={data} up={up} onSelect={multi ? toggle : onPick} selected={multi ? new Set(chosen.map((x) => x.id)) : null} autoFocus={!multi} />
      </div>
      {multi && chosen.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 bg-black/90 px-4 pt-3">
          <div className="mx-auto max-w-md pb-3">
            <Button block onClick={() => onPickMany(chosen)}>Добавить ({chosen.length})</Button>
          </div>
        </div>
      )}
    </div>
  );
}
