// A chart of a value over time (exercise progress, measurements), paged like the history: the period bar of
// ui/PeriodNav, then the chart (ui/TrendChart.jsx, loaded on demand) with drag-to-zoom.
import { useRef, useState, lazy, Suspense } from "react";
import { usePeriod, usePeriodBar } from "./PeriodNav.jsx";

const TREND_ZOOMS = [["month", "Месяц"], ["year", "Год"], ["all", "Всё"]];
const TrendChartLazy = lazy(() => import("./TrendChart.jsx"));
const fmtSpan = (t) => new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit" });

// A value over time in a period of the calendar, as the history pages it (ui/PeriodNav: month / year / all, arrows and
// a swipe), and Grafana-style zoom: drag across the chart to focus on that stretch. points: [{ t, v }], oldest first,
// all of them. header(shown): optional line above the chart about the visible points.
export function Trend({ points, unit, header, height = "h-48" }) {
  const period = usePeriod("trend", "all");
  const { bar, flick } = usePeriodBar({ period, dates: points.map((p) => p.t), zooms: TREND_ZOOMS });
  const [zoom, setZoom] = useState(null); // { from, to }
  const [sel, setSel] = useState(null); // selection being dragged, px within the box
  const box = useRef(null);
  const drag = useRef(null);
  const { from, to } = period.range;
  const shown = points.filter((p) => (zoom ? p.t >= zoom.from && p.t <= zoom.to : p.t >= from && p.t < to));
  // x on screen -> time, over the plot area (the grid), not the axis labels
  const toT = (x) => {
    const r = (box.current.querySelector(".recharts-cartesian-grid") || box.current).getBoundingClientRect();
    const a = shown[0].t, b = shown[shown.length - 1].t;
    return a + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (b - a);
  };
  const gesture = {
    style: { touchAction: "pan-y" },
    onPointerDown: (e) => { drag.current = shown.length >= 2 ? { x: e.clientX, y: e.clientY, active: false } : null; },
    onPointerMove: (e) => {
      const g = drag.current;
      if (!g) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // a scroll
        if (Math.abs(dx) < 10) return;
        g.active = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      }
      const left = box.current.getBoundingClientRect().left;
      setSel([g.x - left, e.clientX - left]);
    },
    onPointerUp: (e) => {
      const d = drag.current;
      drag.current = null;
      setSel(null);
      if (!d || !d.active) return;
      const [from, to] = [toT(d.x), toT(e.clientX)].sort((x, y) => x - y);
      if (points.filter((p) => p.t >= from && p.t <= to).length >= 2) setZoom({ from, to });
    },
    onPointerCancel: () => { drag.current = null; setSel(null); },
  };
  return (
    <div>
      {/* a swipe across the period pages it; across the chart it zooms (below) */}
      <div onClickCapture={() => setZoom(null)} {...flick}>{bar}</div>
      {shown.length < 2 ? <p className="py-8 text-center text-xs text-neutral-500">За этот срок меньше двух точек.</p> : <>
        {header && <div className="px-1 pt-2 text-xs text-neutral-400">{header(shown)}</div>}
        <div ref={box} data-testid="trend" className={`relative mt-2 select-none [&_*]:outline-none ${height}`} {...gesture}>
          <Suspense fallback={null}><TrendChartLazy points={shown} unit={unit} /></Suspense>
          {sel && <div className="pointer-events-none absolute inset-y-0 bg-accent-400/20"
            style={{ left: Math.min(...sel), width: Math.abs(sel[1] - sel[0]) }} />}
        </div>
      </>}
      <div className="flex h-7 items-center justify-between px-1 text-[11px] text-neutral-500">
        {zoom ? <>
          <span className="tabular-nums">{fmtSpan(zoom.from)} – {fmtSpan(zoom.to)}</span>
          <button onClick={() => setZoom(null)} className="px-1 text-accent-400">Сбросить</button>
        </> : <span>Проведи пальцем по графику, чтобы приблизить отрезок</span>}
      </div>
    </div>
  );
}

