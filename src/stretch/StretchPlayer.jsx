// Interval player for a stretching program: big countdown, what's now / next, ±5 s (saved in the
// program), + round (this run only), pause / back / skip, the program's own settings over the player (edits
// apply to the run going on), results at the end.
import { useState, useEffect, useEffectEvent, useRef } from "react";
import { X, ChevronLeft, Settings } from "lucide-react";
import { fmtDur, progTitle, weekStartOf } from "../core/util.js";
import { PHASE, areaOf, buildTimeline, stExMap, stTiming, stretchWeek } from "../model/stretch.js";
import { findProgram, recordSession, savePhaseLength } from "../model/stretchActions.js";
import { Button, ExImg, exPhoto } from "../ui/kit.jsx";
import { useWakeLock } from "../ui/useWakeLock.js";
import { StretchBreakdown } from "./StretchBreakdown.jsx";
import { StretchEditor } from "./StretchEditor.jsx";
import { useStretchRun } from "./useStretchRun.js";

export function StretchPlayer({ stretch, upStretch, sound, id, back, settings }) {
  const p = findProgram(stretch, id);
  const exMap = stExMap(stretch);
  const [overlay, setOverlay] = useState(null); // "program" | "app"
  const [extraRounds, setExtraRounds] = useState(0);
  const saved = useRef(false);
  useWakeLock();

  // a run is recorded once: when it ends, or when left early after at least a minute
  const save = (complete, { work, startedAt, finishedAt }) => {
    if (saved.current) return;
    saved.current = true;
    if (!complete && finishedAt - startedAt < 60e3) return;
    upStretch((s) => recordSession(s, p, { programId: id, startedAt, finishedAt, complete, work }));
  };
  const run = useStretchRun(p ? buildTimeline(p, exMap) : [], { sound, onFinish: (r) => save(true, r) });
  const { tl, st, left, phase: ph } = run;
  // however the player is left (✕, system back, tab switch), an unfinished run is saved
  const onLeave = useEffectEvent(() => { if (!run.st.done) save(false, run.stop()); });
  useEffect(() => () => onLeave(), []);

  const adjust = (delta) => {
    if (!ph) return;
    const seconds = Math.max(5, ph.dur + delta);
    if (seconds === ph.dur) return;
    upStretch((s) => { const pp = findProgram(s, id); if (pp) savePhaseLength(pp, ph, seconds); });
    run.setPhaseLength(seconds);
  };
  // one more full round at the end, for this run only
  const extraRound = () => {
    const T = stTiming(p);
    return [...(T.roundRest > 0 ? [{ k: "roundRest", dur: T.roundRest }] : []), ...buildTimeline({ ...p, timing: { ...T, rounds: 1, mode: "circuit" } }, exMap)];
  };
  const addRound = () => {
    if (!p) return;
    run.extend(extraRound());
    setExtraRounds((n) => n + 1);
  };
  // leaving the program's settings: the run goes on in the edited program (with the rounds added in this run)
  const closeProgram = () => {
    setOverlay(null);
    if (p) run.replace([...buildTimeline(p, exMap), ...Array.from({ length: extraRounds }, extraRound).flat()]);
  };

  // during rest the screen is about what's coming, not what just ended
  const resting = ph && (ph.k === "rest" || ph.k === "roundRest");
  const shownIdx = resting ? tl.findIndex((x, i) => i > st.idx && x.ex) : st.idx;
  const shownEx = shownIdx >= 0 && tl[shownIdx] ? tl[shownIdx].ex : null;
  const next = shownEx ? tl.slice(Math.max(shownIdx, st.idx) + 1).find((x) => x.ex && x.ex !== shownEx) : null;
  const pct = ph ? Math.max(0, Math.min(100, 100 - (left / (ph.dur * 1000)) * 100)) : 100;
  const isWork = ph && ph.k === "work";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {overlay && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto max-w-md">
            {overlay === "app" ? settings(() => setOverlay("program"))
              : <StretchEditor stretch={stretch} upStretch={upStretch} id={id} back={closeProgram} inRun onAppSettings={settings && (() => setOverlay("app"))} />}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <div className="truncate text-sm text-neutral-400">{progTitle(p, "Растяжка")}</div>
          {!st.done && <div className="text-xs text-neutral-600">{st.idx + 1} / {tl.length}</div>}
        </div>
        <div className="flex items-center gap-1">
          {!st.done && <button onClick={addRound} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300">+ круг</button>}
          <button onClick={() => setOverlay("program")} className="p-2 text-neutral-400" aria-label="Настройки"><Settings size={22} /></button>
          <button onClick={back} className="p-2 text-neutral-400" aria-label="Закрыть"><X size={24} /></button>
        </div>
      </div>

      {st.done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
          <div className="text-3xl font-bold text-accent-300">Готово</div>
          <div className="text-neutral-400">{fmtDur(st.finishedAt - st.startedAt)}</div>
          <div className="w-full max-w-md text-left">
            <RunWeek stretch={stretch} exMap={exMap} ws={weekStartOf(st.finishedAt)} only={[...new Set(tl.filter((x) => x.ex).map((x) => areaOf(x.ex)))]} />
          </div>
          <Button onClick={back} className="mt-2 px-8">Закрыть</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className={`mb-3 rounded-full px-4 py-1 text-sm font-semibold ${isWork ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {PHASE[ph.k]}
            </div>
            {resting && shownEx && <div className="mb-1 text-sm text-neutral-500">Следующая</div>}
            {shownEx && exPhoto(shownEx) && <ExImg ex={shownEx} size={140} />}
            {shownEx && <div className="mt-2 text-2xl font-bold">{shownEx.ru || shownEx.name}</div>}
            {ph.side && <div className="mt-1 text-base text-accent-300">{ph.side}</div>}
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => adjust(-5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">−5</button>
              <div className={`text-8xl font-bold tabular-nums ${isWork ? "text-accent-300" : "text-neutral-200"}`}>
                {fmtDur(Math.max(0, left) + 999)}
              </div>
              <button onClick={() => adjust(5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">+5</button>
            </div>
            <div className="mt-1 text-[11px] text-neutral-600">
              {ph.k === "roundRest" ? "±5 — отдых между кругами в программе" : `±5 — ${PHASE[ph.k].toLowerCase()} для этой растяжки, сохранится в программе`}
            </div>
            <div className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-800">
              <div className={`h-full ${isWork ? "bg-accent-400" : "bg-neutral-500"}`} style={{ width: `${pct}%`, transition: "width 200ms linear" }} />
            </div>
            {next && next.ex && <div className="mt-4 text-sm text-neutral-500">Дальше: {next.ex.ru || next.ex.name}</div>}
          </div>
          <div className="flex items-center justify-center gap-6 p-6">
            <button onClick={() => run.go(st.idx - 1)} className="rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Назад"><ChevronLeft size={28} /></button>
            <button onClick={run.togglePause} className="rounded-full bg-accent-400 px-8 py-5 text-lg font-semibold text-black">
              {st.pausedLeft != null ? "Продолжить" : "Пауза"}
            </button>
            <button onClick={() => run.go(st.idx + 1)} className="rotate-180 rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Пропустить"><ChevronLeft size={28} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// the finished run's week for the areas it stretched
function RunWeek({ stretch, exMap, ws, only }) {
  const { areas, days } = stretchWeek(stretch, ws);
  if (!only.some((a) => areas[a])) return null;
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-semibold">Неделя</div>
        <div className="text-xs text-neutral-400">дней с растяжкой: {days} из 5</div>
      </div>
      <StretchBreakdown areas={areas} only={only} week exMap={exMap} byNote="за неделю" />
    </div>
  );
}
