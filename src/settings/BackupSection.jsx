// Backups and imports: send the data as a file (share sheet → Telegram, or a download); load a file —
// a Кач backup (replaces everything) or another app's export (adds workouts).
import { useState, useRef } from "react";
import { fmtDate } from "../core/util.js";
import { markBackedUp, shareBackup } from "../model/backup.js";
import { Button } from "../ui/kit.jsx";
import { ImportFlow } from "./ImportFlow.jsx";

export function BackupSection({ data, up, replace }) {
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const shareFile = async () => {
    const r = await shareBackup(data);
    if (r === "cancelled") return;
    up((d) => markBackedUp(d, Date.now()));
    setMsg(r === "shared" ? "Файл отправлен" : "Файл сохранён в загрузки");
  };
  const pickFile = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (f) { setMsg(""); setFile(f); }
  };

  return (
    <div className="mb-3">
      <div className="mb-2 text-xs text-neutral-500">
        Резервная копия: {data.settings.lastBackupAt ? `последняя ${fmtDate(data.settings.lastBackupAt)}` : "ещё не было"}
      </div>
      <Button block onClick={shareFile} className="mb-2">Отправить копию файлом</Button>
      <Button variant="secondary" block onClick={() => fileRef.current && fileRef.current.click()}>Загрузить из файла</Button>
      <p className="mt-1 text-xs text-neutral-500">Копия Кача или CSV-экспорт Hevy и GymKeeper — добавятся к текущим данным. На Android файл можно сразу «Поделиться» в Кач.</p>
      <input ref={fileRef} type="file" accept=".json,.csv,.db,application/json,text/csv" onChange={pickFile} className="hidden" />
      {file && (
        <ImportFlow file={file} data={data} up={up} replace={replace}
          onDone={(m) => { setFile(null); setMsg(m); }} onClose={() => setFile(null)} />
      )}
      {msg && <p className="mt-2 text-xs text-accent-400">{msg}</p>}
    </div>
  );
}
