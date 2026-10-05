// Backups: send as a file (share sheet / download), restore from a file, or copy / paste as text.
import { useState, useRef } from "react";
import { fmtDate } from "../core/util.js";
import { backupText, parseBackup, shareBackup } from "../model/backup.js";
import { Button, ConfirmButton } from "../ui/kit.jsx";

export function BackupSection({ data, up, replace }) {
  const [msg, setMsg] = useState("");
  const [exp, setExp] = useState("");
  const [imp, setImp] = useState("");
  const [pending, setPending] = useState(null); // backup read from a file, waiting for confirmation
  const fileRef = useRef(null);
  const markBackedUp = () => up((d) => { d.settings.lastBackupAt = Date.now(); });

  const shareFile = async () => {
    const r = await shareBackup(data);
    if (r === "cancelled") return;
    markBackedUp();
    setMsg(r === "shared" ? "Файл отправлен" : "Файл сохранён в загрузки");
  };
  const pickFile = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try { setPending(parseBackup(await f.text())); setMsg(""); } catch (e) { setMsg("Это не похоже на копию из приложения"); }
  };
  const restore = (backup) => { replace(backup.data); setMsg("Данные загружены"); };
  const copyText = async () => {
    const txt = backupText(data);
    setExp(txt);
    try { await navigator.clipboard.writeText(txt); setMsg("Скопировано в буфер обмена"); markBackedUp(); }
    catch (e) { setMsg("Скопируй текст из поля вручную"); }
  };
  const pasteText = () => {
    try { restore(parseBackup(imp)); setImp(""); } catch (e) { setMsg("Это не похоже на экспорт из приложения"); }
  };

  return (
    <>
      <h2 className="mb-2 font-semibold">Резервная копия</h2>
      <p className="mb-2 text-xs text-neutral-500">
        {data.settings.lastBackupAt ? `Последняя копия: ${fmtDate(data.settings.lastBackupAt)}` : "Копий ещё не было"}
      </p>
      <Button block onClick={shareFile} className="mb-2">Отправить копию файлом</Button>
      <Button variant="secondary" block onClick={() => fileRef.current && fileRef.current.click()} className="mb-2">Загрузить копию из файла</Button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} className="hidden" />
      {pending && (
        <div className="mb-3 rounded-xl bg-neutral-900 p-3 text-xs">
          <p className="mb-2 text-neutral-300">
            В файле: тренировок {pending.summary.workouts}, программ {pending.summary.programs}
            {pending.summary.exportedAt ? `, сохранено ${fmtDate(pending.summary.exportedAt)}` : ""}. Текущие данные будут заменены.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPending(null)} className="rounded-lg bg-neutral-800 px-4 py-2.5 text-neutral-300">Отмена</button>
            <button onClick={() => { restore(pending); setPending(null); }} className="flex-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white">Заменить</button>
          </div>
        </div>
      )}
      <p className="mb-2 mt-4 text-xs text-neutral-500">Или текстом:</p>
      <Button variant="secondary" block onClick={copyText}>Скопировать все данные</Button>
      {exp && <textarea readOnly value={exp} onFocus={(e) => e.target.select()} className="mt-2 h-24 w-full rounded-xl bg-neutral-900 p-3 text-xs text-neutral-400" />}
      <textarea value={imp} onChange={(e) => setImp(e.target.value)} placeholder="Вставь сюда сохранённую копию"
        className="mt-4 h-24 w-full rounded-xl bg-neutral-900 p-3 text-xs outline-hidden placeholder:text-neutral-500 focus:ring-2 focus:ring-accent-400" />
      {imp && (
        <ConfirmButton onConfirm={pasteText} confirmText="Заменить всё текущее?"
          className="mt-2 w-full rounded-xl bg-neutral-800 py-3" armedClassName="mt-2 w-full rounded-xl bg-red-600 py-3 text-white">
          Загрузить копию
        </ConfirmButton>
      )}
      {msg && <p className="mt-3 text-xs text-accent-400">{msg}</p>}
    </>
  );
}
