// The body, front and back: every muscle is a shape of its own, nearly see-through until trained and filling
// with colour as the hard sets add up; a tap picks a muscle.
import { BACK, FRONT } from "./bodyMapData.js";

// the colour muscles fill with: a warm "worked muscle" red, apart from the mode's accent used by controls
export const MUSCLE_FILL = "fill-rose-500";

// how strongly a muscle is filled for a share of the target (0..1): a trace for the first set, full at the target
export const fillOpacity = (share) => (share > 0 ? 0.15 + 0.85 * Math.min(1, share) : 0);

// fill: { muscleId: share of the weekly target, 0..1+ }; a region showing several muscles takes the largest
export function BodyMap({ fill, selected, onSelect }) {
  const share = (ids) => Math.max(0, ...ids.map((m) => fill[m] || 0));
  const view = (regions, label) => (
    <svg viewBox="0 0 100 200" className="h-auto w-1/2 max-w-48" role="img" aria-label={label}>
      {regions.map(([ids, polys], i) => polys.map((pts, j) => {
        const on = ids.includes(selected);
        return (
          <polygon key={`${i}:${j}`} points={pts.join(" ")} strokeWidth={on ? 0.9 : 0.5} fillOpacity={ids.length ? fillOpacity(share(ids)) : 0.06}
            onClick={ids.length ? () => onSelect(ids.find((m) => fill[m]) || ids[0]) : undefined}
            className={`${ids.length ? `${MUSCLE_FILL} cursor-pointer` : "fill-white"} ${on ? "stroke-white" : "stroke-neutral-600"}`}
            data-muscle={ids.join(" ") || undefined} />
        );
      }))}
    </svg>
  );
  return (
    <div className="flex justify-center gap-2">
      {view(FRONT, "Спереди")}
      {view(BACK, "Сзади")}
    </div>
  );
}
