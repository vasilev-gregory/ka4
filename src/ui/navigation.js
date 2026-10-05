// Tabs plus a stack of detail screens on top, mirrored into the browser history so the system back
// gesture / button closes the top screen instead of leaving the app. Each pushed screen is one history
// entry carrying its depth ({ kach: n }); popstate trims the stack to that depth.
import { useEffect, useRef, useState } from "react";

export function useNavigation(initialTab = "workout") {
  const [tab, setTabState] = useState(initialTab);
  const [stack, setStack] = useState([]);
  const depth = useRef(0); // history entries above the base one, kept in step with the stack

  useEffect(() => {
    if (!history.state || history.state.kach == null) history.replaceState({ kach: 0 }, "");
    const onPop = (e) => {
      const to = (e.state && e.state.kach) || 0;
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
  const back = () => { if (depth.current > 0) history.back(); };
  // close every screen (tab switch, mode switch, restore)
  const reset = () => {
    const n = depth.current;
    if (!n) return;
    depth.current = 0;
    setStack([]);
    history.go(-n);
  };
  const setTab = (t) => { reset(); setTabState(t); };

  return { tab, setTab, view: stack[stack.length - 1] || null, open, back, reset };
}
