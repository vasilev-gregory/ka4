// One set: number (tap = warm-up, hold = select), the enabled columns, and ✓ with the rest time inside; with RIR on, hold
// ✓ and slide: done with a RIR (RirDial), and a done ✓ shows it — RIR has no column of its own.
// The row swipes: right = done / undone, left = delete.
import { useEffect, useRef } from "react";
import { Check, Play, Trophy } from "lucide-react";
import { fmtDur, numericInput } from "../../core/util.js";
import { setKind } from "../../model/workout.js";
import { useNow } from "../../ui/kit.jsx";
import { useRirDial } from "./RirDial.jsx";

// how a set is marked (model setKind): a warm-up in blue, a working set in the accent, one to failure in its own colour
const DONE_TEXT = { warmup: "text-sky-300", work: "text-accent-300", fail: "text-fail" };
const DONE_CHECK = { warmup: "bg-sky-400 text-neutral-900", work: "bg-accent-400 text-neutral-900", fail: "bg-fail text-neutral-900" };
const DONE_LABEL = { warmup: "text-sky-400", work: "text-accent-400", fail: "text-fail" };

const BOX = "rounded-lg bg-black px-1 py-2.5 text-center text-base tabular-nums outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400";

// on focus the value is selected, so typing replaces it; an empty field with last time's value takes it first
const takeHint = (value, hint, key, edit) => (e) => {
  const el = e.target;
  if (value === "" && hint) edit({ [key]: String(hint) });
  else if (value === "") return;
  requestAnimationFrame(() => el.select());
};

function Cell({ col, s, ex, edit }) {
  const doneText = s.done ? DONE_TEXT[setKind(s)] : "";
  if (col === "w") return (
    <input value={s.w} placeholder={s.hw || ""} inputMode="decimal" onFocus={takeHint(s.w, s.hw, "w", edit)}
      onChange={(e) => edit({ w: numericInput(e.target.value, true) })} className={`min-w-0 flex-1 ${BOX} ${doneText}`} />
  );
  if (col === "r") return (
    <input value={s.r} placeholder={s.hr || ""} inputMode={ex.kind === "cardio" ? "decimal" : "numeric"} onFocus={takeHint(s.r, s.hr, "r", edit)}
      onChange={(e) => edit({ r: numericInput(e.target.value, ex.kind === "cardio") })} className={`min-w-0 flex-1 ${BOX} ${doneText}`} />
  );
  return ex.kind === "time" ? <span className="w-9" /> : (
    <input value={s.p || ""} inputMode="numeric" placeholder="+" aria-label="Частичные повторы" onFocus={takeHint(s.p || "", "", "p", edit)}
      onChange={(e) => edit({ p: numericInput(e.target.value, false) })} className={`w-9 ${BOX} ${doneText || "text-neutral-300"}`} />
  );
}

// label: "1", "2a", …; rest: ms before this set or "drop"; live: the running stopwatch is here (ms so far);
// record: this set beat the exercise's best estimated 1RM; rir(n): done with RIR n (the dial on ✓)
// timer(): cardio's ▶ — a stopwatch on the set; its ✓ stops it and writes the minutes (model cardioActions)
export function SetRow({ s, ex, cols, rirOn, label, grouped, selected, rest, live: rested, record, swipe, swipeProps, numberProps, edit, toggle, rir, timer }) {
  const running = !!s.from && !s.done;
  const now = useNow(1000, running);
  const live = running ? Math.max(0, now - s.from) : rested; // the cardio stopwatch, else the rest one
  const dial = useRirDial({ onTap: toggle, onPick: rir, enabled: rirOn && s.t !== "w" });
  const rirLabel = rirOn && s.done && s.rir != null ? (s.rir === 4 ? "4+" : String(s.rir)) : null;
  const shownRest = rest === "drop" || rest >= 1000 ? rest : null; // under a second (warm-up closed by this tick): nothing to show
  // a short flash when the set gets confirmed (phones without vibration still notice)
  const rowRef = useRef(null);
  const wasDone = useRef(s.done);
  useEffect(() => {
    if (s.done && !wasDone.current && rowRef.current && rowRef.current.animate) {
      rowRef.current.animate([{ backgroundColor: "var(--color-accent-400)" }, { backgroundColor: "transparent" }], { duration: 450, easing: "ease-out" });
    }
    wasDone.current = s.done;
  }, [s.done]);
  return (
    <div ref={rowRef} className={`relative overflow-hidden rounded-lg ${grouped ? "mt-0.5" : "mt-1.5"}`}>
      {swipe && (
        <div className={`absolute inset-0 flex items-center px-4 text-xs font-semibold ${swipe.dx > 0 ? "justify-start bg-neutral-600 text-white" : "justify-end bg-red-600 text-white"}`}>
          {swipe.dx > 0 ? (selected ? "Снять выбор" : "Выбрать") : "Удалить"}
        </div>
      )}
      <div {...swipeProps}
        style={{ touchAction: "pan-y", transform: swipe ? `translateX(${swipe.dx}px)` : undefined, transition: swipe ? "none" : "transform 150ms" }}
        className={`relative flex items-center gap-1 rounded-lg border-l-2 px-1 ${s.g ? "border-accent-400" : "border-transparent"} ${selected ? "bg-neutral-700" : "bg-neutral-900"}`}>
        <button {...numberProps} aria-label="Подход: тап — разминка, удержание — выбрать"
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          className={`flex h-11 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${selected ? "bg-accent-400 text-black" : "bg-black"}`}>
          <span className={selected ? "" : s.t === "w" || s.done ? DONE_LABEL[setKind(s)] : "text-neutral-500"}>{s.t === "w" ? "Р" : label}</span>
        </button>
        {cols.map((c) => <Cell key={c} col={c} s={s} ex={ex} edit={edit} />)}
        {timer && !s.done && !running && (
          <button onClick={timer} aria-label="Засечь время" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-accent-400">
            <Play size={18} />
          </button>
        )}
        <button {...dial.bind} aria-label="Подход сделан" style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          className={`relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none ${
            s.done ? DONE_CHECK[setKind(s)] : live != null ? "bg-neutral-800 text-accent-400" : "bg-neutral-800 text-neutral-400"}`}>
          {live != null ? (
            <span className="text-xs font-semibold tabular-nums">{fmtDur(live)}</span>
          ) : (
            <>
              {rirLabel ? <span className="text-sm font-bold" aria-label={`RIR ${rirLabel}`}>{rirLabel}</span> : <Check size={s.done && shownRest ? 16 : 20} />}
              {s.done && shownRest && <span className="mt-0.5 text-[9px] font-semibold tabular-nums">{rest === "drop" ? "↳" : fmtDur(rest)}</span>}
            </>
          )}
          {record && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-accent-400" aria-label="Рекорд">
              <Trophy size={10} />
            </span>
          )}
        </button>
      </div>
      {dial.dial}
    </div>
  );
}
