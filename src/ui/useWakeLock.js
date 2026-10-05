// Keeps the screen on while `on` (re-acquired when the app comes back to the foreground).
import { useEffect } from "react";

export function useWakeLock(on = true) {
  useEffect(() => {
    if (!on) return;
    let lock = null;
    const req = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (e) {} };
    req();
    const onVis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock && lock.release(); } catch (e) {} };
  }, [on]);
}
