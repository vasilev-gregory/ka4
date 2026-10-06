// Rest countdown, a strip above the tab bar: 3-2-1 clicks and a signal at the end (ui/useCountdownSignals), ±15 s,
// "enough". In stretching mode it says it's the strength rest.
import { useEffect, useEffectEvent } from "react";
import { fmtDur } from "../../core/util.js";
import { adjustRest, clearRest } from "../../model/workoutActions.js";
import { FloatingBar, useNow } from "../../ui/kit.jsx";
import { useCountdownSignals } from "../../ui/useCountdownSignals.js";

// endsAt: when the rest ends; total: its length, s; label: what the strip is called
export function RestBar({ endsAt, total, up, sound, label = "Отдых" }) {
  const now = useNow(200, true);
  const left = endsAt - now;
  const done = left <= 0;
  // a blip when a rest starts, the long signal when it is over
  useCountdownSignals({ key: done ? "done" : "rest", at: done ? endsAt : endsAt - total * 1000, signal: done ? "beep" : "blip", left, running: !done, sound });
  const dismiss = useEffectEvent(() => up(clearRest));
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(dismiss, 2500);
    return () => clearTimeout(t);
  }, [done, endsAt]);
  return (
    <FloatingBar accent={done} progress={(left / (total * 1000)) * 100}>
      <div className="flex-1">
        <div className="text-xs text-neutral-600">{done ? "Время подхода" : label}</div>
        <div className="text-2xl font-bold tabular-nums">{done ? "0:00" : fmtDur(left + 999)}</div>
      </div>
      <button onClick={() => up((d) => adjustRest(d, -15))} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">−15</button>
      <button onClick={() => up((d) => adjustRest(d, 15))} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">+15</button>
      <button onClick={() => up(clearRest)} className="rounded-lg bg-black px-3 py-2 font-semibold text-neutral-100">Хватит</button>
    </FloatingBar>
  );
}
