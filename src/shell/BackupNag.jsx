// Weekly "send yourself a backup" reminder — only while the browser hasn't promised to keep the data.
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { BACKUP_EVERY, backupDue, shareBackup } from "../model/backup.js";
import { storageStatus } from "../storage.js";
import { useNow } from "../ui/kit.jsx";

export function BackupNag({ data, up }) {
  const [protectedStorage, setProtected] = useState(null);
  const now = useNow(60e3);
  useEffect(() => {
    const check = () => storageStatus().then((s) => setProtected(!!s.persisted));
    check();
    window.addEventListener("kach-persist-changed", check);
    return () => window.removeEventListener("kach-persist-changed", check);
  }, []);
  if (protectedStorage !== false || !backupDue(data)) return null;
  const share = async () => {
    const r = await shareBackup(data);
    if (r !== "cancelled") up((d) => { d.settings.lastBackupAt = Date.now(); });
  };
  const last = data.settings.lastBackupAt;
  // sits above the tab bar; the spacer keeps the end of the list from hiding under it
  return (
    <>
      <div className="h-20" />
      <div className="above-nav fixed inset-x-0 z-30 mx-auto max-w-md px-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-lg">
          <div className="min-w-0 flex-1 text-xs text-neutral-300">
            {last ? `Копии не было ${Math.floor((now - last) / 864e5)} дн.` : "Ещё не было ни одной копии данных."} Отправь файл себе в Telegram.
          </div>
          <button onClick={share} className="shrink-0 rounded-lg bg-accent-400 px-3 py-2 text-xs font-semibold text-black">Отправить</button>
          <button onClick={() => up((d) => { d.settings.lastBackupAt = Date.now() - BACKUP_EVERY + 864e5; })}
            className="shrink-0 p-1 text-neutral-500" aria-label="Напомнить завтра"><X size={16} /></button>
        </div>
      </div>
    </>
  );
}
