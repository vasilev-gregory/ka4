// Stretching history: the shared calendar (ui/PeriodNav), minutes per muscle area for the period, and the runs
// (shared rows, ui/Session; a tap opens the run's card).
import { fmtDur, plural } from "../core/util.js";
import { inPeriod } from "../model/calendar.js";
import { sessionSummary, stExMap, stretchPeriod, stretchWeek } from "../model/stretch.js";
import { Header } from "../ui/kit.jsx";
import { HistoryRow } from "../ui/Session.jsx";
import { PeriodCard, PeriodNav, TOTAL_NOTE, usePeriod } from "../ui/PeriodNav.jsx";
import { StretchBreakdown, StretchWhy } from "./StretchBreakdown.jsx";

// week: minutes per area and days with stretching. month / year: runs, time and the average week per area.
function PeriodPanel({ stretch, zoom, range, open }) {
  let title, areas;
  if (zoom === "week") {
    const w = stretchWeek(stretch, range.from);
    title = `дней с растяжкой: ${w.days} из 5`;
    areas = w.areas;
  } else {
    const p = stretchPeriod(stretch, range);
    title = p.sessions ? `${p.sessions} ${plural(p.sessions, "растяжка", "растяжки", "растяжек")}, время ${fmtDur(p.time)}` : "";
    areas = p.perWeek;
  }
  const any = Object.keys(areas).length > 0;
  const empty = zoom === "week" ? "На этой неделе растяжки не было." : zoom === "month" ? "В этом месяце растяжки не было." : "В этом году растяжки не было.";
  return (
    <PeriodCard title={title} averaged={zoom !== "week" && any} why={<StretchWhy />}>
      {any ? <StretchBreakdown areas={areas} week={zoom === "week"} exMap={stExMap(stretch)} byNote={TOTAL_NOTE[zoom]} open={open} />
        : <p className="text-xs text-neutral-500">{empty}</p>}
    </PeriodCard>
  );
}

export function StretchHistory({ stretch, open }) {
  const period = usePeriod("stretch");
  const list = inPeriod(stretch.sessions, period.range).reverse();
  return (
    <div className="p-4">
      <Header title="История растяжки" />
      <PeriodNav period={period} dates={stretch.sessions.map((s) => s.startedAt)}>
        <PeriodPanel stretch={stretch} zoom={period.zoom} range={period.range} open={open} />
      </PeriodNav>
      {stretch.sessions.length === 0 && <p className="text-neutral-400">Здесь появятся пройденные растяжки.</p>}
      <div className="space-y-2">
        {list.map((x) => (
          <HistoryRow key={x.id} startedAt={x.startedAt} name={x.name} summary={sessionSummary(x)} onClick={() => open({ type: "stretchSession", id: x.id })} />
        ))}
      </div>
    </div>
  );
}
