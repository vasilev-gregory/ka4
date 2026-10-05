// Touch gestures: swipe a row, long press, hold-and-slide reorder, flick. Thresholds are tuned for phones.
import { useState, useRef } from "react";
import { setDragActive } from "./sortable.js";

const buzz = () => { try { navigator.vibrate && navigator.vibrate(20); } catch (e) {} };

// The click that ends a swipe must not also press whatever is under the finger.
export function useClickGuard() {
  const just = useRef(false);
  return {
    arm: () => { just.current = true; setTimeout(() => { just.current = false; }, 80); },
    onClickCapture: (e) => { if (just.current) { e.stopPropagation(); e.preventDefault(); } },
  };
}

// Horizontal swipe on list rows. bind(key, onSwipe) goes on the row; onSwipe(dir) gets -1 (left) or 1
// (right) once the row was pulled past the threshold. `swipe` = {key, dx} of the row being pulled.
// onStart runs when a row starts moving (e.g. to cancel a pending long press).
export function useSwipeRows({ disabled = false, onStart } = {}) {
  const [swipe, setSwipe] = useState(null);
  const st = useRef(null);
  const guard = useClickGuard();
  const bind = (key, onSwipe) => ({
    onPointerDown: (e) => { if (disabled) return; st.current = { key, x: e.clientX, y: e.clientY, active: false, dx: 0 }; },
    onPointerMove: (e) => {
      const s = st.current;
      if (!s || s.key !== key) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.active) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          s.active = true;
          if (onStart) onStart();
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        } else {
          if (Math.abs(dy) > 12) st.current = null; // it's a scroll
          return;
        }
      }
      s.dx = Math.max(-150, Math.min(150, dx));
      setSwipe({ key, dx: s.dx });
    },
    onPointerUp: () => {
      const s = st.current;
      st.current = null;
      setSwipe(null);
      if (!s || !s.active) return;
      guard.arm();
      if (s.dx < -80) onSwipe(-1);
      else if (s.dx > 80) onSwipe(1);
    },
    onPointerCancel: () => { st.current = null; setSwipe(null); },
    onClickCapture: guard.onClickCapture,
  });
  return { swipe, bind };
}

// Tap vs. long press on one element. bind({ onTap, onLong }); cancel() aborts a press in progress.
export function useLongPress(delay = 450) {
  const t = useRef(null);
  const fired = useRef(false);
  const cancel = () => clearTimeout(t.current);
  const bind = ({ onTap, onLong }) => ({
    onPointerDown: () => {
      fired.current = false;
      cancel();
      t.current = setTimeout(() => { fired.current = true; buzz(); onLong(); }, delay);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (ev) => ev.preventDefault(),
    onClick: () => {
      if (fired.current) { fired.current = false; return; }
      onTap();
    },
  });
  return { bind, cancel };
}

// Hold an item of a horizontal row and slide it left/right to reorder.
// headerProps(group, key, keys) goes on each item; keys = the row's current order.
// onReorder(from, to) is called on release. `drag` = {group, key, dx, to} while dragging.
export function useHoldReorder(onReorder, delay = 250) {
  const [drag, setDrag] = useState(null);
  const refs = useRef({});
  const press = useRef(null);
  const headerProps = (group, key, keys) => ({
    ref: (el) => { refs.current[`${group}:${key}`] = el; },
    style: {
      touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
      ...(drag && drag.group === group && drag.key === key ? { transform: `translateX(${drag.dx}px)`, position: "relative", zIndex: 20 } : {}),
    },
    onContextMenu: (e) => e.preventDefault(),
    onPointerDown: (ev) => {
      const x0 = ev.clientX;
      const target = ev.currentTarget;
      clearTimeout(press.current);
      const cancel = () => clearTimeout(press.current);
      target.addEventListener("pointerup", cancel, { once: true });
      target.addEventListener("pointercancel", cancel, { once: true });
      press.current = setTimeout(() => {
        const centers = keys.map((k) => { const r = refs.current[`${group}:${k}`].getBoundingClientRect(); return r.left + r.width / 2; });
        const from = keys.indexOf(key);
        let cur = { group, key, dx: 0, to: from };
        setDrag(cur);
        setDragActive(true);
        buzz();
        const move = (e2) => {
          const dx = e2.clientX - x0;
          const x = centers[from] + dx;
          let to = 0, best = Infinity;
          centers.forEach((cx, j) => { if (Math.abs(x - cx) < best) { best = Math.abs(x - cx); to = j; } });
          cur = { ...cur, dx, to };
          setDrag(cur);
        };
        const end = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", end);
          window.removeEventListener("pointercancel", end);
          setDragActive(false);
          setDrag(null);
          if (cur.to !== from) onReorder(from, cur.to);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
      }, delay);
    },
  });
  return { drag, headerProps };
}

// A quick sideways flick anywhere on an element (the click it ends with is swallowed).
export function useFlick(onFlick) {
  const st = useRef(null);
  const guard = useClickGuard();
  return {
    style: { touchAction: "pan-y" },
    onPointerDown: (e) => { st.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e) => {
      const s = st.current; st.current = null;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { guard.arm(); onFlick(dx > 0 ? 1 : -1); }
    },
    onClickCapture: guard.onClickCapture,
  };
}
