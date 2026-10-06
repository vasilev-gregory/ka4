// The signals of a countdown, the same for the rest timer and the stretching phases: a signal when a new stretch
// of time begins (beep + long vibration = "time to act", blip = "a pause starts"), 3-2-1 clicks before its end.
// Quiet when the app is opened long after the moment (no beeping for something that happened while away).
import { useEffect, useEffectEvent, useRef } from "react";
import { beep, blip, tick, vibrate, VIBRATE_ACT } from "../core/sound.js";

const STALE = 5000; // a signal more than this late isn't given

// key: changes once per new stretch of time (not on pause or ±5); at: when it began (ms); signal: "beep" | "blip" |
// null; left: ms to its end; running: counting down (not paused); sound: the setting
export function useCountdownSignals({ key, at, signal, left, running, sound }) {
  const onKey = useEffectEvent(() => {
    if (!signal || Date.now() - at > STALE) return;
    if (signal === "beep") vibrate(VIBRATE_ACT);
    if (!sound) return;
    if (signal === "beep") beep(); else blip();
  });
  useEffect(() => { onKey(); }, [key]);
  const ticked = useRef(new Set());
  const sec = Math.ceil(left / 1000);
  const onSecond = useEffectEvent(() => {
    const k = `${key}:${sec}`;
    if (!sound || !running || sec > 3 || sec < 1 || ticked.current.has(k)) return;
    ticked.current.add(k);
    tick();
  });
  useEffect(() => { onSecond(); }, [sec]);
}
