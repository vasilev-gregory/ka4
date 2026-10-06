// Entry: asks for persistent storage, wires the service worker, mounts the app.
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { protectStorage } from "./storage.js";
import "./index.css";

// ask the browser not to evict our data under storage pressure
protectStorage();

// When a freshly deployed service worker takes over, reload once so the new version shows
// on the first relaunch. All state (including a running workout or stretch) is saved on the device
// (IndexedDB + localStorage) and flushed when the page hides, so the reload loses nothing.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

// iOS resumes a home-screen app without reloading it, so it never re-checks for a new
// version on its own. Check every time the app comes back to the foreground.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
