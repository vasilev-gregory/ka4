// Strength history tab: zoom week / month / year with a calendar, the period's analysis and its workouts.
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { DAY, fmtDate, fmtNum, plural, weekStartOf } from "../core/util.js";
import { fmtTotals, fmtWDur, stats } from "../model/workout.js";
import { weekLoad } from "../model/muscles.js";
import { workoutKcal } from "../model/energy.js";
import { inPeriod, periodOf, periodSummary, shiftPeriod } from "../model/periods.js";
import { Header, Segmented, useApp } from "../ui/kit.jsx";
import { useFlick } from "../ui/gestures.js";
import { MuscleBreakdown, MusclesWhy, WhyButton } from "./MuscleBreakdown.jsx";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dayMonth = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const ZOOMS = [["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]];

// survives leaving the tab for a workout card and coming back
let remembered = { zoom: "month", at: null };
const remember = (zoom, at) => { remembered = { zoom, at }; };
// on another zoom: around today when the current period holds it, else from the period's start
const anchorFor = (range) => { const now = Date.now(); return now >= range.from && now < range.to ? now : range.from; };

function periodLabel(zoom, { from, to }) {
  const d = new Date(from);
  if (zoom === "year") return String(d.getFullYear());
  if (zoom === "month") return capitalize(d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }));
  const y = new Date(to - DAY).getFullYear() !== new Date().getFullYear() ? ` ${new Date(to - DAY).getFullYear()}` : "";
  return `${dayMonth(from)} – ${dayMonth(to - DAY)}${y}`;
}

// one calendar row; days outside `month` (if given) are dimmed
function WeekRow({ ws, month, trained, selected, onClick }) {
  const today = new Date().toDateString();
  return (
    <button onClick={onClick} className={`grid w-full grid-cols-7 rounded-lg py-0.5 text-center ${selected ? "bg-neutral-800" : ""}`}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws + i * DAY + 3600e3);
        const on = trained.has(d.toDateString());
        const dim = month != null && d.getMonth() !== month;
        return (
          <div key={i} className="flex justify-center py-0.5">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums
              ${on ? "bg-accent-400 font-semibold text-black" : dim ? "text-neutral-700" : "text-neutral-300"}
              ${d.toDateString() === today && !on ? "ring-1 ring-accent-400" : ""}`}>
              {d.getDate()}
            </span>
          </div>
        );
      })}
    </button>
  );
}

const DayNames = () => (
  <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-neutral-500">
    {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d) => <div key={d}>{d}</div>)}
  </div>
);

// 12 months of a year: how many workouts in each; a tap opens the month
function YearGrid({ year, workouts, onMonth }) {
  const counts = Array(12).fill(0);
  workouts.forEach((w) => { const d = new Date(w.startedAt); if (d.getFullYear() === year) counts[d.getMonth()]++; });
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

// week: hard sets per muscle. month / year: totals and the average week per muscle.
function PeriodPanel({ zoom, range, workouts, exMap }) {
  const { bwAt } = useApp();
  const [why, setWhy] = useState(false);
  let title, load, empty;
  if (zoom === "week") {
    const an = weekLoad(workouts, exMap, range.from);
    title = `тренировок: ${an.days}`;
    load = an.muscles;
    empty = "На этой неделе тяжёлых подходов не было.";
  } else {
    const s = periodSummary(workouts, exMap, bwAt, range);
    title = s.workouts ? [`${s.workouts} ${plural(s.workouts, "тренировка", "тренировки", "тренировок")}`, fmtTotals(s),
      s.kcal > 0 && `≈${fmtNum(Math.round(s.kcal / (s.kcal < 1000 ? 10 : 100)) * (s.kcal < 1000 ? 10 : 100))} ккал`].filter(Boolean).join(", ") : "";
    load = s.perWeek;
    empty = s.workouts ? "Тяжёлых подходов не было." : zoom === "month" ? "В этом месяце тренировок не было." : "В этом году тренировок не было.";
  }
  const any = Object.keys(load).length > 0;
  return (
    <div className="mt-3 rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="tabular-nums">{title}</span>
        <span className="flex items-center gap-2">{zoom !== "week" && any && "в среднем за неделю"}<WhyButton on={why} toggle={() => setWhy((x) => !x)} /></span>
      </div>
      {why && <MusclesWhy />}
      {any ? <MuscleBreakdown load={load} /> : <p className="text-xs text-neutral-500">{empty}</p>}
    </div>
  );
}

export function HistoryTab({ data, exMap, open }) {
  const { bwAt } = useApp();
  const [zoom, setZoomState] = useState(remembered.zoom);
  const [at, setAtState] = useState(() => remembered.at ?? Date.now());
  const go = (z, t) => { remember(z, t); setZoomState(z); setAtState(t); };
  const range = periodOf(zoom, at);
  const shift = (k) => go(zoom, shiftPeriod(zoom, at, k));
  const rezoom = (z) => go(z, anchorFor(range));
  const flick = useFlick((dir) => shift(-dir));
  const all = data.active ? [...data.workouts, data.active] : data.workouts;
  const trained = new Set(all.map((w) => new Date(w.startedAt).toDateString()));
  const list = inPeriod(data.workouts, range).reverse();

  const weeks = [];
  if (zoom === "month") for (let ws = weekStartOf(range.from); ws < range.to; ws = weekStartOf(ws + 8 * DAY)) weeks.push(ws);

  return (
    <div className="p-4">
      <Header title="История силовых" />
      <Segmented options={ZOOMS} value={zoom} onChange={rezoom} />
      <div className="mb-5" {...flick}>
        <div className="my-2 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="p-2 text-neutral-400" aria-label="Раньше"><ChevronLeft size={20} /></button>
          <div className="font-semibold" data-testid="period">{periodLabel(zoom, range)}</div>
          <button onClick={() => shift(1)} className="rotate-180 p-2 text-neutral-400" aria-label="Позже"><ChevronLeft size={20} /></button>
        </div>
        {zoom !== "year" && <DayNames />}
        {zoom === "week" && <WeekRow ws={range.from} trained={trained} />}
        {zoom === "month" && weeks.map((ws) => (
          <WeekRow key={ws} ws={ws} month={new Date(range.from).getMonth()} trained={trained} onClick={() => go("week", ws)} />
        ))}
        {zoom === "year" && <YearGrid year={new Date(range.from).getFullYear()} workouts={all} onMonth={(t) => go("month", t)} />}
        {zoom !== "week" && <p className="mt-1 text-center text-[11px] text-neutral-500">{zoom === "month" ? "Тап по неделе — её разбор" : "Тап по месяцу — его календарь"}</p>}
        {/* the running workout counts in the week's sets, but not in the totals of a month / year */}
        <PeriodPanel zoom={zoom} range={range} workouts={zoom === "week" ? all : data.workouts} exMap={exMap} />
      </div>
      {data.workouts.length === 0 && <p className="text-neutral-400">Здесь появятся завершённые тренировки.</p>}
      <div className="space-y-2">
        {list.map((w) => {
          const st = stats(w, exMap, bwAt);
          const kcal = workoutKcal(w, exMap, bwAt);
          return (
            <button key={w.id} onClick={() => open({ type: "workout", id: w.id })} className="w-full rounded-xl bg-neutral-900 p-4 text-left active:bg-neutral-800">
              <div className="text-xs text-neutral-400">{fmtDate(w.startedAt)}</div>
              <div className="font-semibold">{w.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtWDur(st)}, {fmtTotals(st)}{kcal != null && `, ≈${kcal} ккал`}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
