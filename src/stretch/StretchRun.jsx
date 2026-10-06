// The stretching run going on (data.stretch.active), wherever the app is: its clock (phases run out, 3-2-1
// clicks, a signal on each new phase, the screen kept on) and either the player or, folded, a strip above the
// tab bar (system back folds it too). Always in the stretching colours, whatever the mode.
import { useEffect, useEffectEvent } from "react";
import { createPortal } from "react-dom";
import { useBackCloses } from "../ui/navigation.js";
import { addRunRound, adjustRunPhase, closeRun, discardRun, goToPhase, keepQuickProgram, runState, syncRun, tickRun, togglePauseRun } from "../model/stretchRunActions.js";
import { useNow } from "../ui/kit.jsx";
import { useWakeLock } from "../ui/useWakeLock.js";
import { useCountdownSignals } from "../ui/useCountdownSignals.js";
import { StretchMiniBar, StretchPlayer } from "./StretchPlayer.jsx";

// open / setOpen: the player unfolded or folded (kept with the run: stretchRunActions.setRunFolded)
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

  // a signal on every new phase (the long one when work starts or the run ends), 3-2-1 clicks before its end
  const work = a.done || (run.phase && run.phase.k === "work");
  useCountdownSignals({ key: a.done ? "done" : a.entered, at: a.done ? a.finishedAt : a.end - a.dur * 1000, signal: work ? "beep" : "blip",
    left: run.left, running, sound });

  // the system back gesture folds the player, it never ends the run
  useBackCloses(() => setOpen(false), open);

  const act = {
    skip: () => upStretch((s) => goToPhase(s, run.idx + 1, Date.now())),
    back: () => upStretch((s) => goToPhase(s, run.idx - 1, Date.now())),
    pause: () => upStretch((s) => togglePauseRun(s, Date.now())),
    adjust: (d) => upStretch((s) => adjustRunPhase(s, d, Date.now())),
    addRound: () => upStretch(addRunRound),
    close: () => upStretch((s) => closeRun(s, Date.now())),
    discard: () => upStretch(discardRun),
    keep: () => upStretch(keepQuickProgram),
    fold: () => setOpen(false),
    unfold: () => setOpen(true),
  };
  // the player covers everything, so it goes to the top of the page (not inside the strips' stack)
  return open ? createPortal(<div className="mode-stretch"><StretchPlayer stretch={stretch} upStretch={upStretch} run={run} act={act} settings={settings} /></div>, document.body)
    : <div className="mode-stretch"><StretchMiniBar run={run} act={act} /></div>;
}
