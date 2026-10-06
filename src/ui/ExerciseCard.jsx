// The parts of an exercise's card shared by strength exercises and stretches: the title with both names and ✎,
// the name fields when editing, the picture with the numbers, and the list of sessions it was in.
import { Pencil } from "lucide-react";
import { fmtDate } from "../core/util.js";
import { ExImg, Header, useApp } from "./kit.jsx";

export function ExerciseTitle({ ex, back, editing, toggleEdit }) {
  const { nm1, nm2 } = useApp();
  return (
    <>
      <Header title={nm1(ex)} back={back}
        right={<button onClick={toggleEdit} className={`shrink-0 self-start p-2 ${editing ? "text-accent-400" : "text-neutral-400"}`} aria-label="Изменить"><Pencil size={20} /></button>} />
      {nm2(ex) && <p className="-mt-3 mb-4 text-neutral-400">{nm2(ex)}</p>}
    </>
  );
}

// the two names; onChange(patch)
export function ExerciseNameFields({ ex, onChange }) {
  const field = "mb-2 w-full rounded-lg bg-black px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-accent-400";
  return (
    <>
      <input value={ex.name} placeholder="Название" onChange={(e) => onChange({ name: e.target.value })} className={field} />
      <input value={ex.ru || ""} placeholder="Второе название" onChange={(e) => onChange({ ru: e.target.value })} className={`${field} mb-3`} />
    </>
  );
}

// the picture and a few numbers: stats [[value, label, accent?], …]
export function ExerciseStats({ ex, stats }) {
  return (
    <div className="mb-4 flex items-center gap-6">
      <ExImg ex={ex} size={64} />
      {stats.map(([v, l, accent]) => (
        <div key={l}>
          <div className={`text-2xl font-bold tabular-nums ${accent ? "text-accent-400" : ""}`}>{v}</div>
          <div className="text-xs text-neutral-400">{l}</div>
        </div>
      ))}
    </div>
  );
}

// sessions it was in, newest first: [{ id, at, text, onClick }]; empty: what to say when there are none
export function ExerciseSessions({ sessions, empty }) {
  if (!sessions.length) return <p className="text-neutral-400">{empty}</p>;
  return (
    <div className="space-y-2">
      {sessions.map((x) => (
        <button key={x.id} onClick={x.onClick} className="w-full rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
          <div className="text-xs text-neutral-400">{fmtDate(x.at)}</div>
          <div className="tabular-nums">{x.text}</div>
        </button>
      ))}
    </div>
  );
}

// An exercise in a session's card (a workout's exercise, a run's stretch): picture, name, what was done, a note;
// a tap opens the exercise's card. ex may be gone (deleted): then `missing` is shown and nothing opens.
export function ExerciseRow({ ex, missing, text, note, onClick }) {
  const { nm1 } = useApp();
  return (
    <button onClick={ex ? onClick : undefined} className="flex w-full items-center gap-3 rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
      <ExImg ex={ex} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{nm1(ex, missing)}</div>
        <div className="text-xs text-neutral-300 tabular-nums">{text}</div>
        {note}
      </div>
    </button>
  );
}
