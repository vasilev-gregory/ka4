// One exercise: progress chart, history, editing (name, group, kind, bodyweight share).
import { useState, useMemo } from "react";
import { fmtDate, fmtKg, fmtNum, plural } from "../core/util.js";
import { EX_KINDS, GROUPS } from "../model/catalog.js";
import { cycleMuscle, MUSCLE_NAME, MUSCLES, musclesOf } from "../model/muscles.js";
import { exerciseSessions, fmtSets } from "../model/workout.js";
import { exerciseSeries } from "../model/periods.js";
import { bestE1rm } from "../model/records.js";
import { Button, Chip, Header, PhotoPicker, Segmented, Sheet, Trend, useApp } from "../ui/kit.jsx";
import { BodyMap } from "../ui/BodyMap.jsx";
import { ExerciseNameFields, ExerciseSessions, ExerciseStats, ExerciseTitle } from "../ui/ExerciseCard.jsx";

// "Мышцы: квадрицепс; помогают: ягодицы"
const fmtWorked = (w) => {
  const by = (main) => MUSCLES.filter(([m]) => (main ? w[m] >= 1 : w[m] > 0 && w[m] < 1)).map(([m]) => MUSCLE_NAME[m]).join(", ");
  return `Мышцы: ${by(true) || "—"}${by(false) ? `; помогают: ${by(false)}` : ""}`;
};

export function ExerciseDetail({ data, up, exMap, id, back, open }) {
  const { bwAt } = useApp();
  const [edit, setEdit] = useState(false);
  const [metric, setMetric] = useState("max");
  // changing the muscles recounts the whole history: asked once per visit, then the change goes through
  const [muscleAsk, setMuscleAsk] = useState(null); // the change waiting for "Пересчитать"
  const [muscleOk, setMuscleOk] = useState(false);
  const ex = exMap[id];
  const sessions = useMemo(() => exerciseSessions(data.workouts, id), [data.workouts, id]);
  if (!ex) return <div className="p-4"><Header title="Упражнение удалено" back={back} /></div>;

  const isTime = ex.kind === "time";
  const isCardio = ex.kind === "cardio";
  const worked = musclesOf(ex);
  const isBody = !!(ex.bw || ex.assist);
  const maxSeries = exerciseSeries(data.workouts, id, ex, bwAt, "max");
  const best = maxSeries.length ? Math.max(...maxSeries.map((p) => p.v)) : 0;
  const shownMetric = isTime || (isCardio && metric === "e1rm") ? "max" : metric;
  const series = shownMetric === "max" ? maxSeries : exerciseSeries(data.workouts, id, ex, bwAt, shownMetric);
  const unit = isCardio ? (shownMetric === "vol" ? "км" : "мин") : isTime ? "сек" : "кг";
  const times = (n) => `${n} ${plural(n, "тренировка", "тренировки", "тренировок")}`;
  const fmtV = (v) => (shownMetric === "vol" && !isCardio ? fmtKg(v) : `${fmtNum(v)} ${unit}`);
  const metrics = isCardio ? [["max", "время"], ["vol", "дистанция"]] : [["max", "макс. вес"], ["e1rm", "≈1ПМ"], ["vol", "объём"]];
  const oneRm = bestE1rm(data.workouts, id, ex, bwAt);
  const mut = (fn) => up((d) => { const e = d.exercises.find((x) => x.id === id); if (e) fn(e); });
  const changeMuscles = (fn) => (muscleOk || !sessions.length ? mut(fn) : setMuscleAsk(() => fn));

  return (
    <div className="p-4 pb-28">
      <ExerciseTitle ex={ex} back={back} editing={edit} toggleEdit={() => setEdit(!edit)} />
      {!isCardio && Object.keys(worked).length > 0 && (
        <div className="-mt-2 mb-4 flex items-center gap-3">
          {/* what the exercise works: main muscles filled, helping ones half */}
          <BodyMap parts={Object.keys(worked)} fill={worked} color="fill-rose-500" small title="Мышцы упражнения" />
          <p className="min-w-0 flex-1 text-xs text-neutral-400">{fmtWorked(worked)}</p>
        </div>
      )}

      {edit && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-3">
          <ExerciseNameFields ex={ex} onChange={(patch) => mut((x) => Object.assign(x, patch))} />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <Chip key={g} on={ex.group === g} onClick={() => mut((x) => { x.group = g; })}>{g}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EX_KINDS.map(([k, l]) => (
              <Chip key={k} secondary on={ex.kind === k} onClick={() => mut((x) => { x.kind = k; })}>{l}</Chip>
            ))}
          </div>
          {!isCardio && <>
            <div className="mb-1.5 mt-3 text-xs text-neutral-400">Мышцы: тап — основная, ещё тап — вспомогательная, ещё — убрать</div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map(([m, name]) => (
                <Chip key={m} on={worked[m] >= 1} half={worked[m] > 0 && worked[m] < 1} onClick={() => changeMuscles((x) => { x.muscles = cycleMuscle(x, m); })}>
                  {name}
                </Chip>
              ))}
            </div>
            {ex.muscles && <button onClick={() => changeMuscles((x) => { delete x.muscles; })} className="mt-1.5 text-[11px] text-neutral-400 underline">как в каталоге</button>}
          </>}
          <div className="mb-1.5 mt-3 text-xs text-neutral-400">Фото</div>
          <PhotoPicker ex={ex} onChange={(v) => mut((x) => { if (v) x.photo = v; else delete x.photo; })} />
          {!isCardio && <>
          <div className="mb-1.5 mt-3 text-xs text-neutral-400">Вес тела в нагрузке</div>
          <div className="flex flex-wrap gap-1.5">
            {[["нет", 0, false], ["100%", 1, false], ["95%", 0.95, false], ["85%", 0.85, false], ["65%", 0.65, false], ["55%", 0.55, false], ["гравитрон", 0, true]].map(([l, f, as]) => {
              const on = as ? !!ex.assist : !ex.assist && (ex.bw || 0) === f;
              return (
                <Chip key={l} on={on} onClick={() => mut((x) => { x.assist = as; x.bw = as ? 0 : f; })}>{l}</Chip>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Доля веса тела, которую реально поднимаешь. В «кг» тогда пишется дополнительный вес, а у гравитрона — помощь.
          </p>
          </>}
        </div>
      )}

      <ExerciseStats ex={ex} stats={[
        [sessions.length, plural(sessions.length, "тренировка", "тренировки", "тренировок")],
        [best ? fmtNum(best) : "—", isCardio ? "дольше всего, мин" : isTime ? "лучшее время, с" : isBody ? "макс. нагрузка с весом тела, кг" : "макс. вес, кг", true],
        ...(oneRm != null ? [[`≈${fmtNum(Math.round(oneRm * 2) / 2)}`, "1ПМ, кг (расчёт)"]] : []),
      ]} />

      {maxSeries.length >= 2 && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-2">
          {!isTime && (
            <div className="mb-1.5">
              <Segmented options={metrics} value={shownMetric} onChange={setMetric} />
            </div>
          )}
          <Trend points={series} unit={unit}
            header={(shown) => `${fmtV(shown[0].v)} → ${fmtV(shown[shown.length - 1].v)}, ${times(shown.length)} с ${fmtDate(shown[0].t)}`} />
        </div>
      )}

      {muscleAsk && (
        <Sheet title="Пересчитать всю историю?" onClose={() => setMuscleAsk(null)}>
          <p className="mb-4 text-xs text-neutral-400">
            Мышцы упражнения меняются для всех его тренировок ({sessions.length}): разбор по мышцам в истории пересчитается и за прошлое.
          </p>
          <Button block className="mb-2" onClick={() => { mut(muscleAsk); setMuscleOk(true); setMuscleAsk(null); }}>Пересчитать</Button>
          <Button variant="quiet" block onClick={() => setMuscleAsk(null)}>Отмена</Button>
        </Sheet>
      )}

      <ExerciseSessions empty="Истории пока нет. Сделай подход, и он появится здесь."
        sessions={sessions.map(({ w, sets }) => ({ id: w.id, at: w.startedAt, text: fmtSets(sets, ex.kind), onClick: () => open({ type: "workout", id: w.id }) }))} />
    </div>
  );
}
