// Weekly minutes of stretching per muscle area vs the evidence-based minimum / ceiling.
import { fmtDur } from "../core/util.js";
import { ST_WEEK_MAX } from "../model/catalog.js";
import { stretchVerdict, stretchWeek } from "../model/stretch.js";

export function StretchWeekPanel({ stretch, ws, only }) {
  const { areas, days } = stretchWeek(stretch, ws);
  const keys = (only || Object.keys(areas)).filter((k) => k in areas || (only && only.includes(k)));
  if (!keys.length) return null;
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-semibold">Неделя</div>
        <div className="text-xs text-neutral-400">дней с растяжкой: {days} из 5</div>
      </div>
      <div className="space-y-2">
        {keys.map((k) => {
          const sec = areas[k] || 0;
          const [label, cls, hint] = stretchVerdict(sec);
          return (
            <div key={k}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-neutral-300">{k}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-accent-400" style={{ width: `${Math.min(100, (sec / ST_WEEK_MAX) * 100)}%` }} />
                  <div className="absolute inset-y-0 w-px bg-neutral-400" style={{ left: "50%" }} />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-neutral-400">{fmtDur(sec * 1000)}</span>
                <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${cls}`}>{label}</span>
              </div>
              <div className="mt-0.5 pl-28 text-[11px] text-neutral-500">{hint}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-neutral-500">
        Считается время удержания на одну сторону. По обзору Thomas et al. (2018) для прироста гибкости нужно не меньше 5 минут
        в неделю на группу мышц (черта на шкале), и чем чаще в неделю, тем лучше — ориентир 5 дней. Более свежие сводные данные
        показывают, что после ~10 минут в неделю прирост почти не растёт.
      </p>
    </div>
  );
}
