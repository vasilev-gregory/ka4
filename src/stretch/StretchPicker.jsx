// Pick stretches to add (several at once); search by words in either language; create a new one.
import { useState } from "react";
import { X, Check, Search } from "lucide-react";
import { uid } from "../core/util.js";
import { createExercise } from "../model/stretchActions.js";
import { Button, Header, Segmented } from "../ui/kit.jsx";

// title / action: the screen's title and the button's word (adding to a program by default)
export function StretchPicker({ stretch, upStretch, onPick, onClose, already = [], title = "Добавить растяжку", action = "Добавить" }) {
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState([]);
  const [sides, setSides] = useState(true);
  const isChosen = (ex) => chosen.some((x) => x.id === ex.id);
  const toggle = (ex) => setChosen((c) => (c.some((x) => x.id === ex.id) ? c.filter((x) => x.id !== ex.id) : [...c, ex]));
  const ql = q.trim().toLowerCase();
  const words = ql.split(/\s+/).filter(Boolean);
  const list = stretch.exercises.filter((e) => words.every((w) => `${e.name} ${e.ru || ""}`.toLowerCase().includes(w)));
  const exact = stretch.exercises.some((e) => e.name.toLowerCase() === ql || (e.ru || "").toLowerCase() === ql);
  const create = () => {
    const ex = { id: "st-" + uid(), name: q.trim(), sides };
    upStretch((s) => createExercise(s, ex));
    setQ("");
    setChosen((c) => [...c, ex]);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto max-w-md p-4 pb-32">
        <Header title={title} right={<button onClick={onClose} className="p-2 text-neutral-400"><X size={22} /></button>} />
        <div className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3">
          <Search size={18} className="text-neutral-500" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск или новая растяжка"
            className="flex-1 bg-transparent py-3 outline-hidden placeholder:text-neutral-500" />
          {q && <button onClick={() => setQ("")} className="-mr-2 p-2 text-neutral-400" aria-label="Очистить поиск"><X size={20} /></button>}
        </div>
        <div className="mt-3 divide-y divide-neutral-800 rounded-xl bg-neutral-900">
          {list.map((e) => (
            <button key={e.id} onClick={() => toggle(e)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left active:bg-neutral-800 ${isChosen(e) ? "bg-neutral-800" : ""}`}>
              <span className="min-w-0 flex-1">
                <span className="block">{e.ru || e.name}</span>
                {e.ru && <span className="block text-xs text-neutral-500">{e.name}</span>}
              </span>
              {already.includes(e.id) && <span className="text-[11px] text-accent-300">уже в программе</span>}
              {e.sides && <span className="text-[11px] text-neutral-500">2 стороны</span>}
              <span className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isChosen(e) ? "bg-accent-400 text-black" : "border border-neutral-700"}`}>
                {isChosen(e) && <Check size={14} />}
              </span>
            </button>
          ))}
        </div>
        {ql && !exact && list.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-700 p-3">
            <div className="mb-2 text-xs text-neutral-300">Новая растяжка «{q.trim()}»</div>
            <div className="mb-3"><Segmented options={[[true, "на обе стороны"], [false, "одна сторона"]]} value={sides} onChange={setSides} /></div>
            <Button block onClick={create} className="py-2.5">Создать</Button>
          </div>
        )}
      </div>
      {chosen.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 bg-black/90 px-4 pt-3">
          <div className="mx-auto max-w-md pb-3">
            <Button block onClick={() => onPick(chosen)}>{action} ({chosen.length})</Button>
          </div>
        </div>
      )}
    </div>
  );
}
