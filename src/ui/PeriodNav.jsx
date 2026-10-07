// The calendar of a history, shared by strength and stretching: zoom day / week / month / year, paging (arrows and a
// flick), the days with training marked, a year as 12 months. What a period shows is up to the screen.
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { DAY, weekStartOf } from "../core/util.js";
import { periodOf, shiftPeriod } from "../model/calendar.js";
import { useFlick } from "./gestures.js";
import { Segmented } from "./kit.jsx";
import { WhyButton } from "./LoadBreakdown.jsx";

export const ZOOMS = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]];
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dayMonth = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

// what the items behind a load cover: a month / year shows totals, not the average week
export const TOTAL_NOTE = { day: "за день", week: "за неделю", month: "за месяц, всего", year: "за год, всего" };

// survives leaving the tab for a card and coming back; one per history (key)
const remembered = {};
const remember = (key, zoom, at) => { remembered[key] = { zoom, at }; };
// on another zoom: around today when the current period holds it, else from the period's start
const anchorFor = (range) => { const now = Date.now(); return now >= range.from && now < range.to ? now : range.from; };

// { zoom, range, go(zoom, ts), shift(k), rezoom(zoom) } of a history's calendar, month by default
export function usePeriod(key) {
  const [zoom, setZoom] = useState(() => remembered[key]?.zoom || "month");
  const [at, setAt] = useState(() => remembered[key]?.at ?? Date.now());
  const go = (z, t) => { remember(key, z, t); setZoom(z); setAt(t); };
  const range = periodOf(zoom, at);
  return { zoom, range, go, shift: (k) => go(zoom, shiftPeriod(zoom, at, k)), rezoom: (z) => go(z, anchorFor(range)) };
}

function periodLabel(zoom, { from, to }) {
  const d = new Date(from);
  if (zoom === "year") return String(d.getFullYear());
  if (zoom === "month") return capitalize(d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }));
  if (zoom === "day") return capitalize(d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" }));
  const y = new Date(to - DAY).getFullYear() !== new Date().getFullYear() ? ` ${new Date(to - DAY).getFullYear()}` : "";
  return `${dayMonth(from)} – ${dayMonth(to - DAY)}${y}`;
}

// one calendar row; days outside `month` (if given) are dimmed; onDay(ts): a tap on a day opens it (else the row is
// one button, onClick); day: the day picked (outlined)
function WeekRow({ ws, month, trained, selected, onClick, onDay, day }) {
  const today = new Date().toDateString();
  const Cell = onDay ? "button" : "div";
  const Row = onDay ? "div" : "button";
  return (
    <Row onClick={onDay ? undefined : onClick} className={`grid w-full grid-cols-7 rounded-lg py-0.5 text-center ${selected ? "bg-neutral-800" : ""}`}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws + i * DAY + 3600e3);
        const on = trained.has(d.toDateString());
        const dim = month != null && d.getMonth() !== month;
        const picked = day != null && new Date(day).toDateString() === d.toDateString();
        return (
          <Cell key={i} className="flex justify-center py-0.5"
            {...(onDay ? { onClick: () => onDay(d.getTime()), "aria-label": d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) } : {})}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums
              ${on ? "bg-accent-400 font-semibold text-black" : dim ? "text-neutral-700" : "text-neutral-300"}
              ${picked ? "ring-2 ring-neutral-100" : d.toDateString() === today && !on ? "ring-1 ring-accent-400" : ""}`}>
              {d.getDate()}
            </span>
          </Cell>
        );
      })}
    </Row>
  );
}

const DayNames = () => (
  <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-neutral-500">
    {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => <div key={d}>{d}</div>)}
  </div>
);

// 12 months of a year: how many workouts / sessions in each; a tap opens the month
function YearGrid({ year, dates, onMonth }) {
  const counts = Array(12).fill(0);
  dates.forEach((t) => { const d = new Date(t); if (d.getFullYear() === year) counts[d.getMonth()]++; });
  const max = Math.max(1, ...counts);
  const now = new Date();
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {counts.map((n, m) => (
        <button key={m} onClick={() => onMonth(new Date(year, m, 1).getTime())}
          className={`rounded-lg bg-neutral-900 p-2 text-left active:bg-neutral-800 ${year === now.getFullYear() && m === now.getMonth() ? "ring-1 ring-accent-400" : ""}`}>
          <div className="text-[11px] text-neutral-400">{new Date(year, m, 1).toLocaleDateString("ru-RU", { month: "short" })}</div>
          <div className={`text-lg font-bold tabular-nums ${n ? "text-accent-400" : "text-neutral-700"}`}>{n}</div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-accent-400" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

// period: from usePeriod; dates: start times of the workouts / sessions; children: the period's panel (flicks with it)
export function PeriodNav({ period, dates, children }) {
  const { zoom, range, go, shift, rezoom } = period;
  const flick = useFlick((dir) => shift(-dir));
  const trained = new Set(dates.map((t) => new Date(t).toDateString()));
  const weeks = [];
  if (zoom === "month") for (let ws = weekStartOf(range.from); ws < range.to; ws = weekStartOf(ws + 8 * DAY)) weeks.push(ws);
  return (
    <>
      <Segmented options={ZOOMS} value={zoom} onChange={rezoom} />
      <div className="mb-5" {...flick}>
        <div className="my-2 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="p-2 text-neutral-400" aria-label="Раньше"><ChevronLeft size={20} /></button>
          <div className="font-semibold" data-testid="period">{periodLabel(zoom, range)}</div>
          <button onClick={() => shift(1)} className="rotate-180 p-2 text-neutral-400" aria-label="Позже"><ChevronLeft size={20} /></button>
        </div>
        {zoom !== "year" && <DayNames />}
        {(zoom === "week" || zoom === "day") && (
          <WeekRow ws={weekStartOf(range.from)} trained={trained} day={zoom === "day" ? range.from : null} onDay={(t) => go("day", t)} />
        )}
        {zoom === "month" && weeks.map((ws) => (
          <WeekRow key={ws} ws={ws} month={new Date(range.from).getMonth()} trained={trained} onClick={() => go("week", ws)} />
        ))}
        {zoom === "year" && <YearGrid year={new Date(range.from).getFullYear()} dates={dates} onMonth={(t) => go("month", t)} />}
        <p className="mt-1 text-center text-[11px] text-neutral-500">
          {{ day: "Тап по другому дню — его разбор", week: "Тап по дню — его разбор", month: "Тап по неделе — её разбор", year: "Тап по месяцу — его календарь" }[zoom]}
        </p>
        {children}
      </div>
    </>
  );
}

// The card of a period's analysis (under the calendar, or in a session's card), one for strength and stretching: a
// title line, a "?" opening `why`, the period's load (items: part -> load) drawn by children, or `empty` when there is
// none; a month / year says "в среднем за неделю". onZoom: its own day / week / month / year switch (in a session's card)
export function PeriodCard({ title, why, items, empty, zoom, onZoom, className = "mt-3", children }) {
  const [open, setOpen] = useState(false);
  const any = Object.keys(items).length > 0;
  return (
    <div className={`rounded-xl bg-neutral-900 p-3 ${className}`}>
      {onZoom && <div className="mb-2"><Segmented options={ZOOMS} value={zoom} onChange={onZoom} /></div>}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="tabular-nums">{title}</span>
        <span className="flex items-center gap-2">
          {any && (zoom === "month" || zoom === "year") && "в среднем за неделю"}<WhyButton on={open} toggle={() => setOpen((x) => !x)} />
        </span>
      </div>
      {open && why}
      {any ? children : <p className="text-xs text-neutral-500">{empty}</p>}
    </div>
  );
}
