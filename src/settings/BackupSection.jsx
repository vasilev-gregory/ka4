// Backups: send the data as a file (share sheet → Telegram, or a download) and restore from one.
import { useState, useRef } from "react";
import { fmtDate } from "../core/util.js";
import { parseBackup, shareBackup } from "../model/backup.js";
import { Button } from "../ui/kit.jsx";

export function BackupSection({ data, up, replace }) {
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(null); // backup read from a file, waiting for confirmation
  const fileRef = useRef(null);

  const shareFile = async () => {
    const r = await shareBackup(data);
    if (r === "cancelled") return;
    up((d) => { d.settings.lastBackupAt = Date.now(); });
    setMsg(r === "shared" ? "Файл отправлен" : "Файл сохранён в загрузки");
  };
  const pickFile = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try { setPending(parseBackup(await f.text())); setMsg(""); } catch (e) { setMsg("Это не похоже на копию из приложения"); }
  };
  const restore = () => { replace(pending.data); setPending(null); setMsg("Данные загружены"); };

  return (
    <div className="mb-3">
      <div className="mb-2 text-xs text-neutral-500">
        Резервная копия: {data.settings.lastBackupAt ? `последняя ${fmtDate(data.settings.lastBackupAt)}` : "ещё не было"}
      </div>
      <Button block onClick={shareFile} className="mb-2">Отправить копию файлом</Button>
      <Button variant="secondary" block onClick={() => fileRef.current && fileRef.current.click()}>Загрузить копию из файла</Button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} className="hidden" />
      {pending && (
        <div className="mt-2 rounded-xl bg-neutral-900 p-3 text-xs">
          <p className="mb-2 text-neutral-300">
            В файле: тренировок {pending.summary.workouts}, программ {pending.summary.programs}
            {pending.summary.exportedAt ? `, сохранено ${fmtDate(pending.summary.exportedAt)}` : ""}. Текущие данные будут заменены.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPending(null)} className="rounded-lg bg-neutral-800 px-4 py-2.5 text-neutral-300">Отмена</button>
            <button onClick={restore} className="flex-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white">Заменить</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-accent-400">{msg}</p>}
    </div>
  );
}
