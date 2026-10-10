// The RIR dial on a set's ✓: hold it and a fan 0 · 1 · 2 · 3 · 4+ opens around it; slide towards one and let go —
// the set is done with that RIR (model markSetRir). A plain tap still just ticks the set, and the fan flashes for a
// moment so it can be found. Drawn in a portal: the row clips its content and moves when swiped.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { vibrate } from "../../core/sound.js";

const OPTIONS = [0, 1, 2, 3, 4];
const R = 72; // px from the centre of ✓ to an option
const HOLD = 400, SLOP = 10, DEAD = 28; // ms to open; px a finger may drift before it's a scroll; px of "nothing picked"
// ✓ sits at the row's right edge, so the fan opens to its left: 0 straight up … 4+ straight down
const posOf = (i) => {
  const a = Math.PI / 2 + (i * Math.PI) / (OPTIONS.length - 1);
  return { x: Math.cos(a) * R, y: -Math.sin(a) * R };
};
// the option nearest to where the finger is (relative to the centre), or null near the centre
function pickAt(dx, dy) {
  if (Math.hypot(dx, dy) < DEAD) return null;
  let best = null, dist = Infinity;
  OPTIONS.forEach((n, i) => { const p = posOf(i); const k = Math.hypot(dx - p.x, dy - p.y); if (k < dist) { dist = k; best = n; } });
  return best;
}
// while a dial is open (one at a time) the page must not scroll under the finger; listened from the press on, so the
// browser has not started a scroll by the time the dial opens
let opened = false;
const block = (e) => { if (opened) e.preventDefault(); };
// a set marked (tap or dial) means its typing is over: the field that had the cursor lets go, the keyboard closes
const endTyping = () => { const el = document.activeElement; if (el && el.tagName === "INPUT") el.blur(); };

// onTap: a plain tap (✓); onPick(rir): a value picked on the dial; enabled: false = a plain ✓ (warm-up, cardio)
// → { bind: props for ✓, dial: the fan to render }. The fan follows ✓ on screen every frame while shown: the page
// can still move under it (the warm-up card folding as the first set is ticked, a scroll begun before the hold).
export function useRirDial({ onTap, onPick, enabled }) {
  const [dial, setDial] = useState(null); // { pick, flash }
  const [at, setAt] = useState(null); // { cx, cy }: the centre of ✓ now
  const btn = useRef(null);
  const st = useRef(null);
  const fired = useRef(false);
  const flashT = useRef(null);
  const centre = () => { const r = btn.current.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  useEffect(() => {
    if (!dial || !btn.current) return;
    let raf;
    const follow = () => {
      const c = centre();
      setAt((o) => (o && o.cx === c.cx && o.cy === c.cy ? o : c));
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [dial]);
  const release = () => { if (st.current) clearTimeout(st.current.timer); st.current = null; opened = false; document.removeEventListener("touchmove", block); };
  const close = () => { release(); setDial(null); };
  useEffect(() => () => { document.removeEventListener("touchmove", block); clearTimeout(flashT.current); }, []);
  const bind = {
    ref: btn,
    onContextMenu: (e) => e.preventDefault(),
    onPointerDown: (e) => {
      if (!enabled) return;
      e.stopPropagation(); // a press on ✓ is not the start of a row swipe
      fired.current = false;
      const s = { x: e.clientX, y: e.clientY, open: false, pick: null };
      s.timer = setTimeout(() => {
        s.open = true;
        opened = true;
        fired.current = true;
        vibrate(20);
        setAt(centre());
        setDial({ pick: null });
      }, HOLD);
      st.current = s;
      document.addEventListener("touchmove", block, { passive: false });
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    },
    onPointerMove: (e) => {
      const s = st.current;
      if (!s) return;
      if (!s.open) {
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP) release();
        return;
      }
      const c = centre();
      const pick = pickAt(e.clientX - c.cx, e.clientY - c.cy);
      if (pick !== s.pick) {
        s.pick = pick;
        if (pick != null) vibrate(10);
        setDial({ pick });
      }
    },
    onPointerUp: () => {
      const s = st.current;
      if (s && s.open && s.pick != null) { onPick(s.pick); endTyping(); }
      if (s && s.open) close();
      else release();
    },
    onPointerCancel: close,
    onClick: () => {
      if (fired.current) { fired.current = false; return; } // the dial had it
      onTap();
      endTyping();
      if (!enabled) return;
      setAt(centre());
      setDial({ pick: null, flash: true });
      clearTimeout(flashT.current);
      flashT.current = setTimeout(() => setDial((d) => (d && d.flash ? null : d)), 180);
    },
  };
  const view = dial && at && createPortal(
    <div className="pointer-events-none fixed inset-0 z-50" data-testid="rir-dial">
      {!dial.flash && <div className="absolute inset-0 bg-black/40" />}
      {!dial.flash && (
        <div style={{ left: at.cx - R - 34, top: at.cy }} className="absolute -translate-x-full -translate-y-1/2 text-right text-[11px] leading-tight text-neutral-300">
          RIR<br />в запасе
        </div>
      )}
      {OPTIONS.map((n, i) => {
        const p = posOf(i);
        return (
          <div key={n} style={{ left: at.cx + p.x, top: at.cy + p.y }}
            className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-base font-semibold shadow-lg ${
              dial.pick === n ? "scale-110 bg-accent-400 text-black" : "bg-neutral-800 text-neutral-100"} ${dial.flash ? "opacity-60" : ""}`}>
            {n === 4 ? "4+" : n}
          </div>
        );
      })}
    </div>,
    document.body,
  );
  return { bind, dial: view };
}
