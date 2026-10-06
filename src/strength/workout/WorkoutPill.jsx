// The strength workout going on, seen from anywhere else (another tab, a card, the stretching mode): a pill in the
// corner with its time (ui/kit SessionPill); a tap goes back to it.
import { fmtDur } from "../../core/util.js";
import { durations } from "../../model/workout.js";
import { SessionPill, useNow } from "../../ui/kit.jsx";

export function WorkoutPill({ active, onOpen }) {
  const now = useNow(1000, !active.paused);
  return (
    <SessionPill mode="strength" label={active.paused ? "Тренировка, пауза" : "Тренировка"} time={fmtDur(durations(active, now).main)}
      onClick={onOpen} ariaLabel="Вернуться к тренировке" />
  );
}
