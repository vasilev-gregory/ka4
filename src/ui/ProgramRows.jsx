// The programs to start from, the same for strength and stretching: a row per program (a tap opens it, ▶ starts
// it), then «+ Новая программа» and «Без программы». The section says what a program's line shows and what
// starting means.
import { Play } from "lucide-react";
import { progTitle } from "../core/util.js";
import { Button } from "./kit.jsx";

// programs: [{ id, name, meta, canStart }]; onOpen(id), onStart(id), onCreate(), onWithout()
export function ProgramRows({ programs, onOpen, onStart, onCreate, onWithout }) {
  return (
    <div className="space-y-2">
      {programs.map((p) => (
        <div key={p.id} className="flex items-stretch gap-2 rounded-xl bg-neutral-900 p-2 pl-4">
          <button onClick={() => onOpen(p.id)} className="min-w-0 flex-1 py-2 text-left">
            <div className="text-base font-semibold">{progTitle(p)}</div>
            <div className="mt-1 text-xs text-neutral-400">{p.meta}</div>
          </button>
          <button disabled={p.canStart === false} onClick={() => onStart(p.id)} aria-label="Начать"
            className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-black disabled:opacity-30">
            <Play size={22} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="dashed" size="lg" className="flex-1" onClick={onCreate}>+ Новая программа</Button>
        <Button variant="dashed" size="lg" className="flex-1" onClick={onWithout}>Без программы</Button>
      </div>
    </div>
  );
}
