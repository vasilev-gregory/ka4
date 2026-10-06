// One stretching run from the history: its numbers, the areas it stretched (this run / its week) and the stretches
// with the time held; it can be deleted. Built from the same pieces as a strength workout's card (ui/Session).
import { fmtDur, plural, weekStartOf } from "../core/util.js";
import { heldTotal, sessionAreas, stExMap, stretchWeek } from "../model/stretch.js";
import { removeSession } from "../model/stretchActions.js";
import { DeleteButton, Header } from "../ui/kit.jsx";
import { SessionHeader, StatTiles, ViewsCard } from "../ui/Session.jsx";
import { ExerciseRow } from "../ui/ExerciseCard.jsx";
import { StretchBreakdown } from "./StretchBreakdown.jsx";

const VIEWS = [["run", "Растяжка"], ["week", "Неделя"]];

export function StretchSession({ stretch, upStretch, id, back, open }) {
  const x = stretch.sessions.find((y) => y.id === id);
  if (!x) return <div className="p-4"><Header title="Растяжка удалена" back={back} /></div>;
  const exMap = stExMap(stretch);
  const areas = sessionAreas(stretch, x);
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
        <ViewsCard title="Мышцы" views={VIEWS} className="-mt-3 mb-5">
          {(view) => (view === "run" ? <StretchBreakdown key="run" areas={areas} single exMap={exMap} byNote="в этой растяжке" open={open} />
            : <StretchBreakdown key="week" areas={stretchWeek(stretch, weekStartOf(x.startedAt)).areas} week exMap={exMap} byNote="за неделю" open={open} />)}
        </ViewsCard>
      )}
      <div className="space-y-2">
        {held.map(([exId, sec]) => {
          const ex = exMap[exId];
          return (
            <ExerciseRow key={exId} ex={ex} missing="Удалённая растяжка" onClick={() => open({ type: "stretchExercise", id: exId })}
              text={`${ex && ex.area ? `${ex.area} · ` : ""}удержание ${fmtDur(sec * 1000)}${ex && ex.sides ? " на сторону" : ""}`} />
          );
        })}
      </div>
      <DeleteButton onConfirm={() => { upStretch((s) => removeSession(s, id)); back(); }} confirmText="Удалить из истории?">
        Удалить растяжку
      </DeleteButton>
    </div>
  );
}
