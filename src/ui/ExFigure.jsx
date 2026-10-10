// An exercise drawn as a figure doing it (model/images.js): the body in greys, the muscles it works filled with the
// mode's colour as on the body map — what the exercise works now, so editing its muscles recolours the picture.
// A stretch fills the muscles of its area. Cardio fills none.
import { useEffect, useState } from "react";
import { FIGS } from "../model/images.js";
import { musclesOf } from "../model/muscles.js";
import { AREA_PARTS, areaOf } from "../model/stretch.js";
import { muscleFill } from "./BodyMap.jsx";

export const hasFigure = (ex) => !!(ex && FIGS[ex.id]);

// { muscleId: share } the figure fills: a stretch (it has `sides`) by its area, an exercise by its muscles
const worked = (ex) => (typeof ex.sides === "boolean" ? Object.fromEntries((AREA_PARTS[areaOf(ex)] || []).map((m) => [m, 1])) : musclesOf(ex));

const cache = {}; // id → the SVG's text, once loaded
export function ExFigure({ ex, size, round = false, label }) {
  const [, setLoaded] = useState(0);
  const svg = cache[ex.id];
  useEffect(() => {
    if (cache[ex.id]) return;
    let live = true;
    FIGS[ex.id]().then((text) => { cache[ex.id] = text; if (live) setLoaded((n) => n + 1); });
    return () => { live = false; };
  }, [ex.id]);
  const vars = Object.fromEntries(Object.entries(worked(ex)).map(([m, share]) => [`--m-${m}`, muscleFill(share)]));
  return (
    <div role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, ...vars }}
      className={`ex-fig shrink-0 overflow-hidden bg-black ${round ? "rounded-full" : "rounded-2xl"} ${size < 64 ? "ex-fig-small" : ""}`}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
  );
}
