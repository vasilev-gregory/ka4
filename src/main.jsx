import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// ask the browser not to evict our data under storage pressure
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

// When a freshly deployed service worker takes over, reload once so the new version shows
// on the first relaunch. All state (including a running workout) lives in localStorage,
// so the reload loses nothing.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
