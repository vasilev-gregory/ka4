// The stretching run on the whole screen: big countdown, what's now / next and what it stretches (a small body
// map), ±5 s (saved in the program), + round (this run only), pause / back / skip, the program's settings over
// the player, results at the end. A pull down (or the chevron) folds it away; the run itself lives in the data
// (model/stretchRunActions) and its clock in StretchRun.
import { useState } from "react";
import { X, ChevronLeft, ChevronDown, Settings } from "lucide-react";
import { fmtDur, progTitle, weekStartOf } from "../core/util.js";
import { AREA_PARTS, PHASE, areaOf, stExMap, stretchWeek } from "../model/stretch.js";
import { QUICK, findProgram } from "../model/stretchActions.js";
import { BodyMap } from "../ui/BodyMap.jsx";
import { Button, ConfirmButton, ExImg, FloatingBar, ProgressBar, exPhoto, useApp } from "../ui/kit.jsx";
import { usePullDown } from "../ui/gestures.js";
import { StretchBreakdown } from "./StretchBreakdown.jsx";
import { StretchEditor } from "./StretchEditor.jsx";

// run: runState(); act: { skip, back, pause, adjust(delta), addRound, close, discard, keep (a quick run as a program), fold }
export function StretchPlayer({ stretch, upStretch, run, act, settings }) {
  const { nm1 } = useApp();
  const [overlay, setOverlay] = useState(null); // "program" | "app"
  const pull = usePullDown(act.fold);
  const { a, tl, idx, phase: ph, left } = run;
  const p = findProgram(stretch, a.programId);
  const exMap = stExMap(stretch);

  // during rest the screen is about what's coming, not what just ended
  const resting = ph && (ph.k === "rest" || ph.k === "roundRest");
  const shownIdx = resting ? tl.findIndex((x, i) => i > idx && x.ex) : idx;
  const shownEx = shownIdx >= 0 && tl[shownIdx] ? tl[shownIdx].ex : null;
  const next = shownEx ? tl.slice(Math.max(shownIdx, idx) + 1).find((x) => x.ex && x.ex.id !== shownEx.id) : null;
  const pct = ph ? Math.max(0, Math.min(100, 100 - (left / (ph.dur * 1000)) * 100)) : 100;
  const isWork = ph && ph.k === "work";
  const parts = shownEx ? AREA_PARTS[areaOf(shownEx)] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }} {...pull}>
      {overlay && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto max-w-md">
            {overlay === "app" ? settings(() => setOverlay("program"))
              : <StretchEditor stretch={stretch} upStretch={upStretch} id={a.programId} back={() => setOverlay(null)} inRun onAppSettings={settings && (() => setOverlay("app"))} />}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between p-4">
        <div className="flex min-w-0 items-center gap-1">
          <button onClick={act.fold} className="-ml-2 p-2 text-neutral-400" aria-label="Свернуть"><ChevronDown size={24} /></button>
          <div className="min-w-0">
            <div className="truncate text-sm text-neutral-400">{progTitle(p || {}, "Растяжка")}</div>
            {!a.done && <div className="text-xs text-neutral-600">{idx + 1} / {tl.length}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!a.done && <button onClick={act.addRound} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300">+ круг</button>}
          {!a.done && p && <button onClick={() => setOverlay("program")} className="p-2 text-neutral-400" aria-label="Настройки"><Settings size={22} /></button>}
          <button onClick={act.close} className="p-2 text-neutral-400" aria-label="Закрыть"><X size={24} /></button>
        </div>
      </div>

      {a.done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
          <div className="text-3xl font-bold text-accent-300">Готово</div>
          <div className="text-neutral-400">{fmtDur(a.finishedAt - a.startedAt)}</div>
          <div className="w-full max-w-md text-left">
            <RunWeek stretch={stretch} exMap={exMap} ws={weekStartOf(a.finishedAt)} only={[...new Set(tl.filter((x) => x.ex).map((x) => areaOf(x.ex)))]} />
          </div>
          {a.programId === QUICK && !a.savedAs && (
            <Button variant="quiet" onClick={act.keep} className="px-6">Сохранить как программу</Button>
          )}
          {a.savedAs && <div className="text-sm text-accent-300">Сохранено в программах</div>}
          <Button onClick={act.close} className="mt-2 px-8">Закрыть</Button>
        </div>
      ) : ph && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className={`mb-3 rounded-full px-4 py-1 text-sm font-semibold ${isWork ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {PHASE[ph.k]}
            </div>
            {resting && shownEx && <div className="mb-1 text-sm text-neutral-500">Следующая</div>}
            <div className="flex items-center gap-3">
              {shownEx && exPhoto(shownEx) && <ExImg ex={shownEx} size={140} />}
              {parts.length > 0 && (
                <div className="flex flex-col items-center">
                  <BodyMap parts={parts} fill={Object.fromEntries(parts.map((m) => [m, 1]))} color="fill-accent-400" small title="Что тянется" />
                  <div className="mt-1 text-[11px] text-accent-300">{areaOf(shownEx)}</div>
                </div>
              )}
            </div>
            {shownEx && <div className="mt-2 text-2xl font-bold">{nm1(shownEx)}</div>}
            {ph.side && <div className="mt-1 text-base text-accent-300">{ph.side}</div>}
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => act.adjust(-5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">−5</button>
              <div className={`text-8xl font-bold tabular-nums ${isWork ? "text-accent-300" : "text-neutral-200"}`}>
                {fmtDur(Math.max(0, left) + 999)}
              </div>
              <button onClick={() => act.adjust(5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">+5</button>
            </div>
            <div className="mt-1 text-[11px] text-neutral-600">
              {ph.k === "roundRest" ? "±5 — отдых между кругами в программе" : `±5 — ${PHASE[ph.k].toLowerCase()} для этой растяжки, сохранится в программе`}
            </div>
            <div className="mt-6 w-full max-w-sm"><ProgressBar pct={pct} barClassName={isWork ? "bg-accent-400" : "bg-neutral-500"} /></div>
            {next && next.ex && <div className="mt-4 text-sm text-neutral-500">Дальше: {nm1(next.ex)}</div>}
            <div className="mt-3 text-[11px] text-neutral-700">Потяни вниз — свернуть</div>
          </div>
          <div className="flex items-center justify-center gap-6 p-6">
            <button onClick={act.back} className="rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Назад"><ChevronLeft size={28} /></button>
            <button onClick={act.pause} className="rounded-full bg-accent-400 px-8 py-5 text-lg font-semibold text-black">
              {a.pausedLeft != null ? "Продолжить" : "Пауза"}
            </button>
            <button onClick={act.skip} className="rotate-180 rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Пропустить"><ChevronLeft size={28} /></button>
          </div>
          {a.pausedLeft != null && (
            <div className="-mt-3 flex flex-col items-center gap-1 pb-5">
              <button onClick={act.close} className="py-1 text-sm text-neutral-300">Завершить — сохранится то, что успел</button>
              <ConfirmButton onConfirm={act.discard} confirmText="Не сохранять?" className="py-1 text-sm text-neutral-500"
                armedClassName="rounded-lg bg-red-600 px-4 py-1 text-sm text-white">Отменить</ConfirmButton>
            </div>
          )}
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

// The folded run: a strip above the tab bar with the phase, the countdown and pause; a tap opens the player.
export function StretchMiniBar({ run, act }) {
  const { nm1 } = useApp();
  const { a, phase: ph, left } = run;
  const ex = ph && ph.ex;
  return (
    <FloatingBar>
      <button onClick={act.unfold} className="min-w-0 flex-1 text-left" aria-label="Развернуть растяжку">
        <div className="truncate text-xs text-neutral-600">{a.done ? "Растяжка закончена" : `${ph ? PHASE[ph.k] : ""}${ex ? ` · ${nm1(ex)}` : ""}`}</div>
        <div className="text-xl font-bold tabular-nums">{a.done ? "Готово" : fmtDur(Math.max(0, left) + 999)}</div>
      </button>
      {!a.done && <Button size="xs" onClick={act.pause}>{a.pausedLeft != null ? "Продолжить" : "Пауза"}</Button>}
    </FloatingBar>
  );
}
