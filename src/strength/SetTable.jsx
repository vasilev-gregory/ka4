// A finished exercise's sets as rows, read-only, laid out like the running workout: number (warm-up «Р», a drop
// set / ladder as 2a, 2b with the accent edge), weight, reps, partials and RIR when any set has them, the rest before.
import { fmtDur, fmtNum, num } from "../core/util.js";
import { setLabels } from "../model/workout.js";

// sets: the exercise's saved sets; kind: the exercise's kind; rest(si): ms before the set, "drop", or nothing
export function SetTable({ sets, kind, assist, bw, rest }) {
  const labels = setLabels(sets);
  const cardio = kind === "cardio";
  const partials = !cardio && kind !== "time" && sets.some((s) => num(s.p) > 0);
  const rir = !cardio && sets.some((s) => s.rir != null && s.t !== "w");
  const head = cardio ? ["мин", "км"] : [assist ? "помощь" : bw ? "+кг" : "кг", kind === "time" ? "сек" : "повт."];
  const cell = "flex-1 text-center tabular-nums";
  return (
    <div className="text-sm" data-testid="set-table">
      <div className="flex items-center gap-1 px-1 text-[11px] text-neutral-500">
        <span className="w-7" />
        {head.map((h) => <span key={h} className={cell}>{h}</span>)}
        {partials && <span className="w-12 text-center">частич.</span>}
        {rir && <span className="w-12 text-center">RIR</span>}
        <span className="w-12 text-center">отдых</span>
      </div>
      {sets.map((s, si) => {
        const r = rest(si);
        return (
          <div key={si} className={`flex items-center gap-1 border-l-2 px-1 py-1 ${s.g ? "border-accent-400" : "border-transparent"}`}>
            <span className={`w-7 text-center font-semibold ${s.t === "w" ? "text-sky-400" : "text-accent-400"}`}>{s.t === "w" ? "Р" : labels[si]}</span>
            {cardio ? <><span className={cell}>{fmtNum(num(s.r))}</span><span className={cell}>{num(s.w) ? fmtNum(num(s.w)) : "—"}</span></>
              : <><span className={cell}>{fmtNum(num(s.w))}</span><span className={cell}>{num(s.r)}</span></>}
            {partials && <span className="w-12 text-center tabular-nums text-neutral-300">{num(s.p) ? `+${num(s.p)}` : ""}</span>}
            {rir && <span className="w-12 text-center text-neutral-300">{s.t === "w" || s.rir == null ? "" : s.rir === 0 ? "отказ" : s.rir === 4 ? "4+" : s.rir}</span>}
            <span className="w-12 text-center text-xs tabular-nums text-neutral-500">{r === "drop" ? "↳" : r ? fmtDur(r) : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
