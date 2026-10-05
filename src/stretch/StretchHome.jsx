// Stretching "Тренировка" tab: programs with their length, start, new program.
import { Play } from "lucide-react";
import { fmtDur, progTitle, uid } from "../core/util.js";
import { buildTimeline, stExMap } from "../model/stretch.js";
import { createProgram } from "../model/stretchActions.js";
import { Button, Header } from "../ui/kit.jsx";

export function StretchHome({ stretch, upStretch, open }) {
  const exMap = stExMap(stretch);
  const create = () => {
    const id = uid();
    upStretch((s) => createProgram(s, id));
    open({ type: "stretchProgram", id });
  };
  return (
    <div className="p-4">
      <Header title="Растяжка" />
      <div className="space-y-2">
        {stretch.programs.map((p) => {
          const tl = buildTimeline(p, exMap);
          const total = tl.reduce((x, ph) => x + ph.dur, 0);
          return (
            <div key={p.id} className="flex items-stretch gap-2 rounded-xl bg-neutral-900 p-2 pl-4">
              <button onClick={() => open({ type: "stretchProgram", id: p.id })} className="min-w-0 flex-1 py-2 text-left">
                <div className="text-base font-semibold">{progTitle(p)}</div>
                <div className="mt-1 text-xs text-neutral-400">{p.items.length} упр.{total ? `, ≈ ${fmtDur(total * 1000)}` : ""}</div>
              </button>
              <button disabled={!tl.length} onClick={() => open({ type: "stretchPlay", id: p.id })} aria-label="Начать"
                className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-black disabled:opacity-30">
                <Play size={22} />
              </button>
            </div>
          );
        })}
        <Button variant="dashed" size="lg" block onClick={create}>+ Новая программа растяжки</Button>
      </div>
    </div>
  );
}
