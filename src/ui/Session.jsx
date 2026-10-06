// Pieces of a finished session shared by strength and stretching: its row in a history list, its card's title
// with the date, the tiles with its numbers, and a card that switches between views of the same thing
// (this session / its week).
import { useState } from "react";
import { fmtDate } from "../core/util.js";
import { Header, Segmented } from "./kit.jsx";

// a row of a history list; a tap opens the session
export function HistoryRow({ startedAt, name, summary, onClick }) {
  return (
    <button onClick={onClick} className="w-full rounded-xl bg-neutral-900 p-4 text-left active:bg-neutral-800">
      <div className="text-xs text-neutral-400">{fmtDate(startedAt)}</div>
      <div className="font-semibold">{name}</div>
      <div className="mt-1 text-xs text-neutral-400 tabular-nums">{summary}</div>
    </button>
  );
}

export function SessionHeader({ name, startedAt, back }) {
  return (
    <>
      <Header title={name} back={back} />
      <p className="-mt-3 mb-4 text-neutral-400">{fmtDate(startedAt)}</p>
    </>
  );
}

// tiles: [[value, label], …]; four go two in a row, others three
export function StatTiles({ tiles, className = "mb-5" }) {
  return (
    <div className={`${className} grid gap-2 ${tiles.length === 4 || tiles.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {tiles.map(([v, l]) => (
        <div key={l} className="rounded-xl bg-neutral-900 p-3">
          <div className="text-lg font-bold tabular-nums">{v}</div>
          <div className="text-xs text-neutral-400">{l}</div>
        </div>
      ))}
    </div>
  );
}

// A card with a title and, when there are several views, a switch between them; children(view) draws the view.
export function ViewsCard({ title, views, children, className = "" }) {
  const [view, setView] = useState(views[0][0]);
  return (
    <div className={`rounded-xl bg-neutral-900 p-3 ${className}`}>
      <div className="mb-2 font-semibold">{title}</div>
      {views.length > 1 && <Segmented options={views} value={view} onChange={setView} />}
      <div className={views.length > 1 ? "mt-3" : ""}>{children(view)}</div>
    </div>
  );
}
