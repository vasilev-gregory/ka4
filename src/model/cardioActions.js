// Cardio's stopwatch on a set: ▶ starts it (set.from), ✓ stops it and writes the minutes it ran (toggleSet). The
// minutes can still be typed instead, for a session done away from the phone.
import { fmtNum } from "../core/util.js";

export function startCardioTimer(d, ei, si, now = Date.now()) {
  const s = d.active.exercises[ei].sets[si];
  if (!s.done) s.from = now;
}

// minutes since `from`, to a tenth ("12.5"); at least 0.1 so a started set never reads as empty
export const minutesSince = (from, now) => fmtNum(Math.max(0.1, Math.round((now - from) / 6000) / 10));
