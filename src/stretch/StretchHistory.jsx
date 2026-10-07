// Stretching history: the shared calendar (ui/PeriodNav), the period's areas (StretchPanel, the same block as in a
// run's card) and the runs — on a day with their stretches, as in the run's card (a tap opens the card).
import { inPeriod } from "../model/calendar.js";
import { sessionSummary } from "../model/stretch.js";
import { Header } from "../ui/kit.jsx";
import { HistoryRow } from "../ui/Session.jsx";
import { PeriodNav, usePeriod } from "../ui/PeriodNav.jsx";
import { StretchPanel } from "./StretchPanel.jsx";
import { StretchHeld } from "./StretchSession.jsx";

export function StretchHistory({ stretch, open }) {
  const period = usePeriod("stretch");
  const list = inPeriod(stretch.sessions, period.range).reverse();
  return (
    <div className="p-4">
      <Header title="История растяжки" />
      <PeriodNav period={period} dates={stretch.sessions.map((s) => s.startedAt)}>
        <StretchPanel stretch={stretch} zoom={period.zoom} range={period.range} open={open} />
      </PeriodNav>
      {stretch.sessions.length === 0 && <p className="text-neutral-400">Здесь появятся пройденные растяжки.</p>}
      <div className="space-y-2">
        {list.map((x) => (
          <div key={x.id} className="space-y-2">
            <HistoryRow startedAt={x.startedAt} name={x.name} summary={sessionSummary(x)} onClick={() => open({ type: "stretchSession", id: x.id })} />
            {period.zoom === "day" && <StretchHeld stretch={stretch} x={x} open={open} />}
          </div>
        ))}
      </div>
    </div>
  );
}
