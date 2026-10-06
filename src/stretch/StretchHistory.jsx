// Stretching history: the shared calendar (ui/PeriodNav), minutes per muscle area for the period, and the runs.
import { Trash2 } from "lucide-react";
import { fmtDate, fmtDur, plural } from "../core/util.js";
import { inPeriod } from "../model/calendar.js";
import { stExMap, stretchPeriod, stretchWeek } from "../model/stretch.js";
import { removeSession } from "../model/stretchActions.js";
import { ConfirmButton, Header } from "../ui/kit.jsx";
import { PeriodCard, PeriodNav, TOTAL_NOTE, usePeriod } from "../ui/PeriodNav.jsx";
import { StretchBreakdown, StretchWhy } from "./StretchBreakdown.jsx";

// week: minutes per area and days with stretching. month / year: runs, time and the average week per area.
function PeriodPanel({ stretch, zoom, range }) {
  let title, areas;
  if (zoom === "week") {
    const w = stretchWeek(stretch, range.from);
    title = `дней с растяжкой: ${w.days} из 5`;
    areas = w.areas;
  } else {
    const p = stretchPeriod(stretch, range);
    title = p.sessions ? `${p.sessions} ${plural(p.sessions, "растяжка", "растяжки", "растяжек")}, ${fmtDur(p.time)}` : "";
    areas = p.perWeek;
  }
  const any = Object.keys(areas).length > 0;
  const empty = zoom === "week" ? "На этой неделе растяжки не было." : zoom === "month" ? "В этом месяце растяжки не было." : "В этом году растяжки не было.";
  return (
    <PeriodCard title={title} averaged={zoom !== "week" && any} why={<StretchWhy />}>
      {any ? <StretchBreakdown areas={areas} week={zoom === "week"} exMap={stExMap(stretch)} byNote={TOTAL_NOTE[zoom]} />
        : <p className="text-xs text-neutral-500">{empty}</p>}
    </PeriodCard>
  );
}

export function StretchHistory({ stretch, upStretch }) {
  const period = usePeriod("stretch");
  const list = inPeriod(stretch.sessions, period.range).reverse();
  return (
    <div className="p-4">
      <Header title="История растяжки" />
      <PeriodNav period={period} dates={stretch.sessions.map((s) => s.startedAt)}>
        <PeriodPanel stretch={stretch} zoom={period.zoom} range={period.range} />
      </PeriodNav>
      {stretch.sessions.length === 0 && <p className="text-neutral-400">Здесь появятся пройденные растяжки.</p>}
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl bg-neutral-900 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-neutral-400">{fmtDate(s.startedAt)}</div>
              <div className="font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtDur(s.finishedAt - s.startedAt)}{s.complete ? "" : ", не до конца"}</div>
            </div>
            <ConfirmButton onConfirm={() => upStretch((x) => removeSession(x, s.id))}
              confirmText="Удалить?" className="p-2 text-neutral-600" armedClassName="rounded-lg bg-red-600 px-3 py-2 text-xs text-white">
              <Trash2 size={18} />
            </ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}
