// Body measurements: summary cards with chart, entries list, editor.
import { useState } from "react";
import { fmtDate, fmtNum, isoDay, num, numericInput, uid } from "../core/util.js";
import { MEASURES } from "../model/catalog.js";
import { Button, DeleteButton, Header, Trend } from "../ui/kit.jsx";

export function MeasuresTab({ data, open, openSettings }) {
  const [sel, setSel] = useState("weight");
  const list = (data.measurements || []).slice().sort((a, b) => a.date - b.date);
  const series = (k) => list.filter((m) => num(m.values[k]) > 0).map((m) => ({ date: m.date, v: num(m.values[k]) }));
  const selSeries = series(sel);
  const selMeta = MEASURES.find((m) => m[0] === sel);

  return (
    <div className="p-4 pb-28">
      <Header title="Замеры" />
      <Button block onClick={() => open({ type: "measure" })} className="mb-4">Новый замер</Button>

      {list.length === 0 && <p className="text-neutral-400">Здесь будут вес и объёмы. Запиши первый замер, даже если это только вес.</p>}

      {list.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {MEASURES.map(([k, label, unit]) => {
            const ser = series(k);
            if (!ser.length) return null;
            const last = ser[ser.length - 1].v;
            const diff = ser.length > 1 ? last - ser[ser.length - 2].v : 0;
            return (
              <button key={k} onClick={() => setSel(k)}
                className={`rounded-xl p-2.5 text-left ${sel === k ? "bg-neutral-800 ring-1 ring-accent-400" : "bg-neutral-900"}`}>
                <div className="text-xs text-neutral-400">{label}</div>
                <div className="text-base font-bold tabular-nums">{fmtNum(last)} <span className="text-xs font-normal text-neutral-500">{unit}</span></div>
                {diff !== 0 && <div className="text-xs tabular-nums text-neutral-400">{diff > 0 ? "+" : "−"}{fmtNum(Math.abs(diff))}</div>}
              </button>
            );
          })}
        </div>
      )}

      {selSeries.length >= 2 && (
        <div className="mb-4 rounded-xl bg-neutral-900 p-2">
          <Trend points={selSeries.map((p) => ({ t: p.date, v: p.v }))} unit={selMeta[2]} height="h-44"
            header={(shown) => `${selMeta[1]}: ${fmtNum(shown[0].v)} → ${fmtNum(shown[shown.length - 1].v)} ${selMeta[2]} с ${fmtDate(shown[0].t)}`} />
        </div>
      )}

      <div className="space-y-2">
        {list.slice().reverse().map((m) => (
          <button key={m.id} onClick={() => open({ type: "measure", id: m.id })} className="w-full rounded-xl bg-neutral-900 p-3 text-left active:bg-neutral-800">
            <div className="text-xs text-neutral-400">{fmtDate(m.date)}</div>
            <div className="text-xs tabular-nums">
              {MEASURES.filter(([k]) => num(m.values[k]) > 0).map(([k, label, unit]) => `${label} ${fmtNum(num(m.values[k]))}${unit === "%" ? "%" : ""}`).join(", ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MeasureEditor({ data, up, id, back }) {
  const existing = id ? (data.measurements || []).find((m) => m.id === id) : null;
  const [day, setDay] = useState(() => isoDay(existing ? existing.date : Date.now()));
  const [vals, setVals] = useState(existing ? { ...existing.values } : {});
  const [all, setAll] = useState(false);
  const sorted = (data.measurements || []).slice().sort((a, b) => a.date - b.date);
  const lastVal = (k) => { for (let i = sorted.length - 1; i >= 0; i--) if (sorted[i] !== existing && num(sorted[i].values[k]) > 0) return sorted[i].values[k]; return ""; };
  const save = () => {
    const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => num(v) > 0));
    const [y, mo, dd] = day.split("-").map(Number);
    const date = new Date(y, mo - 1, dd, 12).getTime();
    up((d) => {
      if (!Array.isArray(d.measurements)) d.measurements = [];
      const m = existing && d.measurements.find((x) => x.id === existing.id);
      if (m) { m.values = clean; m.date = date; } else d.measurements.push({ id: uid(), date, values: clean });
    });
    back();
  };
  // weight and whatever was ever measured; the rest behind "ещё"
  const used = new Set(["weight", ...sorted.flatMap((m) => Object.keys(m.values || {}).filter((k) => num(m.values[k]) > 0))]);
  const shown = all ? MEASURES : MEASURES.filter(([k]) => used.has(k) || vals[k]);
  const hidden = MEASURES.filter((m) => !shown.includes(m));
  return (
    <div className="p-4 pb-28">
      <Header title={existing ? "Замер" : "Новый замер"} back={back} />
      <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
        className="mb-4 w-full rounded-xl bg-neutral-900 px-3 py-3 text-neutral-100 outline-hidden focus:ring-2 focus:ring-accent-400" />
      <div className="space-y-2">
        {shown.map(([k, label, unit]) => (
          <label key={k} className="flex items-center gap-3 rounded-xl bg-neutral-900 px-3 py-1.5">
            <span className="flex-1">{label}</span>
            <input value={vals[k] || ""} inputMode="decimal" placeholder={lastVal(k) ? String(lastVal(k)) : "—"}
              onChange={(e) => { const x = numericInput(e.target.value, true); setVals((v) => ({ ...v, [k]: x })); }}
              className="w-24 rounded-lg bg-black px-2 py-2 text-right tabular-nums outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400" />
            <span className="w-6 text-xs text-neutral-500">{unit}</span>
          </label>
        ))}
      </div>
      {hidden.length > 0 && (
        <button onClick={() => setAll(true)} className="mt-2 w-full rounded-xl py-2.5 text-sm text-neutral-400 active:bg-neutral-900">
          Ещё: {hidden.map(([, l]) => l.toLowerCase()).join(", ")}
        </button>
      )}
      <p className="mt-2 text-xs text-neutral-500">Серым — прошлое значение. Заполняй только то, что мерил.</p>
      <Button block onClick={save} className="mt-4">Сохранить</Button>
      {existing && (
        <DeleteButton onConfirm={() => { up((d) => { d.measurements = d.measurements.filter((x) => x.id !== existing.id); }); back(); }} confirmText="Удалить замер?">
          Удалить замер
        </DeleteButton>
      )}
    </div>
  );
}
