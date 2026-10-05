// The clock of one stretching run over a timeline of phases: moves to the next phase when the current
// one runs out, clicks 3-2-1, signals phase changes, pauses, and counts the seconds actually held.
import { useState, useEffect, useEffectEvent, useRef } from "react";
import { beep, blip, tick } from "../core/sound.js";

export function useStretchRun(initialTimeline, { sound, onFinish }) {
  const [tl, setTl] = useState(initialTimeline);
  const [st, setSt] = useState(() => {
    const t0 = Date.now();
    return { idx: 0, end: t0 + ((tl[0] && tl[0].dur) || 0) * 1000, pausedLeft: null, startedAt: t0, done: tl.length === 0, finishedAt: t0 };
  });
  const [now, setNow] = useState(() => Date.now());
  const running = !st.done && st.pausedLeft == null;
  const left = st.pausedLeft != null ? st.pausedLeft : st.end - now;
  const ticked = useRef(new Set());
  const held = useRef({}); // exerciseId -> seconds held (per side)
  const phaseStart = useRef(st.startedAt);
  const pausedMs = useRef(0);
  const pauseAt = useRef(0);

  const phaseSound = (ph) => { if (!sound || !ph) return; if (ph.k === "work") beep(); else blip(); };
  const onStart = useEffectEvent(() => phaseSound(tl[0]));
  useEffect(() => { onStart(); }, []);

  // credit the time actually spent in the current work phase before leaving it
  const creditPhase = () => {
    const ph = tl[st.idx];
    if (!ph || ph.k !== "work" || ph.side === "правая сторона") return;
    const spent = Math.min(ph.dur, Math.max(0, (Date.now() - phaseStart.current - pausedMs.current) / 1000));
    held.current[ph.ex.id] = (held.current[ph.ex.id] || 0) + Math.round(spent);
  };
  const go = (i) => {
    if (i < 0) i = 0;
    creditPhase();
    phaseStart.current = Date.now();
    pausedMs.current = 0;
    if (i >= tl.length) {
      const finishedAt = Date.now();
      setSt((s) => ({ ...s, done: true, finishedAt }));
      if (sound) beep();
      onFinish({ work: { ...held.current }, startedAt: st.startedAt, finishedAt });
      return;
    }
    setSt((s) => ({ ...s, idx: i, end: Date.now() + tl[i].dur * 1000, pausedLeft: null }));
    phaseSound(tl[i]);
  };
  const onTick = useEffectEvent(() => {
    const n = Date.now();
    setNow(n);
    if (n >= st.end) { go(st.idx + 1); return; }
    const sec = Math.ceil((st.end - n) / 1000);
    const k = `${st.idx}:${sec}`;
    if (!sound || sec > 3 || ticked.current.has(k)) return;
    ticked.current.add(k);
    tick();
  });
  useEffect(() => {
    if (!running) return;
    const t = setInterval(onTick, 200);
    return () => clearInterval(t);
  }, [running]);

  const togglePause = () => {
    if (st.pausedLeft != null) pausedMs.current += Date.now() - pauseAt.current; else pauseAt.current = Date.now();
    setSt((s) => (s.pausedLeft != null ? { ...s, end: Date.now() + s.pausedLeft, pausedLeft: null } : { ...s, pausedLeft: Math.max(0, s.end - Date.now()) }));
  };
  // the current phase (and the same phase later in this run) gets a new length
  const setPhaseLength = (seconds) => {
    const cur = tl[st.idx];
    const dd = seconds - cur.dur;
    setTl((t) => t.map((x, i) => (i >= st.idx && x.k === cur.k && (cur.k === "roundRest" || x.ex === cur.ex) ? { ...x, dur: seconds } : x)));
    setSt((s) => (s.pausedLeft != null ? { ...s, pausedLeft: Math.max(0, s.pausedLeft + dd * 1000) } : { ...s, end: s.end + dd * 1000 }));
  };
  const extend = (phases) => setTl((t) => [...t, ...phases]);
  // stopping early: what was held so far
  const stop = () => { creditPhase(); return { work: { ...held.current }, startedAt: st.startedAt, finishedAt: Date.now() }; };

  return { tl, st, left, phase: tl[st.idx], go, togglePause, setPhaseLength, extend, stop };
}
