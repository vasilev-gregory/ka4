// "Update the app": core/appUpdate updateApp (the same as a long pull down anywhere) and what it found.
import { useState } from "react";
import { hardRefresh, updateApp } from "../core/appUpdate.js";
import { Button } from "../ui/kit.jsx";

export function UpdateButton() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    setMsg("Проверяю…");
    const v = await updateApp();
    if (v.upToDate) { setMsg(`У тебя последняя версия, ${v.current}`); setBusy(false); return; }
    setMsg(v.failed ? "Не получилось проверить, обновляю принудительно…" : `Есть версия ${v.latest} (у тебя ${v.current}), обновляю…`);
  };
  return (
    <div className="mb-6">
      <Button variant="secondary" block disabled={busy} onClick={check} className="font-semibold">Обновить приложение</Button>
      <p className="mt-1 text-xs text-neutral-500">Или сильно потяни вниз в любом месте приложения.</p>
      {msg && (
        <p className="mt-2 text-xs text-neutral-400">
          {msg}
          {msg.startsWith("У тебя") && <button onClick={hardRefresh} className="ml-2 underline">всё равно перезагрузить</button>}
        </p>
      )}
    </div>
  );
}
