// Bottom tab bar: icons only (a word under them said less than the icon and not always the truth); the name is the
// button's aria-label. A sideways swipe on it switches strength <-> stretching.
import { Dumbbell, History, Settings, Ruler, PersonStanding } from "lucide-react";
import { useFlick } from "../ui/gestures.js";

const TABS = [
  ["workout", "Тренировка", Dumbbell],
  ["history", "История", History],
  ["measures", "Замеры", Ruler],
  ["settings", "Настройки", Settings],
];

// the current tab stays lit on its detail screens too; tapping it again goes back to its top
// running: a session goes on in this mode (a strength workout / a stretching run) — a dot on «Тренировка»; pulse: the
// tab the tour is showing (its icon gets a pulsing ring)
export function TabBar({ tab, onTab, onSwipe, stretchMode, running, pulse }) {
  const flick = useFlick(onSwipe);
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black" {...flick}>
      <div className="mx-auto flex max-w-md">
        {TABS.map(([k, label, Icon0]) => {
          const Icon = k === "workout" && stretchMode ? PersonStanding : Icon0;
          return (
            <button key={k} onClick={() => onTab(k)} aria-label={label} aria-current={tab === k ? "page" : undefined}
              className={`relative flex flex-1 items-center justify-center py-3.5 ${tab === k ? "text-accent-400" : "text-neutral-500"}`}>
              <Icon size={24} />
              {k === pulse && <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full ring-2 ring-accent-400" />}
              {k === "workout" && running && <span className="absolute right-[calc(50%-18px)] top-2.5 h-2 w-2 rounded-full bg-accent-400" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
