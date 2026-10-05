// A file shared to Кач from another app's share sheet (Android): when the app opens with ?shared=1,
// take the parked file and show the import sheet for it.
import { useState, useEffect } from "react";
import { ImportFlow } from "../settings/ImportFlow.jsx";
import { takeSharedFile } from "../storage.js";

export function SharedImport({ data, up, replace, onImported }) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("shared")) return;
    history.replaceState(history.state, "", location.pathname); // a reload must not import again
    let live = true;
    takeSharedFile().then((f) => { if (live && f) setFile(f); });
    return () => { live = false; };
  }, []);
  if (!file) return null;
  return <ImportFlow file={file} data={data} up={up} replace={replace} onClose={() => setFile(null)} onDone={() => { setFile(null); onImported(); }} />;
}
