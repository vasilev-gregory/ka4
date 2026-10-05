// The body, front and back, with each muscle coloured by how much it was trained; a tap picks a muscle.
import { BACK, FRONT } from "./bodyMapData.js";

// level of a muscle -> fill class; the accent follows the mode (index.css)
export const LEVEL_FILL = { low: "fill-accent-950", grow: "fill-accent-700", optimal: "fill-accent-400", high: "fill-red-500" };
const BODY = "fill-neutral-800";
const ORDER = ["low", "grow", "optimal", "high"];

// levels: { muscleId: "low" | "grow" | "optimal" | "high" }; a region showing several muscles takes the highest
export function BodyMap({ levels, selected, onSelect }) {
  const fill = (ids) => {
    const lv = ids.map((m) => levels[m]).filter(Boolean).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0];
    return lv ? LEVEL_FILL[lv] : BODY;
  };
  const view = (regions, label) => (
    <svg viewBox="0 0 100 200" className="h-auto w-1/2 max-w-48" role="img" aria-label={label}>
      {regions.map(([ids, polys], i) => polys.map((pts, j) => (
        <polygon key={`${i}:${j}`} points={pts.join(" ")} strokeWidth={ids.includes(selected) ? 0.8 : 0.4}
          onClick={ids.length ? () => onSelect(ids.find((m) => levels[m]) || ids[0]) : undefined}
          className={`${fill(ids)} ${ids.includes(selected) ? "stroke-white" : "stroke-black"} ${ids.length ? "cursor-pointer" : ""}`}
          data-muscle={ids.join(" ") || undefined} />
      )))}
    </svg>
  );
  return (
    <div className="flex justify-center gap-2">
      {view(FRONT, "Спереди")}
      {view(BACK, "Сзади")}
    </div>
  );
}
