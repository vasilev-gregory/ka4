// Load per body part, the same for strength (hard sets per muscle) and stretching (minutes per area): the body map
// with a legend, a caption for the picked part, and the list with a bar and a status; a picked row opens up to
// show what made up its load. What is counted and how it is judged comes in as data and a scale.
import { useState } from "react";
import { BodyMap, fillOpacity, HEAD } from "./BodyMap.jsx";

// a tap on the head: not a muscle, so a joke instead of numbers; each tap the next one
const HEAD_JOKES = [
  "Голова: 0 подходов. Мозг тоже мышца, но жим им пока никто не делал",
  "Голова: тренируется, когда честно считаешь подходы и секунды",
  "Голова: отвечает за «ну ещё один подход». Заливки не будет",
  "Голова: рекорд — вспомнить, какой вес был в прошлый раз",
  "Голова: в программе её нет, но без неё и до зала не дойти",
];

// items: [{ id, name, parts: body map ids }] in list order; load: { id: { value, text, status?: [key, label], nick?: a joke on the chip } };
// scale: { target: value filled completely, barMax, marks: values of the ticks on the bar, legend: [[value, label]],
//   fill: fill-* class, bar: bg-* class, chip: { statusKey: classes }, empty: caption of a part with no load };
// map: draw the body; only: list just these ids; note(id): a line under a row; expand(id): what opens under a picked row;
// find: { label, go(id) } — only in a program's editor (exercises go into a program): a picked part, or one left with no
// load, leads to the exercises for it («Подобрать упражнение»); elsewhere a tap only shows
export function LoadBreakdown({ items, load, scale, map = true, only, note, expand, find }) {
  const [sel, setSel] = useState(null);
  const [joke, setJoke] = useState(-1);
  const rows = items.filter((it) => load[it.id]?.value > 0 && (!only || only.includes(it.id)));
  const fill = {};
  rows.forEach((r) => r.parts.forEach((m) => { fill[m] = Math.max(fill[m] || 0, load[r.id].value / scale.target); }));
  const pick = (id) => {
    if (id === HEAD) setJoke((j) => (j + 1) % HEAD_JOKES.length);
    setSel(sel === id && id !== HEAD ? null : id);
  };
  // a tapped shape picks the row it belongs to, one with a load first
  const pickPart = (m) => pick(m === HEAD ? HEAD : (rows.find((r) => r.parts.includes(m)) || items.find((it) => it.parts.includes(m)))?.id);
  const picked = items.find((it) => it.id === sel);
  const idle = find ? items.filter((it) => it.parts.length && !(load[it.id]?.value > 0) && (!only || only.includes(it.id))) : [];
  const statusText = (id) => (load[id].status ? ` — ${load[id].status[1]}` : "") + (load[id].nick ? ` (${load[id].nick})` : "");
  return (
    <div>
      {map && <>
        <BodyMap parts={items.flatMap((it) => it.parts)} fill={fill} color={scale.fill} selected={picked ? picked.parts : []} onSelect={pickPart} />
        <div className="mx-auto mt-2 max-w-64">
          <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="h-2 w-full">
            {Array.from({ length: 20 }, (_, i) => (
              <rect key={i} x={i * 5} width="5.2" height="4" className={scale.fill} fillOpacity={fillOpacity(i / 20 || 0.001)} />
            ))}
          </svg>
          <div className="relative mt-0.5 h-3 text-[10px] text-neutral-500">
            {scale.legend.map(([n, l]) => (
              <span key={n} className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${(n / scale.target) * 100}%` }}>{l}</span>
            ))}
          </div>
        </div>
        <p className="mt-2 min-h-5 text-center text-xs text-neutral-300">
          {sel === HEAD ? HEAD_JOKES[joke]
            : !picked ? <span className="text-neutral-500">Тап по мышце — подробности</span>
            : load[sel]?.value > 0 ? `${picked.name}: ${load[sel].text}${statusText(sel)}`
            : `${picked.name}: ${scale.empty}`}
        </p>
      </>}
      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          const l = load[r.id];
          return (
            <div key={r.id} className={`rounded-lg ${sel === r.id ? "bg-neutral-800" : ""}`}>
              <button onClick={() => pick(r.id)} aria-expanded={sel === r.id} className="block w-full px-1.5 py-1 text-left">
                <div className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-neutral-200">{r.name}</span>
                  <span className="tabular-nums text-neutral-400">{l.text}</span>
                  {l.status && (
                    <span className={`min-w-20 shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-center text-[11px] leading-tight ${scale.chip[l.status[0]]}`}>
                      {l.status[1]}{l.nick && <span className="block text-[10px] italic opacity-75">{l.nick}</span>}
                    </span>
                  )}
                </div>
                <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-700/60">
                  <div className={`absolute inset-y-0 left-0 rounded-full ${scale.bar}`} style={{ width: `${Math.min(100, (l.value / scale.barMax) * 100)}%` }} />
                  {scale.marks.map((m) => <div key={m} className="absolute inset-y-0 w-px bg-neutral-500" style={{ left: `${(m / scale.barMax) * 100}%` }} />)}
                </div>
                {note && <div className="mt-0.5 text-[11px] text-neutral-500">{note(r.id)}</div>}
              </button>
              {sel === r.id && expand && expand(r.id)}
              {sel === r.id && find && (
                <button onClick={() => find.go(r.id)} className="mx-1.5 mb-2 rounded-lg bg-neutral-700 px-3 py-1.5 text-xs text-neutral-100 active:bg-neutral-600">
                  {find.label} на «{r.name}»
                </button>
              )}
            </div>
          );
        })}
      </div>
      {idle.length > 0 && (
        <div className="mt-3 px-1.5" data-testid="no-load">
          <div className="mb-1 text-[11px] text-neutral-500">Без нагрузки — тап, чтобы подобрать:</div>
          <div className="flex flex-wrap gap-1.5">
            {idle.map((it) => (
              <button key={it.id} onClick={() => find.go(it.id)} className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 active:bg-neutral-700">
                {it.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// What made up a picked row's load, most first: entries [{ id, name, tag, text, value, onClick? }]
export function ByList({ title, entries }) {
  return (
    <div className="px-1.5 pb-2" data-testid="muscle-exercises">
      <div className="mb-1 text-[11px] text-neutral-500">{title}:</div>
      {entries.slice().sort((a, b) => b.value - a.value).map((e) => {
        const row = <>
          <span className="min-w-0 flex-1 truncate text-neutral-200">{e.name}</span>
          {e.tag && <span className="text-[11px] text-neutral-500">{e.tag}</span>}
          <span className="w-16 shrink-0 text-right tabular-nums text-neutral-300">{e.text}</span>
        </>;
        // a row opens something only when it can; otherwise it doesn't pretend to be a button
        return e.onClick ? <button key={e.id} onClick={e.onClick} className="flex w-full items-center gap-2 rounded-md py-1 text-left text-xs active:bg-neutral-700">{row}</button>
          : <div key={e.id} className="flex w-full items-center gap-2 py-1 text-xs">{row}</div>;
      })}
    </div>
  );
}

// the "?" next to a panel's title that shows how its numbers are counted
export function WhyButton({ on, toggle }) {
  return (
    <button onClick={toggle} aria-label="Как считается"
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${on ? "bg-neutral-600 text-white" : "bg-neutral-800"}`}>?</button>
  );
}
