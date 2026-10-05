// Drag to reorder (hold the grip and pull), robust to iOS scroll stealing.
import { useState, useEffect, useLayoutEffect, useRef } from "react";

export function moveItem(xs, from, to) { const [x] = xs.splice(from, 1); xs.splice(to, 0, x); }

// iOS WebKit can start a page scroll on a drag handle and then cancel our pointer stream.
// Block scrolling from handles (and everywhere while a drag is active) with non-passive listeners.

export let dragActive = false;

if (typeof document !== "undefined" && !window.__dragGuard) {
  window.__dragGuard = true;
  document.addEventListener("touchstart", (e) => {
    if (e.target && e.target.closest && e.target.closest("[data-drag-handle]")) e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchmove", (e) => { if (dragActive) e.preventDefault(); }, { passive: false });
}

export function useSortable(onMove) {
  const [drag, setDrag] = useState(null); // {from, to, dy}
  const refs = useRef([]);
  const st = useRef(null);
  const raf = useRef(0);
  const onMoveRef = useRef(onMove);
  useLayoutEffect(() => { onMoveRef.current = onMove; });

  const update = () => {
    const s = st.current;
    if (!s || !s.rects) return;
    const finger = s.y + window.scrollY;
    const r = s.rects[s.from];
    const dy = finger - (r.top + r.h / 2);
    let to = s.from;
    s.rects.forEach((q, j) => {
      const mid = q.top + q.h / 2;
      if (j > s.from && finger > mid) to = Math.max(to, j);
      if (j < s.from && finger < mid) to = Math.min(to, j);
    });
    if (dy !== s.dy || to !== s.to) { s.dy = dy; s.to = to; setDrag({ from: s.from, to, dy }); }
  };

  // measure after the list has re-rendered in compact drag mode
  useLayoutEffect(() => {
    const s = st.current;
    if (!drag || !s || s.rects) return;
    s.rects = refs.current.slice(0, s.count).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, h: r.height };
    });
    s.gap = s.rects.length > 1 ? s.rects[1].top - (s.rects[0].top + s.rects[0].h) : 8;
    update();
    const loop = () => {
      const c = st.current;
      if (!c) return;
      if (c.y < 90) window.scrollBy(0, -10);
      else if (c.y > window.innerHeight - 150) window.scrollBy(0, 10);
      update();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }, [drag]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const winHandlers = useRef(null);
  const end = () => {
    cancelAnimationFrame(raf.current);
    setDragActive(false);
    if (winHandlers.current) {
      window.removeEventListener("pointermove", winHandlers.current.move);
      window.removeEventListener("pointerup", winHandlers.current.up);
      window.removeEventListener("pointercancel", winHandlers.current.up);
      winHandlers.current = null;
    }
    const s = st.current;
    st.current = null;
    setDrag(null);
    if (s && s.to !== s.from) onMoveRef.current(s.from, s.to);
  };

  const handleProps = (i, count) => ({
    "data-drag-handle": "",
    style: { touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" },
    onPointerDown: (ev) => {
      ev.preventDefault();
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
      st.current = { from: i, to: i, y: ev.clientY, count, rects: null, dy: 0 };
      setDragActive(true);
      // listen on window too, in case pointer capture doesn't hold on this browser
      const move = (e2) => { if (st.current) { st.current.y = e2.clientY; update(); } };
      const upH = () => end();
      winHandlers.current = { move, up: upH };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", upH);
      window.addEventListener("pointercancel", upH);
      setDrag({ from: i, to: i, dy: 0 });
      try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
    },
  });

  const itemStyle = (i) => {
    const s = st.current;
    if (!drag || !s || !s.rects) return undefined;
    const h = s.rects[drag.from].h + s.gap;
    if (i === drag.from)
      return { transform: `translateY(${drag.dy}px)`, position: "relative", zIndex: 30, boxShadow: "0 12px 32px rgba(0,0,0,0.8)" };
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-h}px)`, transition: "transform 150ms" };
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return { transform: `translateY(${h}px)`, transition: "transform 150ms" };
    return { transition: "transform 150ms" };
  };

  // ref callback for item i (the list measures items while dragging)
  const itemRef = (i) => (el) => { refs.current[i] = el; };
  return { itemRef, handleProps, itemStyle, dragging: !!drag, dragFrom: drag ? drag.from : -1 };
}

export function setDragActive(v) { dragActive = v; }
