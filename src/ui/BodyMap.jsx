// The body, front and back: every muscle is a shape of its own, nearly see-through until worked and filling
// with colour as the load adds up; a tap picks a part. Knows shapes, not what is counted: strength and
// stretching pass the parts they use, the fill of each and the colour.
import { BACK, FRONT } from "./bodyMapData.js";

// how strongly a part is filled for a share of the target (0..1): a trace for the first bit, full at the target
export const fillOpacity = (share) => (share > 0 ? 0.15 + 0.85 * Math.min(1, share) : 0);

// the head is tappable too (onSelect("head")), but it is not a muscle and never fills
export const HEAD = "head";

// parts: ids drawn as live (tappable, filled); fill: { id: share of the target }; color: a fill-* class;
// selected: ids outlined; small: a thumbnail; title: what the picture is about (its accessible name). A region showing
// several parts takes the largest share and picks a filled one.
export function BodyMap({ parts, fill, color, selected = [], onSelect, small = false, title }) {
  const live = new Set(parts);
  const share = (ids) => Math.max(0, ...ids.map((m) => fill[m] || 0));
  const view = (regions, label) => (
    <svg viewBox="0 0 100 200" className={small ? "h-auto w-14" : "h-auto w-1/2 max-w-48"} role="img" aria-label={title ? `${title}: ${label.toLowerCase()}` : label}>
      {regions.map(([all, polys], i) => polys.map((pts, j) => {
        const ids = all.filter((m) => live.has(m) || m === HEAD);
        const muscle = ids.length > 0 && ids[0] !== HEAD;
        const on = ids.some((m) => selected.includes(m));
        return (
          <polygon key={`${i}:${j}`} points={pts.join(" ")} strokeWidth={on ? 0.9 : 0.5} fillOpacity={muscle ? fillOpacity(share(ids)) : 0.06}
            onClick={ids.length && onSelect ? () => onSelect(ids.find((m) => fill[m]) || ids[0]) : undefined}
            className={`${muscle ? color : "fill-white"} ${ids.length && onSelect ? "cursor-pointer" : ""} ${on ? "stroke-white" : "stroke-neutral-600"}`}
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
