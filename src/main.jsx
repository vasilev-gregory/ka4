import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// ask the browser not to evict our data under storage pressure
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
