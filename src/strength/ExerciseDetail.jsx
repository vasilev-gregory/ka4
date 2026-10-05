// One exercise: progress chart, history, editing (name, group, kind, bodyweight share).
import { useState, useMemo } from "react";
import { Pencil } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { tick } from "../core/sound.js";
import { fmtDate, fmtShort, num } from "../core/util.js";
import { GROUPS } from "../model/catalog.js";
import { fmtSets, setLoad } from "../model/workout.js";
import { ExImg, Header, useApp } from "../ui/kit.jsx";

export function ExerciseDetail({ data, up, exMap, id, back, open }) {
  const { bwAt, nm1, nm2 } = useApp();
  const [edit, setEdit] = useState(false);
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
  const isBody = !!(ex.bw || ex.assist);
  const metric = (sets, ts) => {
    const work = sets.filter((s) => s.t !== "w");
    const bw = bwAt(ts);
    return Math.round(Math.max(...(work.length ? work : sets).map((s) => (isTime ? num(s.r) : setLoad(ex, s, bw)))) * 10) / 10;
  };
  const chart = sessions.slice().reverse().map((s) => ({ date: fmtShort(s.w.startedAt), v: metric(s.sets, s.w.startedAt) }));
  const best = sessions.length ? Math.max(...sessions.map((s) => metric(s.sets, s.w.startedAt))) : 0;
  const mut = (fn) => up((d) => { const e = d.exercises.find((x) => x.id === id); if (e) fn(e); });

  return (
    <div className="p-4 pb-28">
      <Header title={nm1(ex)} back={back}
        right={<button onClick={() => setEdit(!edit)} className="shrink-0 self-start p-2 text-neutral-400" aria-label="Изменить"><Pencil size={20} /></button>} />
      {nm2(ex) && <p className="-mt-3 mb-4 text-neutral-400">{nm2(ex)}</p>}

      {edit && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-3">
          <input value={ex.name} placeholder="Название" onChange={(e) => mut((x) => { x.name = e.target.value; })}
            className="mb-2 w-full rounded-lg bg-black px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
          <input value={ex.ru || ""} placeholder="Второе название" onChange={(e) => mut((x) => { x.ru = e.target.value; })}
            className="mb-3 w-full rounded-lg bg-black px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-400" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button key={g} onClick={() => mut((x) => { x.group = g; })}
                className={`rounded-full px-3 py-1 text-xs ${ex.group === g ? "bg-amber-400 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}>{g}</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[["reps", "вес и повторы"], ["time", "вес и время"]].map(([k, l]) => (
              <button key={k} onClick={() => mut((x) => { x.kind = k; })}
                className={`rounded-full px-3 py-1 text-xs ${ex.kind === k ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
            ))}
          </div>
          <div className="mb-1.5 mt-3 text-xs text-neutral-400">Вес тела в нагрузке</div>
          <div className="flex flex-wrap gap-1.5">
            {[["нет", 0, false], ["100%", 1, false], ["95%", 0.95, false], ["85%", 0.85, false], ["65%", 0.65, false], ["55%", 0.55, false], ["гравитрон", 0, true]].map(([l, f, as]) => {
              const on = as ? !!ex.assist : !ex.assist && (ex.bw || 0) === f;
              return (
                <button key={l} onClick={() => mut((x) => { x.assist = as; x.bw = as ? 0 : f; })}
                  className={`rounded-full px-3 py-1 text-xs ${on ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-500">
            Доля веса тела, которую реально поднимаешь. В «кг» тогда пишется дополнительный вес, а у гравитрона — помощь.
          </p>
        </div>
      )}

      <div className="mb-4 flex items-center gap-6">
        <ExImg ex={ex} size={64} />
        <div><div className="text-2xl font-bold tabular-nums">{sessions.length}</div><div className="text-xs text-neutral-400">тренировок</div></div>
        <div><div className="text-2xl font-bold tabular-nums text-amber-400">{best || "—"}</div><div className="text-xs text-neutral-400">{isTime ? "лучшее время, с" : isBody ? "макс. нагрузка с весом тела, кг" : "макс. вес, кг"}</div></div>
      </div>

      {chart.length >= 2 && (
        <div className="mb-4 h-48 rounded-xl bg-neutral-900 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "#171717", border: "none", borderRadius: 8 }} labelStyle={{ color: "#a3a3a3" }} />
              <Line type="monotone" dataKey="v" name={isTime ? "сек" : "кг"} stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: "#fbbf24" }} />
            </LineChart>
          </ResponsiveContainer>
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
