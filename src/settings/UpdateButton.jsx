// "Update the app": asks the server for the current build, then drops the cached app files and reloads.
import { useState } from "react";
import { checkForUpdate, hardRefresh } from "../core/appUpdate.js";
import { Button } from "../ui/kit.jsx";

export function UpdateButton() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    setMsg("Проверяю…");
    try {
      const v = await checkForUpdate();
      if (v.upToDate) { setMsg(`У тебя последняя версия, ${v.current}`); setBusy(false); return; }
      setMsg(`Есть версия ${v.latest} (у тебя ${v.current}), обновляю…`);
    } catch (e) {
      setMsg("Не получилось проверить, обновляю принудительно…");
    }
    setTimeout(hardRefresh, 600);
  };
  return (
    <div className="mb-6">
      <Button variant="secondary" block disabled={busy} onClick={check} className="font-semibold">Обновить приложение</Button>
      {msg && (
        <p className="mt-2 text-xs text-neutral-400">
          {msg}
          {msg.startsWith("У тебя") && <button onClick={hardRefresh} className="ml-2 underline">всё равно перезагрузить</button>}
        </p>
      )}
    </div>
  );
}
