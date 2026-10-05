// Rest countdown above the tab bar: 3-2-1 clicks, a signal at the end, ±15 s, "enough".
import { useEffect, useEffectEvent, useRef } from "react";
import { beep, blip, tick } from "../../core/sound.js";
import { fmtDur } from "../../core/util.js";
import { adjustRest, clearRest } from "../../model/workoutActions.js";
import { useNow } from "../../ui/kit.jsx";

export function RestBar({ endsAt, total, up, sound }) {
  const now = useNow(200, true);
  const left = endsAt - now;
  const done = left <= 0;
  const fired = useRef(null);
  const ticked = useRef(new Set());
  // a bar that just appeared for a fresh rest (not one restored after a reload) gives a short blip
  const onShow = useEffectEvent(() => { if (sound && endsAt - Date.now() > total * 1000 - 1500) blip(); });
  useEffect(() => { onShow(); }, []);
  const secLeft = Math.ceil(left / 1000);
  const onSecond = useEffectEvent((sec) => {
    if (!sound || sec > 3 || ticked.current.has(sec)) return;
    ticked.current.add(sec);
    tick();
  });
  useEffect(() => { if (!done) onSecond(secLeft); }, [secLeft, done]);
  const onDone = useEffectEvent(() => {
    if (fired.current === endsAt) return;
    fired.current = endsAt;
    if (Date.now() - endsAt < 5000) { // not when the app reopens long after the rest ended
      if (sound) beep();
      try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
    }
  });
  const dismiss = useEffectEvent(() => up(clearRest));
  useEffect(() => {
    if (!done) return;
    onDone();
    const t = setTimeout(dismiss, 2500);
    return () => clearTimeout(t);
  }, [done, endsAt]);
  const pct = Math.min(100, Math.max(0, (left / (total * 1000)) * 100));

  return (
    <div className="above-nav fixed inset-x-0 z-40 px-3">
      <div className={`mx-auto max-w-md overflow-hidden rounded-2xl shadow-lg ${done ? "bg-accent-400 text-neutral-900" : "bg-neutral-100 text-neutral-900"}`}>
        <div className="h-1.5 bg-neutral-300"><div className="h-full bg-accent-500" style={{ width: `${pct}%`, transition: "width 250ms linear" }} /></div>
        <div className="flex items-center gap-2 p-3">
          <div className="flex-1">
            <div className="text-xs text-neutral-600">{done ? "Время подхода" : "Отдых"}</div>
            <div className="text-2xl font-bold tabular-nums">{done ? "0:00" : fmtDur(left + 999)}</div>
          </div>
          <button onClick={() => up((d) => adjustRest(d, -15))} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">−15</button>
          <button onClick={() => up((d) => adjustRest(d, 15))} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">+15</button>
          <button onClick={() => up(clearRest)} className="rounded-lg bg-black px-3 py-2 font-semibold text-neutral-100">Хватит</button>
        </div>
      </div>
    </div>
  );
}
