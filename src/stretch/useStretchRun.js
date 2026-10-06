// The clock of one stretching run over a timeline of phases: moves to the next phase when the current one runs
// out, clicks 3-2-1, signals phase changes, pauses, counts the seconds held (a skipped phase gives none), and
// carries on in a new timeline when the program is edited mid-run.
import { useState, useEffect, useEffectEvent, useRef } from "react";
import { beep, blip, tick } from "../core/sound.js";
import { countsHold } from "../model/stretch.js";

// the same step of a timeline: kind and stretch; the same phase: and the side too
const sameStep = (a, b) => !!a && !!b && a.k === b.k && (a.ex && a.ex.id) === (b.ex && b.ex.id);
const samePhase = (a, b) => sameStep(a, b) && a.side === b.side;

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
    if (!countsHold(ph)) return;
    const spent = Math.min(ph.dur, Math.max(0, (Date.now() - phaseStart.current - pausedMs.current) / 1000));
    held.current[ph.ex.id] = (held.current[ph.ex.id] || 0) + Math.round(spent);
  };
  const finish = () => {
    const finishedAt = Date.now();
    setSt((s) => ({ ...s, done: true, finishedAt }));
    if (sound) beep();
    onFinish({ work: { ...held.current }, startedAt: st.startedAt, finishedAt });
  };
  // to phase i; ranOut: the current phase ran its time (it counts), else it was skipped / gone back from (it doesn't)
  const go = (i, ranOut = false) => {
    if (i < 0) i = 0;
    if (ranOut) creditPhase();
    phaseStart.current = Date.now();
    pausedMs.current = 0;
    if (i >= tl.length) { finish(); return; }
    setSt((s) => ({ ...s, idx: i, end: Date.now() + tl[i].dur * 1000, pausedLeft: null }));
    phaseSound(tl[i]);
  };
  const onTick = useEffectEvent(() => {
    const n = Date.now();
    setNow(n);
    if (n >= st.end) { go(st.idx + 1, true); return; }
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
  // The program was edited mid-run: carry on in the new timeline from the same phase (the same stretch, kind and
  // side, its n-th occurrence), else the same step without the side (sides switched on / off), else that stretch's
  // first phase, else the same position. The same step keeps its clock; a new length of it moves its end.
  const replace = (next) => {
    if (st.done) return;
    if (!next.length) { creditPhase(); setTl(next); finish(); return; }
    const cur = tl[st.idx];
    const nth = tl.slice(0, st.idx).filter((x) => samePhase(x, cur)).length;
    let i = next.findIndex((x, j) => samePhase(x, cur) && next.slice(0, j).filter((y) => samePhase(y, cur)).length === nth);
    if (i < 0) i = next.findIndex((x) => sameStep(x, cur));
    if (i < 0 && cur.ex) i = next.findIndex((x) => x.ex && x.ex.id === cur.ex.id);
    if (i < 0) i = Math.min(st.idx, next.length - 1);
    const dd = sameStep(next[i], cur) ? (next[i].dur - cur.dur) * 1000 : null;
    setTl(next);
    if (dd == null) { // another phase now: it starts afresh
      creditPhase();
      phaseStart.current = Date.now();
      pausedMs.current = 0;
      setSt((s) => ({ ...s, idx: i, end: Date.now() + next[i].dur * 1000, pausedLeft: s.pausedLeft != null ? next[i].dur * 1000 : null }));
    } else {
      setSt((s) => ({ ...s, idx: i, ...(s.pausedLeft != null ? { pausedLeft: Math.max(0, s.pausedLeft + dd) } : { end: s.end + dd }) }));
    }
  };
  // stopping early: what was held so far
  const stop = () => { creditPhase(); return { work: { ...held.current }, startedAt: st.startedAt, finishedAt: Date.now() }; };

  return { tl, st, left, phase: tl[st.idx], go, togglePause, setPhaseLength, extend, replace, stop };
}
