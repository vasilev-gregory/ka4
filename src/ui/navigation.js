// Tabs plus a stack of detail screens on top, mirrored into the browser history so the system back
// gesture / button closes the top screen instead of leaving the app. Each pushed screen is one history
// entry carrying its depth ({ kach: n }); popstate trims the stack to that depth.
import { useEffect, useEffectEvent, useRef, useState } from "react";

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
    // opened from an overlay (a sheet's button): the screen takes the overlay's entry, so no dead "back" is left
    if (history.state && history.state.overlay) history.replaceState({ kach: depth.current }, "");
    else history.pushState({ kach: depth.current }, "");
    setStack((s) => [...s, view]);
  };
  const back = () => { if (depth.current > 0) history.back(); };
  // close every screen (tab switch, mode switch, restore)
  // (overlays over the screens hold entries of their own: { overlay: level }, see useBackCloses)
  const reset = () => {
    const n = depth.current + ((history.state && history.state.overlay) || 0);
    if (!n) return;
    depth.current = 0;
    setStack([]);
    history.go(-n);
  };
  const setTab = (t) => { reset(); setTabState(t); };

  return { tab, setTab, view: stack[stack.length - 1] || null, open, back, reset };
}

// An overlay over the screens (the stretching player, a picker, a sheet): while it is shown it holds one history
// entry ({ overlay: level }), so the system back closes the top overlay (onBack) and not the screen under it.
// Overlays nest. One that opens as another closes (a picker → the player) takes over its entry; after a reload the
// entry left by the same overlay is reused instead of adding another.
let shown = 0; // overlays shown now
export function useBackCloses(onBack, on = true) {
  const close = useEffectEvent(onBack);
  useEffect(() => {
    if (!on) return;
    const level = ++shown;
    if (!(history.state && history.state.overlay === level)) history.pushState({ ...history.state, overlay: level }, "");
    const onPop = (e) => { if (!e.state || (e.state.overlay || 0) < level) close(); };
    window.addEventListener("popstate", onPop);
    return () => {
      shown--;
      window.removeEventListener("popstate", onPop);
      // closed from the screen: drop its entry, unless an overlay of the same level has taken it meanwhile
      setTimeout(() => { if (shown < level && history.state && history.state.overlay === level) history.back(); }, 0);
    };
  }, [on]);
}
