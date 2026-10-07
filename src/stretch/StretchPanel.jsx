// The muscle areas of a period (drawn by ui/PeriodCard), one block for the stretching history and a run's card: day (like one run), week
// (minutes per area with the verdict), month / year (runs, time and the average week). onZoom: its own switch.
import { fmtDur, plural } from "../core/util.js";
import { inPeriod } from "../model/calendar.js";
import { stExMap, stretchLoad, stretchPeriod, stretchWeek } from "../model/stretch.js";
import { PeriodCard, TOTAL_NOTE } from "../ui/PeriodNav.jsx";
import { StretchBreakdown, StretchWhy } from "./StretchBreakdown.jsx";

// day: that day's minutes per area (like one run, no weekly verdict). week: minutes per area and days with stretching.
// month / year: runs, time and the average week per area.
export function StretchPanel({ stretch, zoom, range, onZoom, open, className }) {
  let title, areas;
  if (zoom === "day") {
    const n = inPeriod(stretch.sessions, range).length;
    title = n ? `${n} ${plural(n, "растяжка", "растяжки", "растяжек")}` : "";
    areas = stretchLoad(stretch, range.from, range.to).areas;
  } else if (zoom === "week") {
    const w = stretchWeek(stretch, range.from);
    title = `дней с растяжкой: ${w.days} из 5`;
    areas = w.areas;
  } else {
    const p = stretchPeriod(stretch, range);
    title = p.sessions ? `${p.sessions} ${plural(p.sessions, "растяжка", "растяжки", "растяжек")}, время ${fmtDur(p.time)}` : "";
    areas = p.perWeek;
  }
  const empty = { day: "В этот день растяжки не было.", week: "На этой неделе растяжки не было.", month: "В этом месяце растяжки не было.",
    year: "В этом году растяжки не было." }[zoom];
  return (
    <PeriodCard title={title} why={<StretchWhy />} items={areas} empty={empty} zoom={zoom} onZoom={onZoom} className={className}>
      <StretchBreakdown areas={areas} single={zoom === "day"} week={zoom === "week"} exMap={stExMap(stretch)} byNote={TOTAL_NOTE[zoom]} open={open} />
    </PeriodCard>
  );
}
