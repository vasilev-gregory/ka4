// A long pull down from the top of any screen updates the app, as in other apps (core/appUpdate updateApp, the same as
// Settings' button): a pill follows the finger («Потяни, чтобы обновить» → «Отпусти — обновить»), then says what it
// found. Not from inside an overlay, a field, ✓ (its RIR dial) or a drag handle, and not when the pull turns sideways.
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { updateApp } from "../core/appUpdate.js";

const PULL = 120; // px down to update
const SKIP = ".fixed, input, textarea, [data-drag-handle], button[aria-label='Подход сделан']";

export function PullToRefresh() {
  const [dy, setDy] = useState(0);
  const [msg, setMsg] = useState("");
  const st = useRef(null);
  useEffect(() => {
    const start = (e) => {
      if (window.scrollY > 0 || e.touches.length !== 1 || (e.target.closest && e.target.closest(SKIP))) { st.current = null; return; }
      st.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0 };
    };
    const move = (e) => {
      const s = st.current;
      if (!s) return;
      const dx = e.touches[0].clientX - s.x, d = e.touches[0].clientY - s.y;
      if (window.scrollY > 0 || Math.abs(dx) > Math.abs(d)) { st.current = null; setDy(0); return; }
      s.dy = Math.max(0, d);
      setDy(s.dy);
    };
    const end = async () => {
      const s = st.current;
      st.current = null;
      setDy(0);
      if (!s || s.dy < PULL) return;
      setMsg("Проверяю обновление…");
      const v = await updateApp();
      setMsg(v.upToDate ? `У тебя последняя версия, ${v.current}` : "Обновляю…");
      if (v.upToDate) setTimeout(() => setMsg(""), 2000);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, []);
  if (!dy && !msg) return null;
  const ready = dy >= PULL;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center" style={{ paddingTop: "env(safe-area-inset-top)" }} data-testid="pull-refresh">
      <div className="mt-2 flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 shadow-lg"
        style={{ transform: `translateY(${msg ? 0 : Math.min(dy, PULL) / 2}px)`, opacity: msg ? 1 : Math.min(1, dy / 60) }}>
        <RefreshCw size={14} className={msg ? "animate-spin" : ""} style={msg ? undefined : { transform: `rotate(${dy * 2}deg)` }} />
        {msg || (ready ? "Отпусти — обновить" : "Потяни, чтобы обновить")}
      </div>
    </div>
  );
}
