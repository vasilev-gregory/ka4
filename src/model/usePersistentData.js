import { useState, useEffect, useRef } from "react";
import { storage } from "../storage.js";
import { KEY, migrate, seed } from "./state.js";
import { closeStaleWorkout } from "./workout.js";

// Owns the app state and its persistence.
// Invariants:
//  - a failed read never leads to writing fresh data over existing data;
//  - an instance only writes data it changed itself (identity check against `persisted`),
//    so a stale second tab/window can't overwrite newer data;
//  - another instance's save is adopted immediately (storage event);
//  - pending changes are flushed when the app is hidden or closed.
export function usePersistentData() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState({ state: "idle", at: 0, msg: "" });
  const [loadKey, setLoadKey] = useState(0);
  const dataRef = useRef(null);
  dataRef.current = data;
  const persisted = useRef(null); // the data object last read from / written to storage
  const saveT = useRef(null);

  // stored data -> state; if load-time maintenance changed it, leave it "dirty" so it gets saved
  const adopt = (raw) => {
    const m = migrate(JSON.parse(raw));
    const d = closeStaleWorkout(m);
    persisted.current = d === m ? d : null;
    setData(d);
  };

  // Load. get() throws both for a missing key and for a real failure, so when it throws
  // we probe the storage: if a test write/read works, the key is simply missing.
  useEffect(() => {
    (async () => {
      setErr("");
      const errs = [];
      for (const k of [KEY, KEY + "-backup"]) {
        try {
          const r = await storage.get(k);
          if (r && r.value) { adopt(r.value); return; }
        } catch (e) { errs.push(`${k}: ${e && e.message ? e.message : e}`); }
      }
      try {
        const v = String(Date.now());
        await storage.set("gymapp-probe", v);
        const p = await storage.get("gymapp-probe");
        if (p && p.value === v) { setData(seed()); return; }
        errs.push("проверочная запись не прочиталась");
      } catch (e) { errs.push(`проверка: ${e && e.message ? e.message : e}`); }
      setErr("Хранилище не отвечает, данные не тронуты.\n" + errs.join("\n"));
    })();
  }, [loadKey]);

  const persist = async (d) => {
    if (!d || d === persisted.current) return;
    persisted.current = d;
    setSaved((x) => ({ ...x, state: "saving" }));
    try {
      await storage.set(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
      setSaved({ state: "ok", at: Date.now(), msg: "" });
    } catch (e) {
      setSaved({ state: "error", at: 0, msg: String(e && e.message ? e.message : e) });
    }
  };

  useEffect(() => {
    if (!data) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => persist(data), 150);
  }, [data]);

  useEffect(() => {
    const h = (e) => { if (e.key === KEY && e.newValue) { try { adopt(e.newValue); } catch (err2) {} } };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  useEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      const d = dataRef.current;
      if (!d || d === persisted.current) return;
      persist(d);
      storage.set(KEY + "-backup", JSON.stringify({ ...d, savedAt: Date.now() })).catch(() => {});
    };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  return {
    data, setData, err, saved,
    reload: () => setLoadKey((k) => k + 1),
    startFresh: () => { setErr(""); setData(seed()); },
  };
}
