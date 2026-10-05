// Whether the browser promised to keep the data, how much is used, and a button to ask for protection.
import { useState, useEffect } from "react";
import { canProtectStorage, protectStorage, storageStatus } from "../storage.js";
import { Button, Card, Pill } from "../ui/kit.jsx";

const mb = (b) => (b == null ? "?" : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} КБ` : `${(b / 1048576).toFixed(1)} МБ`);

export function StorageStatus() {
  const [st, setSt] = useState(null);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    let live = true;
    storageStatus().then((s) => { if (live) setSt(s); });
    return () => { live = false; };
  }, []);
  const ask = async () => {
    await protectStorage();
    setAsked(true);
    setSt(await storageStatus());
  };
  if (!st) return null;
  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Хранилище</div>
        <Pill on={st.persisted}>{st.persisted ? "защищено" : st.persisted === false ? "не защищено" : "неизвестно"}</Pill>
      </div>
      <div className="mt-1 text-xs text-neutral-400">Занято {mb(st.usage)}{st.quota ? ` из ${mb(st.quota)}` : ""}</div>
      {!st.persisted && (
        <>
          <p className="mt-2 text-xs text-neutral-500">
            «Защищено» — браузер обещает не удалять данные приложения сам. Пока защиты нет, раз в неделю приходит напоминание о бэкапе.
          </p>
          <Button block onClick={ask} className="mt-2 text-sm">Запросить защиту хранилища</Button>
          {asked && !st.persisted && (
            <p className="mt-2 text-xs text-neutral-400">
              {canProtectStorage()
                ? "Браузер отказал. Обычно помогает: открывать приложение с иконки на экране «Домой» и пользоваться им регулярно, потом запросить ещё раз."
                : "Этот браузер не умеет защищать хранилище. Остаются бэкапы файлом."}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
