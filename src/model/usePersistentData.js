// The app data hook: loads, saves, syncs between instances (details in the comment on usePersistentData).
import { useState, useEffect, useRef } from "react";
import { produce, setAutoFreeze } from "immer";
import { storage } from "../storage.js";
import { KEY, migrate, seed } from "./state.js";
import { closeStaleWorkout } from "./workoutActions.js";

// State objects also go through plain code (migrate, structuredClone, editors' drafts); keep them mutable.
setAutoFreeze(false);

// Owns the app state and its persistence.
// Invariants:
//  - a failed read never leads to writing fresh data over existing data;
//  - an instance only writes data it changed itself (identity check against `persisted`),
//    so a stale second tab/window can't overwrite newer data;
//  - another instance's save is adopted immediately; local changes not yet written are
//    replayed on top of it instead of being lost;
//  - a failed write is retried (on the next change, on hide/close);
//  - pending changes are flushed when the app is hidden or closed.
export function usePersistentData() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState({ state: "idle", at: 0, msg: "" });
  const [loadKey, setLoadKey] = useState(0);
  const dataRef = useRef(null); // for the hide/close flush, which runs outside render
  useEffect(() => { dataRef.current = data; }, [data]);
  const persisted = useRef(null); // the data object last read from / written to storage
  const lastSavedAt = useRef(0); // savedAt of the newest data this instance has seen or written
  const saveT = useRef(null);
  // Changes applied locally but not written yet, so they can be replayed onto another instance's save.
  const ops = useRef([]); // [{ seq, run: (data) => data }]
  const seq = useRef(0);
  const opsIn = useRef(new WeakMap()); // data object -> seq of the last op it contains

  const apply = (op) => {
    ops.current.push(op);
    setData((d) => {
      if (!d) return d;
      const n = op.run(d);
      if (n === d) ops.current = ops.current.filter((o) => o !== op); // no-op: nothing to replay
      else opsIn.current.set(n, op.seq);
      return n;
    });
  };
  // fn mutates a draft of the data (immer: unchanged parts are shared, no deep copy)
  const update = (fn) => apply({ seq: ++seq.current, run: (d) => produce(d, (draft) => { fn(draft); }) });
  // whole data swap (restore from a backup)
  const replace = (next) => apply({ seq: ++seq.current, run: () => next });

  // stored data -> state; if load-time maintenance or replayed local changes altered it,
  // leave it "dirty" so it gets saved. Returns false if the data is older than what we have.
  const adopt = (raw, fromOther) => {
    const parsed = JSON.parse(raw);
    const at = parsed.savedAt || 0;
    if (fromOther && at <= lastSavedAt.current) return false; // our own echo or a stale copy
    lastSavedAt.current = Math.max(lastSavedAt.current, at);
    const m = migrate(parsed);
    let d = closeStaleWorkout(m);
    let last = 0;
    for (const op of ops.current) {
      try { d = op.run(d); } catch (e) {} // a change that no longer fits the newer data is dropped
      last = op.seq;
    }
    if (last) opsIn.current.set(d, last);
    persisted.current = d === m ? d : null;
    setData(d);
    return true;
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
          if (r && r.value) { adopt(r.value, false); return; }
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
    const at = Math.max(Date.now(), lastSavedAt.current + 1);
    lastSavedAt.current = at;
    // storage.set writes localStorage synchronously, so from here on other instances see these
    // changes: they must not be replayed onto their next save
    const upto = opsIn.current.get(d) || 0;
    const written = ops.current.filter((o) => o.seq <= upto);
    ops.current = ops.current.filter((o) => o.seq > upto);
    setSaved((x) => ({ ...x, state: "saving" }));
    try {
      await storage.set(KEY, JSON.stringify({ ...d, savedAt: at }));
      setSaved({ state: "ok", at: Date.now(), msg: "" });
    } catch (e) {
      if (persisted.current === d) persisted.current = null; // not written: try again later
      ops.current = [...written, ...ops.current];
      setSaved({ state: "error", at: 0, msg: String(e && e.message ? e.message : e) });
    }
  };

  useEffect(() => {
    if (!data) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => persist(data), 150);
  }, [data]);

  useEffect(() => storage.subscribe(KEY, (raw) => { try { adopt(raw, true); } catch (e) {} }), []);

  useEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      const d = dataRef.current;
      if (!d || d === persisted.current) return;
      persist(d);
      storage.set(KEY + "-backup", JSON.stringify({ ...d, savedAt: lastSavedAt.current })).catch(() => {});
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
    data, update, replace, err, saved,
    reload: () => setLoadKey((k) => k + 1),
    startFresh: () => { setErr(""); setData(seed()); },
  };
}
