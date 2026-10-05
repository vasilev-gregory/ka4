// One exercise: progress chart, history, editing (name, group, kind, bodyweight share).
import { useState, useMemo } from "react";
import { Pencil } from "lucide-react";
import { fmtDate, fmtKg, fmtNum, plural } from "../core/util.js";
import { EX_KINDS, GROUPS } from "../model/catalog.js";
import { cycleMuscle, MUSCLE_NAME, MUSCLES, musclesOf } from "../model/muscles.js";
import { fmtSets } from "../model/workout.js";
import { exerciseSeries } from "../model/periods.js";
import { bestE1rm } from "../model/records.js";
import { ExImg, Header, PhotoPicker, Segmented, Trend, useApp } from "../ui/kit.jsx";

// "Мышцы: квадрицепс; помогают: ягодицы"
const fmtWorked = (w) => {
  const by = (main) => MUSCLES.filter(([m]) => (main ? w[m] >= 1 : w[m] > 0 && w[m] < 1)).map(([m]) => MUSCLE_NAME[m]).join(", ");
  return `Мышцы: ${by(true) || "—"}${by(false) ? `; помогают: ${by(false)}` : ""}`;
};

export function ExerciseDetail({ data, up, exMap, id, back, open }) {
  const { bwAt, nm1, nm2 } = useApp();
  const [edit, setEdit] = useState(false);
  const [metric, setMetric] = useState("max");
  const ex = exMap[id];
  const sessions = useMemo(() => {
    const out = [];
    for (let i = data.workouts.length - 1; i >= 0; i--) {
      const w = data.workouts[i];
      const e = w.exercises.find((x) => x.exerciseId === id);
      if (e) out.push({ w, sets: e.sets });
    }
    return out;
  }, [data.workouts, id]);
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

  return (
    <div className="p-4 pb-28">
      <Header title={nm1(ex)} back={back}
        right={<button onClick={() => setEdit(!edit)} className="shrink-0 self-start p-2 text-neutral-400" aria-label="Изменить"><Pencil size={20} /></button>} />
      {nm2(ex) && <p className="-mt-3 mb-4 text-neutral-400">{nm2(ex)}</p>}
      {!isCardio && Object.keys(worked).length > 0 && (
        <p className="-mt-2 mb-4 text-xs text-neutral-400">{fmtWorked(worked)}</p>
      )}

      {edit && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-3">
          <input value={ex.name} placeholder="Название" onChange={(e) => mut((x) => { x.name = e.target.value; })}
            className="mb-2 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-accent-400" />
          <input value={ex.ru || ""} placeholder="Второе название" onChange={(e) => mut((x) => { x.ru = e.target.value; })}
            className="mb-3 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-accent-400" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button key={g} onClick={() => mut((x) => { x.group = g; })}
                className={`rounded-full px-3 py-1 text-xs ${ex.group === g ? "bg-accent-400 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}>{g}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EX_KINDS.map(([k, l]) => (
              <button key={k} onClick={() => mut((x) => { x.kind = k; })}
                className={`rounded-full px-3 py-1 text-xs ${ex.kind === k ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
            ))}
          </div>
          {!isCardio && <>
            <div className="mb-1.5 mt-3 text-xs text-neutral-400">Мышцы: тап — основная, ещё тап — вспомогательная, ещё — убрать</div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map(([m, name]) => (
                <button key={m} onClick={() => mut((x) => { x.muscles = cycleMuscle(x, m); })}
                  className={`rounded-full px-3 py-1 text-xs ${worked[m] >= 1 ? "bg-accent-400 text-black" : worked[m] ? "bg-accent-950 text-accent-300" : "bg-neutral-800 text-neutral-400"}`}>
                  {name}
                </button>
              ))}
            </div>
            {ex.muscles && <button onClick={() => mut((x) => { delete x.muscles; })} className="mt-1.5 text-[11px] text-neutral-400 underline">как в каталоге</button>}
          </>}
          <div className="mb-1.5 mt-3 text-xs text-neutral-400">Фото</div>
          <PhotoPicker ex={ex} onChange={(v) => mut((x) => { if (v) x.photo = v; else delete x.photo; })} />
          {!isCardio && <>
          <div className="mb-1.5 mt-3 text-xs text-neutral-400">Вес тела в нагрузке</div>
          <div className="flex flex-wrap gap-1.5">
            {[["нет", 0, false], ["100%", 1, false], ["95%", 0.95, false], ["85%", 0.85, false], ["65%", 0.65, false], ["55%", 0.55, false], ["гравитрон", 0, true]].map(([l, f, as]) => {
              const on = as ? !!ex.assist : !ex.assist && (ex.bw || 0) === f;
              return (
                <button key={l} onClick={() => mut((x) => { x.assist = as; x.bw = as ? 0 : f; })}
                  className={`rounded-full px-3 py-1 text-xs ${on ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Доля веса тела, которую реально поднимаешь. В «кг» тогда пишется дополнительный вес, а у гравитрона — помощь.
          </p>
          </>}
        </div>
      )}

      <div className="mb-4 flex items-center gap-6">
        <ExImg ex={ex} size={64} />
        <div><div className="text-2xl font-bold tabular-nums">{sessions.length}</div><div className="text-xs text-neutral-400">тренировок</div></div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-accent-400">{best ? fmtNum(best) : "—"}</div>
          <div className="text-xs text-neutral-400">{isCardio ? "дольше всего, мин" : isTime ? "лучшее время, с" : isBody ? "макс. нагрузка с весом тела, кг" : "макс. вес, кг"}</div>
        </div>
        {oneRm != null && (
          <div>
            <div className="text-2xl font-bold tabular-nums">≈{fmtNum(Math.round(oneRm * 2) / 2)}</div>
            <div className="text-xs text-neutral-400">1ПМ, кг (расчёт)</div>
          </div>
        )}
      </div>

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

      {sessions.length === 0 && <p className="text-neutral-400">Истории пока нет. Сделай подход, и он появится здесь.</p>}
      <div className="space-y-2">
        {sessions.map(({ w, sets }) => (
          <button key={w.id} onClick={() => open({ type: "workout", id: w.id })} className="w-full rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
            <div className="text-xs text-neutral-400">{fmtDate(w.startedAt)}</div>
            <div className="tabular-nums">{fmtSets(sets, ex.kind)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
