// Tabs plus a stack of detail screens on top, mirrored into the browser history so the system back
// gesture / button closes the top screen instead of leaving the app. Each pushed screen is one history
// entry carrying its depth ({ kach: n }); popstate trims the stack to that depth.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const GuardCtx = createContext(null);

export function useNavigation(initialTab = "workout") {
  const [tab, setTabState] = useState(initialTab);
  const [stack, setStack] = useState([]);
  const depth = useRef(0); // history entries above the base one, kept in step with the stack
  const guard = useRef(null); // the top screen's "don't leave yet" check
  const skipGuard = useRef(false);

  useEffect(() => {
    if (!history.state || history.state.kach == null) history.replaceState({ kach: 0 }, "");
    const onPop = (e) => {
      const to = (e.state && e.state.kach) || 0;
      const from = depth.current;
      if (to < from && !skipGuard.current && guard.current && guard.current()) {
        history.pushState({ kach: from }, ""); // stay: the screen asks first
        return;
      }
      skipGuard.current = false;
      depth.current = to;
      setStack((s) => s.slice(0, to));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = (view) => {
    depth.current += 1;
    history.pushState({ kach: depth.current }, "");
    setStack((s) => [...s, view]);
  };
  // back({ force: true }) skips the top screen's guard (it already asked)
  const back = (opts) => {
    if (depth.current === 0) return;
    if (opts && opts.force === true) skipGuard.current = true;
    history.back();
  };
  // close every screen (tab switch, mode switch, restore)
  const reset = () => {
    const n = depth.current;
    if (!n) return;
    depth.current = 0;
    skipGuard.current = true;
    setStack([]);
    history.go(-n);
  };
  const setTab = (t) => { reset(); setTabState(t); };

  const guards = useMemo(() => ({
    set: (fn) => { guard.current = fn; },
    clear: (fn) => { if (guard.current === fn) guard.current = null; },
  }), []);

  return { tab, setTab, view: stack[stack.length - 1] || null, open, back, reset, guards };
}

export const LeaveGuardProvider = GuardCtx.Provider;

// A screen with unsaved changes: shouldStay() runs when the user goes back; return true to stay
// (and show your own question), then leave with back({ force: true }).
export function useLeaveGuard(shouldStay) {
  const guards = useContext(GuardCtx);
  useLayoutEffect(() => {
    if (!guards) return;
    guards.set(shouldStay);
    return () => guards.clear(shouldStay);
  });
}
