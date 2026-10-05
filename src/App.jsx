import { useState, useEffect, useRef, useMemo } from "react";
import { Dumbbell, History, Settings, X, Ruler, PersonStanding } from "lucide-react";
import { unlockAudio } from "./core/sound.js";
import { MeasureEditor, MeasuresTab } from "./measures/Measures.jsx";
import { BACKUP_EVERY, backupDue, shareBackup } from "./model/backup.js";
import { usePersistentData } from "./model/usePersistentData.js";
import { makeBodyWeightAt, makeNames } from "./model/workout.js";
import { SettingsTab } from "./settings/Settings.jsx";
import { ExerciseDetail } from "./strength/ExerciseDetail.jsx";
import { HistoryTab, WorkoutDetail } from "./strength/History.jsx";
import { ProgramEditor } from "./strength/ProgramEditor.jsx";
import { RestBar, WorkoutTab } from "./strength/Workout.jsx";
import { StretchEditor, StretchHistory, StretchHome, StretchPlayer } from "./stretch/Stretch.jsx";
import { AppCtx, ConfirmButton } from "./ui/kit.jsx";

// App shell: tabs, a stack of detail screens on top, strength/stretch mode, global overlays.
export const TABS = [
  ["workout", "Тренировка", Dumbbell],
  ["history", "История", History],
  ["measures", "Замеры", Ruler],
  ["settings", "Настройки", Settings],
];

export default function App() {
  const { data, setData, err, saved, reload, startFresh } = usePersistentData();
  const [tab, setTab] = useState("workout");
  const [stack, setStack] = useState([]);

  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener("pointerdown", h, { passive: true });
    return () => window.removeEventListener("pointerdown", h);
  }, []);

  // with protected (persistent) storage the weekly backup reminder is not shown
  const [persistedOk, setPersistedOk] = useState(null);
  useEffect(() => {
    const check = () => { try { navigator.storage.persisted().then((v) => setPersistedOk(!!v)).catch(() => setPersistedOk(false)); } catch (e) { setPersistedOk(false); } };
    check();
    window.addEventListener("kach-persist-changed", check);
    return () => window.removeEventListener("kach-persist-changed", check);
  }, []);
  const appCtx = useMemo(() => (data ? {
    bwAt: makeBodyWeightAt(data.measurements || [], data.settings.bodyWeight || 0),
    ...makeNames(!!data.settings.namesRu),
  } : null), [data && data.measurements, data && data.settings.bodyWeight, data && data.settings.namesRu]);
  const navSw = useRef(null);
  const navJust = useRef(false);
  const [modeToast, setModeToast] = useState(false);
  useEffect(() => { if (!modeToast) return; const t = setTimeout(() => setModeToast(false), 700); return () => clearTimeout(t); }, [modeToast]);
  const switchMode = (to) => {
    setStack([]);
    setData((d0) => { const d = structuredClone(d0); d.settings.mode = to || (d.settings.mode === "stretch" ? "strength" : "stretch"); return d; });
    setModeToast(true);
  };

  const up = (fn) => setData((d) => { const c = structuredClone(d); fn(c); return c; });
  const exMap = useMemo(() => (data ? Object.fromEntries(data.exercises.map((e) => [e.id, e])) : {}), [data?.exercises]);
  const open = (v) => setStack((s) => [...s, v]);
  const back = () => setStack((s) => s.slice(0, -1));

  if (err) return (
    <div className="min-h-screen bg-black p-6 text-neutral-100">
      <p className="mb-4 whitespace-pre-wrap text-xs text-neutral-400">{err}</p>
      <button onClick={reload} className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-black">Попробовать ещё раз</button>
      <ConfirmButton onConfirm={startFresh} confirmText="Старые данные будут перезаписаны"
        className="mt-3 w-full py-3 text-neutral-500" armedClassName="mt-3 w-full rounded-xl bg-red-600 py-3 text-white">
        Начать с чистого листа
      </ConfirmButton>
    </div>
  );
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-400">Загружаю…</div>;

  const view = stack[stack.length - 1];
  const common = { data, up, exMap, open, back };
  // swipe the tab bar sideways to switch strength <-> stretching
  const navSwipe = {
    style: { touchAction: "pan-y" },
    onPointerDown: (e) => { navSw.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e) => {
      const st0 = navSw.current; navSw.current = null;
      if (!st0) return;
      const dx = e.clientX - st0.x, dy = e.clientY - st0.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navJust.current = true; setTimeout(() => { navJust.current = false; }, 80);
        switchMode();
      }
    },
    onClickCapture: (e) => { if (navJust.current) { e.stopPropagation(); e.preventDefault(); } },
  };
  let content;
  const stretchMode = data.settings.mode === "stretch";
  if (view?.type === "stretchProgram") content = <StretchEditor {...common} id={view.id} />;
  else if (view?.type === "stretchPlay") content = <StretchPlayer {...common} id={view.id} />;
  else if (view?.type === "settings") content = <SettingsTab data={data} up={up} saved={saved} back={back} setMode={switchMode} replace={(d) => { setData(d); setStack([]); }} />;
  else if (view?.type === "measure") content = <MeasureEditor {...common} id={view.id} />;
  else if (view?.type === "exercise") content = <ExerciseDetail {...common} id={view.id} />;
  else if (view?.type === "workout") content = <WorkoutDetail {...common} id={view.id} />;
  else if (view?.type === "program") content = <ProgramEditor {...common} id={view.id} goWorkout={() => { setStack([]); setTab("workout"); }} />;
  else if (tab === "workout") content = stretchMode ? <StretchHome {...common} /> : <WorkoutTab {...common} />;
  else if (tab === "history") content = stretchMode ? <StretchHistory {...common} /> : <HistoryTab {...common} />;
  else if (tab === "settings") content = <SettingsTab data={data} up={up} saved={saved} setMode={switchMode} replace={(d) => { setData(d); setStack([]); }} />;
  else if (tab === "measures") content = <MeasuresTab {...common} openSettings={() => open({ type: "settings" })} />;

  const showBackupNag = tab === "workout" && !view && !data.active && persistedOk === false && backupDue(data);
  const nagShare = async () => {
    const r = await shareBackup(data);
    if (r !== "cancelled") up((d) => { d.settings.lastBackupAt = Date.now(); });
  };
  return (
    <AppCtx.Provider value={appCtx}>
    <div className={`min-h-screen bg-black text-sm text-neutral-100 ${stretchMode ? "mode-stretch" : ""}`}>
      {saved.state === "error" && (
        <div className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-xs text-white">
          Изменения не сохраняются. Сделай копию в настройках.
        </div>
      )}
      {showBackupNag && (
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <div className="min-w-0 flex-1 text-xs text-neutral-300">
              {data.settings.lastBackupAt
                ? `Копии не было ${Math.floor((Date.now() - data.settings.lastBackupAt) / 864e5)} дн.`
                : "Ещё не было ни одной копии данных."} Отправь файл себе в Telegram.
            </div>
            <button onClick={nagShare} className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black">Отправить</button>
            <button onClick={() => up((d) => { d.settings.lastBackupAt = Date.now() - BACKUP_EVERY + 864e5; })} className="shrink-0 p-1 text-neutral-500" aria-label="Напомнить завтра"><X size={16} /></button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-md pb-20">{content}</div>

      {data.active?.restEndsAt && <RestBar key={data.active.restEndsAt} endsAt={data.active.restEndsAt} total={data.settings.restSec} up={up} sound={data.settings.sound !== false} />}

      {modeToast && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className={`rounded-2xl px-6 py-4 text-lg font-bold shadow-xl ${stretchMode ? "bg-teal-400 text-black" : "bg-amber-400 text-black"}`}>
            {stretchMode ? "Растяжка" : "Сила"}
          </div>
        </div>
      )}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black" {...navSwipe}>
        <div className="mx-auto flex max-w-md">
          {TABS.map(([k, l, I0]) => { const I = k === "workout" && stretchMode ? PersonStanding : I0; return (
            <button key={k} onClick={() => { setTab(k); setStack([]); }}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${tab === k && !view ? (stretchMode ? "text-teal-400" : "text-amber-400") : "text-neutral-500"}`}>
              <I size={20} />
              {l}
              {k === "workout" && data.active && <span className="absolute right-1/4 top-1.5 h-2 w-2 rounded-full bg-amber-400" />}
            </button>
          ); })}
        </div>
      </nav>
    </div>
    </AppCtx.Provider>
  );
}
