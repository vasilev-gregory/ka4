// Bottom tab bar. A sideways swipe on it switches strength <-> stretching.
import { Dumbbell, History, Settings, Ruler, PersonStanding } from "lucide-react";
import { useFlick } from "../ui/gestures.js";

const TABS = [
  ["workout", "Тренировка", Dumbbell],
  ["history", "История", History],
  ["measures", "Замеры", Ruler],
  ["settings", "Настройки", Settings],
];

// the current tab stays lit on its detail screens too; tapping it again goes back to its top
// running: a session goes on in this mode (a strength workout / a stretching run) — a dot on «Тренировка»
export function TabBar({ tab, onTab, onSwipe, stretchMode, running }) {
  const flick = useFlick(onSwipe);
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black" {...flick}>
      <div className="mx-auto flex max-w-md">
        {TABS.map(([k, label, Icon0]) => {
          const Icon = k === "workout" && stretchMode ? PersonStanding : Icon0;
          return (
            <button key={k} onClick={() => onTab(k)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${tab === k ? "text-accent-400" : "text-neutral-500"}`}>
              <Icon size={20} />
              {label}
              {k === "workout" && running && <span className="absolute right-1/4 top-1.5 h-2 w-2 rounded-full bg-accent-400" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
