// App shell: loads the data, then tabs with a stack of detail screens on top, strength / stretching
// mode, and the global overlays (save error, backup reminder, rest countdown, mode toast).
import { useState, useEffect, useMemo } from "react";
import { unlockAudio } from "./core/sound.js";
import { MeasureEditor, MeasuresTab } from "./measures/Measures.jsx";
import { usePersistentData } from "./model/usePersistentData.js";
import { makeBodyWeightAt, makeNames } from "./model/workout.js";
import { SettingsTab } from "./settings/SettingsTab.jsx";
import { BackupNag } from "./shell/BackupNag.jsx";
import { SharedImport } from "./shell/SharedImport.jsx";
import { TabBar } from "./shell/TabBar.jsx";
import { ExerciseDetail } from "./strength/ExerciseDetail.jsx";
import { WorkoutDetail } from "./strength/History.jsx";
import { HistoryTab } from "./strength/HistoryTab.jsx";
import { ProgramEditor } from "./strength/ProgramEditor.jsx";
import { RestBar } from "./strength/workout/RestBar.jsx";
import { WorkoutTab } from "./strength/workout/WorkoutTab.jsx";
import { StretchEditor } from "./stretch/StretchEditor.jsx";
import { StretchHistory } from "./stretch/StretchHistory.jsx";
import { StretchSession } from "./stretch/StretchSession.jsx";
import { StretchHome } from "./stretch/StretchHome.jsx";
import { StretchRun } from "./stretch/StretchRun.jsx";
import { playProgram, playQuick } from "./model/stretchRunActions.js";
import { AppCtx, Button, ConfirmButton } from "./ui/kit.jsx";
import { useNavigation } from "./ui/navigation.js";

export default function App() {
  const { data, update, replace, err, saved, reload, startFresh } = usePersistentData();
  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener("pointerdown", h, { passive: true });
    return () => window.removeEventListener("pointerdown", h);
  }, []);

  if (err) return (
    <div className="min-h-screen bg-black p-6 text-neutral-100">
      <p className="mb-4 whitespace-pre-wrap text-xs text-neutral-400">{err}</p>
      <Button block onClick={reload}>Попробовать ещё раз</Button>
      <ConfirmButton onConfirm={startFresh} confirmText="Старые данные будут перезаписаны"
        className="mt-3 w-full py-3 text-neutral-500" armedClassName="mt-3 w-full rounded-xl bg-red-600 py-3 text-white">
        Начать с чистого листа
      </ConfirmButton>
    </div>
  );
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-400">Загружаю…</div>;
  return <Shell data={data} up={update} replace={replace} saved={saved} />;
}

function Shell({ data, up, replace, saved }) {
  const nav = useNavigation();
  const { tab, view, open, back } = nav;
  const stretchMode = data.settings.mode === "stretch";
  // stretching screens only get the stretching part of the data
  const upStretch = (fn) => up((d) => { fn(d.stretch); });

  const { measurements, exercises } = data;
  const { bodyWeight, namesRu } = data.settings;
  const appCtx = useMemo(() => ({ bwAt: makeBodyWeightAt(measurements || [], bodyWeight || 0), ...makeNames(namesRu !== false) }), [measurements, bodyWeight, namesRu]);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const [modeToast, setModeToast] = useState(false);
  useEffect(() => { if (!modeToast) return; const t = setTimeout(() => setModeToast(false), 700); return () => clearTimeout(t); }, [modeToast]);
  const switchMode = (to) => {
    nav.reset();
    up((d) => { d.settings.mode = to || (d.settings.mode === "stretch" ? "strength" : "stretch"); });
    setModeToast(true);
  };
  const restore = (d) => { replace(d); nav.reset(); };

  // the stretching run lives in the data; the app only keeps whether its player is unfolded
  const [runOpen, setRunOpen] = useState(true);
  const play = (programId) => { upStretch((s) => playProgram(s, programId, Date.now())); setRunOpen(true); };
  const playNow = (exerciseIds) => { upStretch((s) => playQuick(s, exerciseIds, Date.now())); setRunOpen(true); };

  const common = { data, up, exMap, open, back };
  const stretchProps = { stretch: data.stretch, upStretch, open, back, play, playNow };
  const settings = (close) => <SettingsTab data={data} up={up} saved={saved} back={close} setMode={switchMode} replace={restore} />;
  const SCREENS = {
    stretchProgram: (v) => <StretchEditor {...stretchProps} id={v.id} />,
    stretchSession: (v) => <StretchSession {...stretchProps} id={v.id} />,
    settings: () => settings(back),
    measure: (v) => <MeasureEditor {...common} id={v.id} />,
    exercise: (v) => <ExerciseDetail {...common} id={v.id} />,
    workout: (v) => <WorkoutDetail {...common} id={v.id} />,
    program: (v) => <ProgramEditor {...common} id={v.id} goWorkout={() => nav.setTab("workout")} />,
  };
  const TABS = {
    workout: () => (stretchMode ? <StretchHome {...stretchProps} /> : <WorkoutTab {...common} />),
    history: () => (stretchMode ? <StretchHistory {...stretchProps} /> : <HistoryTab {...common} />),
    measures: () => <MeasuresTab {...common} openSettings={() => open({ type: "settings" })} />,
    settings: () => <SettingsTab data={data} up={up} saved={saved} setMode={switchMode} replace={restore} />,
  };
  const content = view ? SCREENS[view.type](view) : TABS[tab]();

  return (
    <AppCtx.Provider value={appCtx}>
      <div className={`min-h-screen bg-black text-sm text-neutral-100 ${stretchMode ? "mode-stretch" : ""}`}>
        {saved.state === "error" && (
          <div className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-xs text-white">
            Изменения не сохраняются. Сделай копию в настройках.
          </div>
        )}
        <div className={`mx-auto max-w-md ${data.stretch.active && !runOpen ? "pb-40" : "pb-20"}`}>
          {content}
          {tab === "workout" && !view && !data.active && <BackupNag data={data} up={up} />}
        </div>
        {data.active?.restEndsAt && (
          <RestBar key={data.active.restEndsAt} endsAt={data.active.restEndsAt} total={data.settings.restSec} up={up} sound={data.settings.sound !== false} />
        )}
        <StretchRun stretch={data.stretch} upStretch={upStretch} sound={data.settings.sound !== false} open={runOpen} setOpen={setRunOpen} settings={settings} />
        {modeToast && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="rounded-2xl bg-accent-400 px-6 py-4 text-lg font-bold text-black shadow-xl">{stretchMode ? "Растяжка" : "Сила"}</div>
          </div>
        )}
        <SharedImport data={data} up={up} replace={restore} onImported={() => nav.setTab("history")} />
        <TabBar tab={tab} onTab={nav.setTab} onSwipe={() => switchMode()} stretchMode={stretchMode} workoutRunning={!!data.active} />
      </div>
    </AppCtx.Provider>
  );
}
