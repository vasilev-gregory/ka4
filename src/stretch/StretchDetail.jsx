// A stretch's card, built like a strength exercise's (ui/ExerciseCard): names, muscle area, photo, one side or two
// (the user's own only), what it stretches, how much it was held over time, and the runs it was in.
import { useState } from "react";
import { fmtDate, fmtDur, plural } from "../core/util.js";
import { ST_AREAS, isBuiltInStretch } from "../model/catalog.js";
import { AREA_PARTS, areaOf, stretchSessionsOf } from "../model/stretch.js";
import { updateExercise } from "../model/stretchActions.js";
import { ExerciseBody, ExerciseNameFields, ExerciseSessions, ExerciseStats, ExerciseTitle } from "../ui/ExerciseCard.jsx";
import { Chip, Header, PhotoPicker, Trend } from "../ui/kit.jsx";

export function StretchDetail({ stretch, upStretch, id, back, open }) {
  const [edit, setEdit] = useState(false);
  const ex = stretch.exercises.find((e) => e.id === id);
  if (!ex) return <div className="p-4"><Header title="Растяжка удалена" back={back} /></div>;
  const update = (patch) => upStretch((s) => updateExercise(s, id, patch));
  const runs = stretchSessionsOf(stretch, id);
  const total = runs.reduce((t, r) => t + r.sec, 0);
  const parts = AREA_PARTS[areaOf(ex)] || [];
  const series = runs.map((r) => ({ t: r.x.startedAt, v: r.sec })).reverse();
  return (
    <div className="p-4 pb-28">
      <ExerciseTitle ex={ex} back={back} editing={edit} toggleEdit={() => setEdit(!edit)} />
      {edit && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-3">
          <ExerciseNameFields ex={ex} onChange={update} />
          <div className="mb-1.5 text-xs text-neutral-400">Группа мышц</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ST_AREAS.map((a) => <Chip key={a} on={ex.area === a} onClick={() => update({ area: a })}>{a}</Chip>)}
          </div>
          {/* one side or two is what a stretch is: fixed for built-in ones, the user's own say it themselves */}
          {!isBuiltInStretch(ex.id) && <Chip on={ex.sides} onClick={() => update({ sides: !ex.sides })} className="mb-3">на обе стороны: {ex.sides ? "да" : "нет"}</Chip>}
          <div className="mb-1.5 text-xs text-neutral-400">Фото</div>
          <PhotoPicker ex={ex} onChange={(v) => update({ photo: v || undefined })} />
        </div>
      )}

      <ExerciseStats ex={ex} stats={[
        [runs.length, plural(runs.length, "растяжка", "растяжки", "растяжек")],
        [fmtDur(total * 1000), "удержание всего, на сторону", true],
      ]} />
      <ExerciseBody title="Что тянется" parts={parts} fill={Object.fromEntries(parts.map((m) => [m, 1]))}>
        {ex.area ? ex.area : "Группа мышц не указана"}{ex.sides ? " · на обе стороны" : " · одна сторона"}
      </ExerciseBody>
      {series.length >= 2 && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-2">
          <Trend points={series} unit="с" header={(shown) => `${fmtDur(shown[0].v * 1000)} → ${fmtDur(shown[shown.length - 1].v * 1000)} с ${fmtDate(shown[0].t)}`} />
        </div>
      )}
      <ExerciseSessions empty="Истории пока нет: она появится после первой растяжки с этой растяжкой."
        sessions={runs.map(({ x, sec }) => ({ id: x.id, at: x.startedAt, text: `${x.name} · удержание ${fmtDur(sec * 1000)}`, onClick: () => open({ type: "stretchSession", id: x.id }) }))} />
    </div>
  );
}
