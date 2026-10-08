// "Кач переезжает" — shown only on the old address (GitHub Pages): save a copy here, open the new address, load it there.
// Browser data belongs to an address, so it does not move by itself.
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { markBackedUp, shareBackup } from "../model/backup.js";
import { Button } from "../ui/kit.jsx";

export const NEW_HOME = "https://kach.hb.ru-msk.vkcloud-storage.ru/index.html";
export const isOldHome = (host) => host.endsWith(".github.io");

export function MoveBanner({ data, up }) {
  const [saved, setSaved] = useState(false);
  if (!isOldHome(location.hostname)) return null;
  const save = async () => {
    const r = await shareBackup(data);
    if (r === "cancelled") return;
    up((d) => markBackedUp(d, Date.now()));
    setSaved(true);
  };
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-accent-400/40 bg-neutral-900 p-4" data-testid="move-banner">
      <div className="text-base font-semibold">Кач переезжает</div>
      <p className="mt-1 text-xs text-neutral-400">Тренировки сами не переедут, но перенести их — минута:</p>
      <ol className="mt-3 space-y-3 text-sm">
        <li className="flex items-center gap-3">
          <Step n={1} done={saved} />
          <span className="flex-1">{saved ? "Копия сохранена" : "Сохрани копию"}</span>
          <Button size="xs" variant={saved ? "secondary" : "primary"} onClick={save}>{saved ? "Ещё раз" : "Сохранить"}</Button>
        </li>
        <li className="flex items-center gap-3">
          <Step n={2} />
          <span className="flex-1">Открой новый адрес</span>
          <a href={NEW_HOME} target="_blank" rel="noopener"
            className="flex items-center gap-1 rounded-xl bg-neutral-800 px-3 py-2 text-xs font-semibold text-accent-300">
            Открыть <ExternalLink size={12} />
          </a>
        </li>
        <li className="flex gap-3">
          <Step n={3} />
          <span className="flex-1">Там: Настройки → «Загрузить из файла» → выбери копию</span>
        </li>
        <li className="flex gap-3">
          <Step n={4} />
          <span className="flex-1">Добавь новый Кач на экран «Домой», а этот значок удали</span>
        </li>
      </ol>
    </div>
  );
}

const Step = ({ n, done }) => (
  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
    ${done ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{done ? "✓" : n}</span>
);
