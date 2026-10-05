// Keeps the screen on while the component is mounted (re-acquired when the app comes back to the foreground).
import { useEffect } from "react";

export function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const req = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (e) {} };
    req();
    const onVis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock && lock.release(); } catch (e) {} };
  }, []);
}
