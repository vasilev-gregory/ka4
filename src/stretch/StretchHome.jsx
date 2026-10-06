// Stretching "Тренировка" tab: the programs (shared rows, ui/ProgramRows) with their length, and a run without one:
// pick the stretches and go.
import { useState } from "react";
import { fmtDur, uid } from "../core/util.js";
import { buildTimeline, stExMap } from "../model/stretch.js";
import { createProgram } from "../model/stretchActions.js";
import { Header, useApp } from "../ui/kit.jsx";
import { ProgramRows } from "../ui/ProgramRows.jsx";
import { StretchPicker } from "./StretchPicker.jsx";

// play(programId): starts a program (or opens the run going on); playNow(exerciseIds): a quick run of those stretches
export function StretchHome({ stretch, upStretch, open, play, playNow }) {
  const { nm1 } = useApp();
  const exMap = stExMap(stretch);
  const [picking, setPicking] = useState(false);
  const create = () => {
    const id = uid();
    upStretch((s) => createProgram(s, id));
    open({ type: "stretchProgram", id });
  };
  return (
    <div className="p-4">
      <Header title="Растяжка" />
      <ProgramRows onOpen={(id) => open({ type: "stretchProgram", id })} onStart={play} onCreate={create}
        onWithout={() => setPicking(true)} running={stretch.active && !stretch.active.done ? stretch.active.programId : null}
        programs={stretch.programs.map((p) => {
          const total = buildTimeline(p, exMap).reduce((x, ph) => x + ph.dur, 0);
          const names = p.items.map((it) => exMap[it.exerciseId]).filter(Boolean).map((e) => nm1(e)).join(", ");
          return { id: p.id, name: p.name, canStart: total > 0, meta: names ? `${names}${total ? ` · ≈ ${fmtDur(total * 1000)}` : ""}` : "Пока без растяжек" };
        })} />
      {picking && (
        <StretchPicker stretch={stretch} upStretch={upStretch} onClose={() => setPicking(false)} title="Без программы" action="Начать"
          onPick={(list) => { setPicking(false); playNow(list.map((e) => e.id)); }} />
      )}
    </div>
  );
}
