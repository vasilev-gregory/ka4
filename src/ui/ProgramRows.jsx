// The programs to start from, the same for strength and stretching: a row per program (a tap opens it, ▶ starts
// it), then «+ Новая программа» and «Без программы». The section says what a program's line shows and what
// starting means.
import { Check, Play } from "lucide-react";
import { useLongPress } from "./gestures.js";
import { progTitle } from "../core/util.js";
import { Button } from "./kit.jsx";

// programs: [{ id, name, meta, canStart, note?, next? }] (note: a short line in the accent, e.g. a split's «✓ пн»; next: the
// one to do now, outlined); onOpen(id), onStart(id), onCreate(), onWithout(); running: the id of the
// program whose session is going on — its ▶ goes back to it, the others wait (one session at a time)
// blocked: the other section's session goes on — nothing starts here, and this says why; select: { ids, toggle(id) } —
// a hold picks a program and taps then pick more (the section acts on them); without it a hold is just a tap
export function ProgramRows({ programs, onOpen, onStart, onCreate, onWithout, running = null, blocked = null, select }) {
  const press = useLongPress();
  const picking = select && select.ids.length > 0;
  return (
    <div className="space-y-2">
      {blocked && <p className="rounded-xl bg-neutral-900 px-4 py-3 text-xs text-accent-300">{blocked}</p>}
      {programs.map((p) => (
        <div key={p.id} className={`flex items-stretch gap-2 rounded-xl p-2 pl-4 ${select?.ids.includes(p.id) ? "bg-neutral-700" : "bg-neutral-900"} ${
          p.next ? "ring-2 ring-accent-400" : ""}`}>
          <button {...(select ? press.bind({ onTap: () => (picking ? select.toggle(p.id) : onOpen(p.id)), onLong: () => select.toggle(p.id) }) : { onClick: () => onOpen(p.id) })}
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }} className="min-w-0 flex-1 py-2 text-left">
            <div className="text-base font-semibold">{progTitle(p)}{running === p.id && <span className="ml-2 text-xs font-normal text-accent-400">идёт</span>}</div>
            <div className="mt-1 text-xs text-neutral-400">{p.meta}</div>
            {p.note && <div className="mt-1 text-xs font-semibold text-accent-300">{p.note}</div>}
          </button>
          {picking ? (
            <button onClick={() => select.toggle(p.id)} aria-label="Выбрать" className="flex w-14 shrink-0 items-center justify-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${select.ids.includes(p.id) ? "bg-accent-400 text-black" : "border border-neutral-600"}`}>
                {select.ids.includes(p.id) && <Check size={16} />}
              </span>
            </button>
          ) : (
            <button disabled={!!blocked || (running ? running !== p.id : p.canStart === false)} onClick={() => onStart(p.id)} aria-label={running === p.id ? "Вернуться" : "Начать"}
              className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-black disabled:opacity-30">
              <Play size={22} />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="dashed" size="lg" className="flex-1" onClick={onCreate}>+ Новая программа</Button>
        <Button variant="dashed" size="lg" className="flex-1" disabled={!!running || !!blocked} onClick={onWithout}>Без программы</Button>
      </div>
    </div>
  );
}
