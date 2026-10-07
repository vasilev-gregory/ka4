// One stretching run from the history: its numbers, the areas (StretchPanel: its day / week / month / year) and the stretches
// with the time held; it can be deleted. Built from the same pieces as a strength workout's card (ui/Session).
import { useState } from "react";
import { fmtDur, plural } from "../core/util.js";
import { periodOf } from "../model/calendar.js";
import { heldTotal, stExMap } from "../model/stretch.js";
import { removeSession } from "../model/stretchActions.js";
import { DeleteButton, Header } from "../ui/kit.jsx";
import { SessionHeader, StatTiles } from "../ui/Session.jsx";
import { ExerciseRow } from "../ui/ExerciseCard.jsx";
import { StretchPanel } from "./StretchPanel.jsx";

export function StretchSession({ stretch, upStretch, id, back, open }) {
  const [zoom, setZoom] = useState("day"); // the areas block: this run's day, or its week / month / year
  const x = stretch.sessions.find((y) => y.id === id);
  if (!x) return <div className="p-4"><Header title="Растяжка удалена" back={back} /></div>;
  const held = Object.entries(x.work || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="p-4 pb-28">
      <SessionHeader name={x.name} startedAt={x.startedAt} back={back} />
      <StatTiles tiles={[
        [fmtDur(x.finishedAt - x.startedAt), x.complete ? "время" : "время, не до конца"],
        [fmtDur(heldTotal(x) * 1000), "удержание, на сторону"],
        [held.length, plural(held.length, "растяжка", "растяжки", "растяжек")],
      ]} />
      {held.length > 0 && (
        <StretchPanel stretch={stretch} zoom={zoom} range={periodOf(zoom, x.startedAt)} onZoom={setZoom} open={open} className="-mt-3 mb-5" />
      )}
      <StretchHeld stretch={stretch} x={x} open={open} />
      <DeleteButton onConfirm={() => { upStretch((s) => removeSession(s, id)); back(); }} confirmText="Удалить из истории?">
        Удалить растяжку
      </DeleteButton>
    </div>
  );
}

// a run's stretches with the time held (most first); a tap opens the stretch's card
export function StretchHeld({ stretch, x, open }) {
  const exMap = stExMap(stretch);
  const held = Object.entries(x.work || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {held.map(([exId, sec]) => {
        const ex = exMap[exId];
        return (
          <ExerciseRow key={exId} ex={ex} missing="Удалённая растяжка" onClick={() => open({ type: "stretchExercise", id: exId })}
            text={`${ex && ex.area ? `${ex.area} · ` : ""}удержание ${fmtDur(sec * 1000)}${ex && ex.sides ? " на сторону" : ""}`} />
        );
      })}
    </div>
  );
}
