// Stretching history: the week panel (browsable by week) and the list of runs.
import { useState } from "react";
import { Trash2, ChevronLeft } from "lucide-react";
import { DAY, fmtDate, fmtDur, weekStartOf } from "../core/util.js";
import { stretchWeek } from "../model/stretch.js";
import { removeSession } from "../model/stretchActions.js";
import { ConfirmButton, Header } from "../ui/kit.jsx";
import { StretchWeekPanel } from "./StretchWeekPanel.jsx";

const dayMonth = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export function StretchHistory({ stretch, upStretch }) {
  const list = stretch.sessions.slice().reverse();
  const [ws, setWs] = useState(() => weekStartOf(Date.now()));
  return (
    <div className="p-4">
      <Header title="История растяжки" />
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setWs(weekStartOf(ws - 3 * DAY))} className="p-2 text-neutral-400"><ChevronLeft size={20} /></button>
        <div className="text-sm">{dayMonth(ws)} – {dayMonth(ws + 6 * DAY + 3600e3)}</div>
        <button onClick={() => setWs(weekStartOf(ws + 8 * DAY))} className="rotate-180 p-2 text-neutral-400"><ChevronLeft size={20} /></button>
      </div>
      <div className="mb-5">
        <StretchWeekPanel stretch={stretch} ws={ws} />
        {list.length > 0 && !Object.keys(stretchWeek(stretch, ws).areas).length && <p className="text-xs text-neutral-500">На этой неделе растяжки не было.</p>}
      </div>
      {list.length === 0 && <p className="text-neutral-400">Здесь появятся пройденные растяжки.</p>}
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl bg-neutral-900 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-neutral-400">{fmtDate(s.startedAt)}</div>
              <div className="font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtDur(s.finishedAt - s.startedAt)}{s.complete ? "" : ", не до конца"}</div>
            </div>
            <ConfirmButton onConfirm={() => upStretch((x) => removeSession(x, s.id))}
              confirmText="Удалить?" className="p-2 text-neutral-600" armedClassName="rounded-lg bg-red-600 px-3 py-2 text-xs text-white">
              <Trash2 size={18} />
            </ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}
