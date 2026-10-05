// Strength history: calendar with weekly analysis, workout list, workout card.
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { DAY, fmtDate, fmtDur, fmtKg, weekStartOf } from "../core/util.js";
import { GROUPS } from "../model/catalog.js";
import { fmtSets, fmtWDur, growthStatus, restStats, stats, weekAnalysis } from "../model/workout.js";
import { ConfirmButton, ExImg, Header, useApp } from "../ui/kit.jsx";

const dayMonth = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export function WeekCalendar({ workouts, exMap }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); });
  const [selWeek, setSelWeek] = useState(() => weekStartOf(Date.now()));
  const m = new Date(month);
  const trained = new Set(workouts.map((w) => new Date(w.startedAt).toDateString()));
  const first = weekStartOf(month);
  const nextMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
  const weeks = [];
  for (let ws = first; ws < nextMonth; ws = weekStartOf(ws + 8 * DAY)) weeks.push(ws);
  const shift = (k) => setMonth(new Date(m.getFullYear(), m.getMonth() + k, 1).getTime());
  const an = weekAnalysis(workouts, exMap, selWeek);
  const today = new Date().toDateString();
  const rows = GROUPS.map((g) => [g, an.groups[g]]);

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="p-2 text-neutral-400"><ChevronLeft size={20} /></button>
        <div className="font-semibold capitalize">{m.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</div>
        <button onClick={() => shift(1)} className="rotate-180 p-2 text-neutral-400"><ChevronLeft size={20} /></button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-neutral-500">
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => <div key={d}>{d}</div>)}
      </div>
      {weeks.map((ws) => (
        <button key={ws} onClick={() => setSelWeek(ws)}
          className={`grid w-full grid-cols-7 rounded-lg py-0.5 text-center ${ws === selWeek ? "bg-neutral-800" : ""}`}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(ws + i * DAY + 3600e3);
            const inMonth = d.getMonth() === m.getMonth();
            const on = trained.has(d.toDateString());
            return (
              <div key={i} className="flex justify-center py-0.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums
                  ${on ? "bg-accent-400 font-semibold text-black" : inMonth ? "text-neutral-300" : "text-neutral-700"}
                  ${d.toDateString() === today && !on ? "ring-1 ring-accent-400" : ""}`}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </button>
      ))}

      <div className="mt-4 rounded-xl bg-neutral-900 p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="font-semibold">
            {dayMonth(selWeek)} – {dayMonth(selWeek + 6 * DAY + 3600e3)}
          </div>
          <div className="text-xs text-neutral-400">тренировок: {an.days}</div>
        </div>
        <div className="space-y-1.5">
          {rows.map(([g, p]) => {
            const sets = p ? p.sets : 0, freq = p ? p.days.size : 0;
            const [label, cls] = growthStatus(sets, freq);
            return (
              <div key={g} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-neutral-300">{g}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-accent-400" style={{ width: `${Math.min(100, (sets / 20) * 100)}%` }} />
                  <div className="absolute inset-y-0 w-px bg-neutral-500" style={{ left: "50%" }} />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-neutral-400">{sets} п · {freq}×</span>
                <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${cls}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-snug text-neutral-500">
          Считаются тяжёлые подходы (RIR 0–3, без разминок), дроп-сет — один подход; каждое упражнение идёт в свою основную группу.
          Ориентир по исследованиям: 10+ подходов в неделю и 2+ тренировки на группу — оптимум (черта на шкале — 10),
          4–9 тоже дают рост, меньше 4 — скорее поддержка.
        </p>
      </div>
    </div>
  );
}

export function HistoryTab({ data, exMap, open }) {
  const { bwAt } = useApp();
  const list = data.workouts.slice().reverse();
  return (
    <div className="p-4">
      <Header title="История" />
      <WeekCalendar workouts={data.active ? [...data.workouts, data.active] : data.workouts} exMap={exMap} />
      {list.length === 0 && <p className="text-neutral-400">Здесь появятся завершённые тренировки.</p>}
      <div className="space-y-2">
        {list.map((w) => {
          const st = stats(w, exMap, bwAt);
          return (
            <button key={w.id} onClick={() => open({ type: "workout", id: w.id })} className="w-full rounded-xl bg-neutral-900 p-4 text-left active:bg-neutral-800">
              <div className="text-xs text-neutral-400">{fmtDate(w.startedAt)}</div>
              <div className="font-semibold">{w.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtWDur(st)}, {fmtKg(st.vol)}, {st.sets} подх.</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkoutDetail({ data, up, exMap, id, back, open }) {
  const { bwAt } = useApp();
  const w = data.workouts.find((x) => x.id === id);
  if (!w) return <div className="p-4"><Header title="Тренировка удалена" back={back} /></div>;
  const st = stats(w, exMap, bwAt);
  return (
    <div className="p-4 pb-28">
      <Header title={w.name} back={back} />
      <p className="-mt-3 mb-4 text-neutral-400">{fmtDate(w.startedAt)}</p>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[[fmtDur(st.dur), st.extra >= 60000 ? `время, +${fmtDur(st.extra)} позже` : "время"], [fmtKg(st.vol), "объём"], [st.sets, "подходов"]].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-neutral-900 p-3">
            <div className="text-lg font-bold tabular-nums">{v}</div>
            <div className="text-xs text-neutral-400">{l}</div>
          </div>
        ))}
      </div>
      {(() => {
        // what this workout added to the week, per muscle group it trained
        const ws0 = weekStartOf(w.startedAt);
        const an = weekAnalysis(data.workouts, exMap, ws0);
        const groups = [...new Set(w.exercises.map((e) => exMap[e.exerciseId]?.group).filter(Boolean))].filter((g) => an.groups[g]);
        if (!groups.length) return null;
        return (
          <div className="-mt-3 mb-5 rounded-xl bg-neutral-900 p-3">
            <div className="mb-2 font-semibold">Неделя по группам</div>
            <div className="space-y-1.5">
              {groups.map((g) => {
                const sets = an.groups[g].sets, freq = an.groups[g].days.size;
                const [label, cls] = growthStatus(sets, freq);
                const hint = sets < 4 ? `ещё ${4 - sets} подх. до роста`
                  : sets < 10 ? `ещё ${10 - sets} подх. до оптимума`
                  : sets > 20 ? "больше уже мешает восстановлению"
                  : freq < 2 ? "объём есть, нужна ещё одна тренировка группы на неделе"
                  : "неделя закрыта";
                return (
                  <div key={g} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 text-neutral-300">{g}</span>
                    <span className="w-14 shrink-0 tabular-nums text-neutral-400">{sets} п · {freq}×</span>
                    <span className="min-w-0 flex-1 text-neutral-400">{hint}</span>
                    <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${cls}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {(() => {
        const rs = restStats(w);
        if (!rs.nSets && !rs.nEx) return null;
        return (
          <div className="-mt-3 mb-5 grid grid-cols-2 gap-2">
            {[[rs.nSets ? fmtDur(rs.sets) : "—", "средний отдых между подходами"], [rs.nEx ? fmtDur(rs.ex) : "—", "между упражнениями"]].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-neutral-900 p-3">
                <div className="text-lg font-bold tabular-nums">{v}</div>
                <div className="text-xs text-neutral-400">{l}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="space-y-2">
        {w.exercises.map((e, i) => {
          const ex = exMap[e.exerciseId] || { name: "Удалённое упражнение", kind: "reps" };
          return (
            <button key={i} onClick={() => open({ type: "exercise", id: e.exerciseId })} className="flex w-full items-center gap-3 rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
              <ExImg ex={exMap[e.exerciseId]} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{ex.name}</div>
                <div className="text-xs text-neutral-300 tabular-nums">{fmtSets(e.sets, ex.kind)}</div>
              </div>
            </button>
          );
        })}
      </div>
      <ConfirmButton onConfirm={() => { up((d) => { d.workouts = d.workouts.filter((x) => x.id !== id); }); back(); }}
        confirmText="Удалить из истории?" className="mt-6 w-full py-3 text-neutral-500" armedClassName="mt-6 w-full rounded-xl bg-red-600 py-3 text-white">
        Удалить тренировку
      </ConfirmButton>
    </div>
  );
}
