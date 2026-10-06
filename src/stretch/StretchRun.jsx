// The stretching run going on (data.stretch.active), wherever the app is: its clock (phases run out, 3-2-1
// clicks, a signal on each new phase, the screen kept on) and either the player or, folded, a strip above the
// tab bar (system back folds it too). Always in the stretching colours, whatever the mode.
import { useEffect, useEffectEvent, useRef } from "react";
import { beep, blip, tick } from "../core/sound.js";
import { addRunRound, adjustRunPhase, closeRun, goToPhase, keepQuickProgram, runState, syncRun, tickRun, togglePauseRun } from "../model/stretchRunActions.js";
import { useNow } from "../ui/kit.jsx";
import { useWakeLock } from "../ui/useWakeLock.js";
import { StretchMiniBar, StretchPlayer } from "./StretchPlayer.jsx";

// open / setOpen: the player unfolded or folded (kept by the app, so a new run opens it)
export function StretchRun({ stretch, upStretch, sound, open, setOpen, settings }) {
  if (!stretch.active) return null;
  return <ActiveRun stretch={stretch} upStretch={upStretch} sound={sound} open={open} setOpen={setOpen} settings={settings} />;
}

function ActiveRun({ stretch, upStretch, sound, open, setOpen, settings }) {
  const a = stretch.active;
  const running = !a.done && a.pausedLeft == null;
  const now = useNow(200, running);
  const run = runState(stretch, now);
  useWakeLock(running);

  // the clock writes only when something changes: a phase ran out, or the program changed under the run
  const due = running && now >= a.end;
  const advance = useEffectEvent(() => upStretch((s) => (due ? tickRun(s, Date.now()) : syncRun(s, Date.now()))));
  useEffect(() => { if (due || run.stale) advance(); }, [due, run.stale, now]);

  // a signal on every new phase (a long one when work starts or the run ends), 3-2-1 clicks before the end
  const phaseKey = a.done ? "done" : `${run.idx}:${a.end}`;
  const first = useRef(true);
  const onPhase = useEffectEvent(() => {
    if (first.current) { first.current = false; return; } // not when the app reopens on a run
    if (!sound) return;
    if (a.done || (run.phase && run.phase.k === "work")) beep(); else blip();
  });
  useEffect(() => { onPhase(); }, [phaseKey]);
  const ticked = useRef(new Set());
  const sec = Math.ceil(run.left / 1000);
  const onSecond = useEffectEvent(() => {
    const k = `${phaseKey}:${sec}`;
    if (!sound || !running || sec > 3 || sec < 1 || ticked.current.has(k)) return;
    ticked.current.add(k);
    tick();
  });
  useEffect(() => { onSecond(); }, [sec]);

  // the system back gesture folds the player (one history entry while it is unfolded), it never ends the run
  const fold = useEffectEvent(() => setOpen(false));
  useEffect(() => {
    if (!open) return;
    history.pushState({ ...history.state, overlay: true }, "");
    const onPop = () => fold();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (history.state && history.state.overlay) history.back(); // folded or closed from the screen: drop the entry
    };
  }, [open]);

  const act = {
    skip: () => upStretch((s) => goToPhase(s, run.idx + 1, Date.now())),
    back: () => upStretch((s) => goToPhase(s, run.idx - 1, Date.now())),
    pause: () => upStretch((s) => togglePauseRun(s, Date.now())),
    adjust: (d) => upStretch((s) => adjustRunPhase(s, d, Date.now())),
    addRound: () => upStretch(addRunRound),
    close: () => { upStretch((s) => closeRun(s, Date.now())); setOpen(true); },
    keep: () => upStretch(keepQuickProgram),
    fold: () => setOpen(false),
    unfold: () => setOpen(true),
  };
  return (
    <div className="mode-stretch">
      {open ? <StretchPlayer stretch={stretch} upStretch={upStretch} run={run} act={act} settings={settings} />
        : <StretchMiniBar run={run} act={act} />}
    </div>
  );
}
