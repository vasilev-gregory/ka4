// A workout as plain text, to paste into a chat: when and how long, every set with its time and the rest before it,
// progress against last time, the muscles of the workout and of its week with the statuses — what the card shows.
import { fmtDate, fmtDur, fmtNum, num, plural, weekStartOf } from "../core/util.js";
import { fmtTotals, restBefore, restStats, segmentsOf, setLabels, stats } from "./workout.js";
import { sessionProgress } from "./records.js";
import { growthStatus, MUSCLE_NAME, MUSCLES, muscleLoad, musclesOf, sessionHint, sessionStatus, weekHint, weekLoad } from "./muscles.js";

const hm = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

function setText(s, kind) {
  if (kind === "cardio") return `${fmtNum(num(s.r))} мин${num(s.w) ? `, ${fmtNum(num(s.w))} км` : ""}`;
  const base = kind === "time" ? `${num(s.w) ? `${fmtNum(num(s.w))} кг × ` : ""}${num(s.r)} с` : `${fmtNum(num(s.w))} кг × ${num(s.r)}`;
  const partial = num(s.p) ? ` + ${num(s.p)} частичных` : "";
  const rir = s.rir === 0 ? ", отказ" : s.rir != null ? `, RIR ${s.rir === 4 ? "4+" : s.rir}` : "";
  return base + partial + rir;
}

const musclesLine = (ex) => {
  const m = Object.entries(musclesOf(ex));
  const main = m.filter(([, k]) => k >= 1).map(([id]) => MUSCLE_NAME[id]), help = m.filter(([, k]) => k < 1).map(([id]) => MUSCLE_NAME[id]);
  return m.length ? ` — ${main.join(", ")}${help.length ? `; помогают: ${help.join(", ")}` : ""}` : "";
};

// data: the app data; w: a finished workout or workoutSoFar(); nameOf(ex): the shown name; live: still going
export function workoutText(data, w, exMap, bwAt, nameOf, live = false) {
  const out = [];
  const st = stats(w, exMap, bwAt);
  const segs = segmentsOf(w);
  out.push(`Тренировка «${w.name}» — ${fmtDate(w.startedAt)}, ${hm(w.startedAt)}–${hm(w.finishedAt)}${live ? " (идёт)" : ""}${w.off ? " — не в зачёт" : ""}`);
  out.push(`Время: ${fmtDur(st.dur)}${st.extra >= 60000 ? `, +${fmtDur(st.extra)} позже` : ""}${segs.length > 1 ? ` (отрезки: ${segs.map((g) => `${hm(g.start)}–${hm(g.end)}`).join(", ")})` : ""}`);
  out.push(`Итого: ${fmtTotals(st)}`);
  const rs = restStats(w);
  if (rs.nSets || rs.nEx) out.push(`Отдых: между подходами ${rs.nSets ? fmtDur(rs.sets) : "—"}, между упражнениями ${rs.nEx ? fmtDur(rs.ex) : "—"}`);
  if (w.warmup && w.warmup.doneAt) out.push(`Разминка: до ${hm(w.warmup.doneAt)} (${fmtDur(w.warmup.doneAt - w.startedAt)})`);

  const rests = restBefore(w);
  w.exercises.forEach((e, ei) => {
    const ex = exMap[e.exerciseId];
    out.push("", `${ei + 1}. ${ex ? nameOf(ex) : "Удалённое упражнение"}${ex && ex.name !== nameOf(ex) ? ` (${ex.name})` : ""}${ex ? musclesLine(ex) : ""}`);
    const labels = setLabels(e.sets);
    e.sets.forEach((s, si) => {
      const r = rests[`${ei}:${si}`];
      const when = s.at ? ` · ${hm(s.at)}${r === "drop" ? " · дроп" : r ? ` · отдых ${fmtDur(r)}` : ""}` : "";
      out.push(`   ${s.t === "w" ? "разминка" : `${labels[si]})`} ${setText(s, ex ? ex.kind : "reps")}${when}`);
    });
    const p = ex ? sessionProgress(data.workouts, w, e, ex, bwAt) : null;
    if (p) out.push(`   ${p.record ? "рекорд (расчётный 1ПМ)" : `к прошлому разу: ${p.delta >= 0 ? "+" : "−"}${fmtNum(Math.abs(p.delta))} кг расчётного 1ПМ`}`);
  });

  const own = muscleLoad([w], exMap, -Infinity, Infinity).muscles;
  const all = data.workouts.includes(w) ? data.workouts : [...data.workouts, w];
  const week = weekLoad(all, exMap, weekStartOf(w.startedAt)).muscles;
  const rowsOf = (load, line) => MUSCLES.filter(([m]) => load[m]).map(([m, name]) => `   ${name}: ${line(m, load[m])}`);
  const rows = (load, line) => rowsOf(load, (m, l) => line(l));
  if (Object.keys(own).length) {
    out.push("", "Мышцы за тренировку (тяжёлые подходы, помогающая мышца — половина; рост — от 3, оптимум — 6–11):");
    out.push(...rowsOf(own, (m, l) => `${fmtNum(l.sets)} подх. — ${sessionStatus(l.sets)[1]}; ${sessionHint(l.sets, week[m] ? week[m].sets : 0)}`));
    out.push("", "Мышцы за неделю (рост — от 4 подходов, оптимум — от 10, максимум — 20–30):");
    const times = (n) => (n ? ` · ${n} ${plural(n, "раз", "раза", "раз")}` : "");
    out.push(...rows(week, (l) => `${fmtNum(l.sets)} подх.${times(l.freq)} — ${growthStatus(l.sets)[1]}; ${weekHint(l.sets)}`));
  }
  return out.join("\n");
}
