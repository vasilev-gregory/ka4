// Settings: app update, mode, storage protection, strength/stretch preferences, backups.
import { useState, useEffect, useRef } from "react";
import { GripVertical } from "lucide-react";
import { storage } from "../storage.js";
import { beep, unlockAudio } from "../core/sound.js";
import { fmtDate, fmtDur, fmtNum, num } from "../core/util.js";
import { hardRefresh, shareBackup } from "../model/backup.js";
import { COLUMNS, ST_DEFAULTS, ST_FIELDS } from "../model/catalog.js";
import { migrate } from "../model/state.js";
import { columnConfig } from "../model/workout.js";
import { ConfirmButton, Header, SecStepper, Stepper, useApp } from "../ui/kit.jsx";
import { moveItem, useSortable } from "../ui/sortable.js";

export function StorageStatus() {
  const [st, setSt] = useState(null);
  const refresh = async () => {
    const out = { persisted: null, usage: null, quota: null };
    try { if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted(); } catch (e) {}
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; out.quota = e.quota; } } catch (e) {}
    setSt(out);
  };
  useEffect(() => { refresh(); }, []);
  const [asked, setAsked] = useState(false);
  const ask = async () => {
    let ok = false;
    try { if (navigator.storage && navigator.storage.persist) ok = await navigator.storage.persist(); } catch (e) {}
    setAsked(true);
    await refresh();
    window.dispatchEvent(new Event("kach-persist-changed"));
    return ok;
  };
  if (!st) return null;
  const mb = (b) => (b == null ? "?" : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} КБ` : `${(b / 1048576).toFixed(1)} МБ`);
  return (
    <div className="mb-3 rounded-xl bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Хранилище</div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.persisted ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"}`}>
          {st.persisted ? "защищено" : st.persisted === false ? "не защищено" : "неизвестно"}
        </span>
      </div>
      <div className="mt-1 text-xs text-neutral-400">Занято {mb(st.usage)}{st.quota ? ` из ${mb(st.quota)}` : ""}</div>
      {!st.persisted && (
        <>
          <p className="mt-2 text-xs text-neutral-500">
            «Защищено» — браузер обещает не удалять данные приложения сам. Пока защиты нет, раз в неделю приходит напоминание о бэкапе.
          </p>
          <button onClick={ask} className="mt-2 w-full rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-black">Запросить защиту хранилища</button>
          {asked && !st.persisted && (
            <p className="mt-2 text-xs text-neutral-400">
              {navigator.storage && navigator.storage.persist
                ? "Браузер отказал. Обычно помогает: открывать приложение с иконки на экране «Домой» и пользоваться им регулярно, потом запросить ещё раз."
                : "Этот браузер не умеет защищать хранилище. Остаются бэкапы файлом."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function UpdateButton() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    setMsg("Проверяю…");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
      const v = await res.json();
      if (v.version === __VERSION__) { setMsg(`У тебя последняя версия, ${__VERSION__}`); setBusy(false); return; }
      setMsg(`Есть версия ${v.version} (у тебя ${__VERSION__}), обновляю…`);
    } catch (e) {
      setMsg("Не получилось проверить, обновляю принудительно…");
    }
    setTimeout(hardRefresh, 600);
  };
  return (
    <div className="mb-6">
      <button disabled={busy} onClick={check} className="w-full rounded-xl bg-neutral-900 py-3 font-semibold active:bg-neutral-800 disabled:opacity-60">
        Обновить приложение
      </button>
      {msg && (
        <p className="mt-2 text-xs text-neutral-400">
          {msg}
          {msg.startsWith("У тебя") && <button onClick={hardRefresh} className="ml-2 underline">всё равно перезагрузить</button>}
        </p>
      )}
    </div>
  );
}

export function ColumnsSettings({ data, up }) {
  const cfg = columnConfig(data.settings);
  const sort = useSortable((from, to) => up((d) => { const c = columnConfig(d.settings); moveItem(c, from, to); d.settings.columns = c; }));
  const toggleCol = (key) => up((d) => { const c = columnConfig(d.settings); const it = c.find((x) => x.key === key); it.on = !it.on; d.settings.columns = c; });
  return (
    <div className="mb-6">
      <h2 className="mb-1 font-semibold">Колонки подхода</h2>
      <p className="mb-2 text-xs text-neutral-500">Перетаскивай за ⋮⋮, чтобы поменять порядок. Вес и повторы выключить нельзя.</p>
      <div className="space-y-1.5">
        {cfg.map((c, i) => {
          const fixed = c.key === "w" || c.key === "r";
          return (
            <div key={c.key} ref={(el) => { sort.refs.current[i] = el; }} style={sort.itemStyle(i)}
              className={`flex items-center gap-2 rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
              <button {...sort.handleProps(i, cfg.length)} className="cursor-grab p-1 text-neutral-500" aria-label="Перетащить"><GripVertical size={18} /></button>
              <span className={`flex-1 ${c.on || fixed ? "" : "text-neutral-500"}`}>{COLUMNS[c.key]}</span>
              {fixed ? <span className="px-3 text-xs text-neutral-600">всегда</span> : (
                <button onClick={() => toggleCol(c.key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${c.on ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-400"}`}>
                  {c.on ? "вкл" : "выкл"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsTab({ data, up, replace, saved, back, setMode }) {
  const { bwAt } = useApp();
  const [exp, setExp] = useState("");
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState("");
  const doExport = async () => {
    const txt = JSON.stringify({ ...data, exportedAt: new Date().toISOString() });
    setExp(txt);
    try { await navigator.clipboard.writeText(txt); setMsg("Скопировано в буфер обмена"); up((d) => { d.settings.lastBackupAt = Date.now(); }); }
    catch (e) { setMsg("Скопируй текст из поля вручную"); }
  };
  const [pending, setPending] = useState(null); // backup read from a file, waiting for confirmation
  const fileRef = useRef(null);
  const shareFile = async () => {
    const r = await shareBackup(data);
    if (r === "cancelled") return;
    up((d) => { d.settings.lastBackupAt = Date.now(); });
    setMsg(r === "shared" ? "Файл отправлен" : "Файл сохранён в загрузки");
  };
  const pickFile = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.exercises) || !Array.isArray(d.programs) || !Array.isArray(d.workouts)) throw new Error();
      setPending(d);
      setMsg("");
    } catch (e) { setMsg("Это не похоже на копию из приложения"); }
  };
  const doImport = () => {
    try {
      const d = JSON.parse(imp);
      if (!Array.isArray(d.exercises) || !Array.isArray(d.programs) || !Array.isArray(d.workouts)) throw new Error();
      replace(migrate({ settings: { restSec: 120 }, active: null, ...d }));
      setImp(""); setMsg("Данные загружены");
    } catch (e) { setMsg("Это не похоже на экспорт из приложения"); }
  };
  return (
    <div className="p-4 pb-28">
      <Header title="Настройки" back={back} />
      <p className="-mt-3 mb-4 text-xs text-neutral-400">
        Версия {__VERSION__} от {new Date(__BUILD_TIME__).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
      <UpdateButton />
      <div className="mb-3 rounded-xl bg-neutral-900 p-4">
        <div className="mb-2 font-semibold">Режим</div>
        <div className="flex gap-1.5">
          {[["strength", "Сила", "bg-amber-400"], ["stretch", "Растяжка", "bg-teal-400"]].map(([k, l, c]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${(data.settings.mode || "strength") === k ? `${c} text-black` : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Быстрее: смахни нижнюю панель вкладок влево или вправо.</p>
      </div>
      {data.settings.mode === "stretch" && (
        <div className="mb-6 rounded-xl bg-neutral-900 p-4">
          <div className="mb-2 font-semibold">Растяжка по умолчанию</div>
          <div className="space-y-1.5">
            {ST_FIELDS.map(([k, l]) => (
              <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span>
                <SecStepper value={(data.stretch.defaults || ST_DEFAULTS)[k]} onChange={(v) => up((d) => { d.stretch.defaults = { ...ST_DEFAULTS, ...(d.stretch.defaults || {}), [k]: v }; })} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">Подставляется в новые программы растяжки.</p>
        </div>
      )}
      <p className={`-mt-2 mb-4 text-xs ${saved.state === "error" ? "text-red-400" : "text-neutral-500"}`}>
        {saved.state === "error" ? `Не сохраняется: ${saved.msg}`
          : saved.at ? `Сохранено в ${new Date(saved.at).toLocaleTimeString("ru-RU")}` : "Изменений пока не было"}
      </p>
      {data.settings.mode !== "stretch" && (<>
      <div className="mb-3 rounded-xl bg-neutral-900 p-4">
        <div className="mb-2 font-semibold">Названия упражнений</div>
        <div className="flex gap-1.5">
          {[[true, "сначала русские"], [false, "сначала английские"]].map(([v, l]) => (
            <button key={l} onClick={() => up((d) => { d.settings.namesRu = v; })}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${!!data.settings.namesRu === v ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
          ))}
        </div>
      </div>
      {(() => {
        const measured = (data.measurements || []).some((m) => num(m.values && m.values.weight) > 0);
        return (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-4">
            <div>
              <div className="font-semibold">Вес тела</div>
              <div className="text-xs text-neutral-400">
                {measured ? "Из последнего замера, меняется во вкладке «Замеры»" : "Пока нет замеров. Нужен для подтягиваний, брусьев, отжиманий"}
              </div>
            </div>
            {measured ? (
              <span className="shrink-0 text-base font-semibold tabular-nums">{fmtNum(bwAt(Date.now()))} кг</span>
            ) : (
              <input value={data.settings.bodyWeight || ""} inputMode="decimal" placeholder="кг"
                onChange={(e) => up((d) => { d.settings.bodyWeight = e.target.value; })}
                className="w-20 rounded-lg bg-black px-2 py-2 text-right tabular-nums outline-none placeholder-neutral-600 focus:ring-2 focus:ring-amber-400" />
            )}
          </div>
        );
      })()}
      <button onClick={() => up((d) => { d.settings.countdown = d.settings.countdown === false; if (d.active && d.settings.countdown === false) d.active.restEndsAt = null; })}
        className="mb-3 flex w-full items-center justify-between rounded-xl bg-neutral-900 p-4 text-left">
        <div>
          <div className="font-semibold">Обратный отсчёт после подхода</div>
          <div className="text-xs text-neutral-400">Секундомер отдыха живёт в колонке «отдых», включается вместе с ней</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.settings.countdown === false ? "bg-neutral-800 text-neutral-400" : "bg-amber-400 text-black"}`}>
          {data.settings.countdown === false ? "выкл" : "вкл"}
        </span>
      </button>
      <div className={`mb-6 flex items-center justify-between rounded-xl bg-neutral-900 p-4 ${data.settings.countdown === false ? "opacity-40" : ""}`}>
        <div><div className="font-semibold">Отдых между подходами</div><div className="text-xs text-neutral-400">Для обратного отсчёта</div></div>
        <Stepper value={data.settings.restSec} step={15} min={15} fmt={(v) => fmtDur(v * 1000)}
          onChange={(v) => up((d) => { d.settings.restSec = v; })} />
      </div>
      </>)}
      <button onClick={() => { unlockAudio(); up((d) => { d.settings.sound = d.settings.sound === false; }); if (data.settings.sound === false) beep(); }}
        className={`${data.settings.mode === "stretch" ? "" : "-mt-4"} mb-6 flex w-full items-center justify-between rounded-xl bg-neutral-900 p-4 text-left`}>
        <div>
          <div className="font-semibold">Звук таймера</div>
          <div className="text-xs text-neutral-400">Щелчки 3-2-1 и сигналы{data.settings.mode === "stretch" ? " в плеере растяжки" : " в конце отдыха"}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.settings.sound === false ? "bg-neutral-800 text-neutral-400" : "bg-amber-400 text-black"}`}>
          {data.settings.sound === false ? "выкл" : "вкл"}
        </span>
      </button>

      {data.settings.mode !== "stretch" && <ColumnsSettings data={data} up={up} />}

      <StorageStatus />
      <h2 className="mb-2 font-semibold">Резервная копия</h2>
      <p className="mb-2 text-xs text-neutral-500">
        {data.settings.lastBackupAt ? `Последняя копия: ${fmtDate(data.settings.lastBackupAt)}` : "Копий ещё не было"}
      </p>
      <button onClick={shareFile} className="mb-2 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black">Отправить копию файлом</button>
      <button onClick={() => fileRef.current && fileRef.current.click()} className="mb-2 w-full rounded-xl bg-neutral-900 py-3 active:bg-neutral-800">
        Загрузить копию из файла
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} className="hidden" />
      {pending && (
        <div className="mb-3 rounded-xl bg-neutral-900 p-3 text-xs">
          <p className="mb-2 text-neutral-300">
            В файле: тренировок {pending.workouts.length}, программ {pending.programs.length}
            {pending.exportedAt ? `, сохранено ${fmtDate(Date.parse(pending.exportedAt))}` : ""}. Текущие данные будут заменены.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPending(null)} className="rounded-lg bg-neutral-800 px-4 py-2.5 text-neutral-300">Отмена</button>
            <button onClick={() => { replace(migrate({ settings: { restSec: 120 }, active: null, ...pending })); setPending(null); setMsg("Данные загружены"); }}
              className="flex-1 rounded-lg bg-red-600 py-2.5 font-semibold text-white">Заменить</button>
          </div>
        </div>
      )}
      <p className="mb-2 mt-4 text-xs text-neutral-500">Или текстом:</p>
      <button onClick={doExport} className="w-full rounded-xl bg-neutral-900 py-3 active:bg-neutral-800">Скопировать все данные</button>
      {exp && <textarea readOnly value={exp} onFocus={(e) => e.target.select()} className="mt-2 h-24 w-full rounded-xl bg-neutral-900 p-3 text-xs text-neutral-400" />}

      <textarea value={imp} onChange={(e) => setImp(e.target.value)} placeholder="Вставь сюда сохранённую копию"
        className="mt-4 h-24 w-full rounded-xl bg-neutral-900 p-3 text-xs outline-none placeholder-neutral-500 focus:ring-2 focus:ring-amber-400" />
      {imp && (
        <ConfirmButton onConfirm={doImport} confirmText="Заменить всё текущее?"
          className="mt-2 w-full rounded-xl bg-neutral-800 py-3" armedClassName="mt-2 w-full rounded-xl bg-red-600 py-3 text-white">
          Загрузить копию
        </ConfirmButton>
      )}
      {msg && <p className="mt-3 text-xs text-amber-400">{msg}</p>}
    </div>
  );
}
