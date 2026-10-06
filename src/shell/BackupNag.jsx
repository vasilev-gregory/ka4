// Weekly "send yourself a backup" reminder — only while the browser hasn't promised to keep the data.
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { backupDue, daysSinceBackup, markBackedUp, shareBackup, snoozeBackup } from "../model/backup.js";
import { plural } from "../core/util.js";
import { storageStatus } from "../storage.js";
import { Button, useNow } from "../ui/kit.jsx";

export function BackupNag({ data, up }) {
  const [protectedStorage, setProtected] = useState(null);
  const now = useNow(60e3);
  useEffect(() => {
    const check = () => storageStatus().then((s) => setProtected(!!s.persisted));
    check();
    window.addEventListener("kach-persist-changed", check);
    return () => window.removeEventListener("kach-persist-changed", check);
  }, []);
  if (protectedStorage !== false || !backupDue(data, now)) return null;
  const share = async () => {
    const r = await shareBackup(data);
    if (r !== "cancelled") up((d) => markBackedUp(d, Date.now()));
  };
  const days = daysSinceBackup(data, now);
  // sits above the tab bar; the spacer keeps the end of the list from hiding under it
  return (
    <>
      <div className="h-20" />
      <div className="above-nav fixed inset-x-0 z-30 mx-auto max-w-md px-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-lg">
          <div className="min-w-0 flex-1 text-xs text-neutral-300">
            {days != null ? `Копии не было ${days} ${plural(days, "день", "дня", "дней")}.` : "Ещё не было ни одной копии данных."} Отправь файл себе в Telegram.
          </div>
          <Button size="xs" onClick={share} className="shrink-0">Отправить</Button>
          <button onClick={() => up((d) => snoozeBackup(d, Date.now()))}
            className="shrink-0 p-1 text-neutral-500" aria-label="Напомнить завтра"><X size={16} /></button>
        </div>
      </div>
    </>
  );
}
