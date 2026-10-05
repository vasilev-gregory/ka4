// One finished workout: totals, what it added to the week, rest, exercises with progress notes.
import { Trophy } from "lucide-react";
import { fmtDate, fmtDur, fmtGroupWeek, fmtKg, fmtNum, weekStartOf } from "../core/util.js";
import { fmtSets, growthStatus, restStats, stats, weekAnalysis } from "../model/workout.js";
import { bestE1rm, previousSession, sessionE1rm } from "../model/records.js";
import { ConfirmButton, ExImg, Header, useApp } from "../ui/kit.jsx";

// "+2,5 кг", "−1 кг", "так же"
const fmtDelta = (d) => (Math.abs(d) < 0.25 ? "так же" : `${d > 0 ? "+" : "−"}${fmtNum(Math.round(Math.abs(d) * 2) / 2)} кг`);

// How an exercise went compared with its previous session: a record, or the change of the estimated 1RM.
function progressNote(data, w, e, ex, bwAt) {
  const cur = sessionE1rm(e.sets, ex, bwAt(w.startedAt));
  if (cur == null) return null;
  const best = bestE1rm(data.workouts, e.exerciseId, ex, bwAt, w.startedAt);
  if (best != null && cur > best + 1e-9) return { text: "рекорд", good: true };
  const prev = previousSession(data.workouts, e.exerciseId, w.startedAt);
  const was = prev && sessionE1rm(prev.sets, ex, bwAt(prev.workout.startedAt));
  if (was == null) return null;
  return { text: `${fmtDelta(cur - was)} к прошлому разу`, good: cur - was >= 0.25 };
}

export function WorkoutDetail({ data, up, exMap, id, back, open }) {
  const { bwAt, nm1 } = useApp();
  const w = data.workouts.find((x) => x.id === id);
  if (!w) return <div className="p-4"><Header title="Тренировка удалена" back={back} /></div>;
  const st = stats(w, exMap, bwAt);
  // volume against the previous workout of the same program
  const prevSame = w.programId && [...data.workouts].reverse().find((x) => x.programId === w.programId && x.startedAt < w.startedAt);
  const prevVol = prevSame ? stats(prevSame, exMap, bwAt).vol : 0;
  const volNote = prevVol > 0 ? `объём, ${st.vol >= prevVol ? "+" : "−"}${Math.round(Math.abs(st.vol / prevVol - 1) * 100)}%` : "объём";
  return (
    <div className="p-4 pb-28">
      <Header title={w.name} back={back} />
      <p className="-mt-3 mb-4 text-neutral-400">{fmtDate(w.startedAt)}</p>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[[fmtDur(st.dur), st.extra >= 60000 ? `время, +${fmtDur(st.extra)} позже` : "время"], [fmtKg(st.vol), volNote], [st.sets, "подходов"]].map(([v, l]) => (
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
                    <span className="w-24 shrink-0 tabular-nums text-neutral-400">{fmtGroupWeek(sets, freq)}</span>
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
          const note = exMap[e.exerciseId] && progressNote(data, w, e, ex, bwAt);
          return (
            <button key={i} onClick={() => open({ type: "exercise", id: e.exerciseId })} className="flex w-full items-center gap-3 rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
              <ExImg ex={exMap[e.exerciseId]} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{nm1(ex) || ex.name}</div>
                <div className="text-xs text-neutral-300 tabular-nums">{fmtSets(e.sets, ex.kind)}</div>
                {note && (
                  <div className={`text-xs ${note.good ? "text-accent-400" : "text-neutral-500"}`}>
                    {note.text === "рекорд" && <Trophy size={12} className="mr-1 inline -mt-0.5" />}{note.text}
                  </div>
                )}
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
