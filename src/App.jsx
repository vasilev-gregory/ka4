// App shell: loads the data, then tabs with a stack of detail screens on top, strength / stretching
// mode, and the global overlays (save error, backup reminder, rest countdown, mode toast).
import { useState, useEffect, useMemo } from "react";
import { setSoundThroughSilent, unlockAudio } from "./core/sound.js";
import { MeasureEditor, MeasuresTab } from "./measures/Measures.jsx";
import { usePersistentData } from "./model/usePersistentData.js";
import { makeBodyWeightAt, makeNames, RUNNING_NOTE, runningSession } from "./model/workout.js";
import { SettingsTab } from "./settings/SettingsTab.jsx";
import { BackupNag } from "./shell/BackupNag.jsx";
import { MoveBanner } from "./shell/MoveBanner.jsx";
import { PullToRefresh } from "./ui/PullToRefresh.jsx";
import { SharedImport } from "./shell/SharedImport.jsx";
import { TabBar } from "./shell/TabBar.jsx";
import { Tour, TOUR, useTour } from "./shell/Tour.jsx";
import { ExerciseDetail } from "./strength/ExerciseDetail.jsx";
import { WorkoutDetail } from "./strength/History.jsx";
import { HistoryTab } from "./strength/HistoryTab.jsx";
import { ProgramEditor } from "./strength/ProgramEditor.jsx";
import { SplitEditor } from "./strength/SplitEditor.jsx";
import { RestBar } from "./strength/workout/RestBar.jsx";
import { WorkoutPill } from "./strength/workout/WorkoutPill.jsx";
import { WorkoutTab } from "./strength/workout/WorkoutTab.jsx";
import { StretchEditor } from "./stretch/StretchEditor.jsx";
import { StretchHistory } from "./stretch/StretchHistory.jsx";
import { StretchSession } from "./stretch/StretchSession.jsx";
import { StretchDetail } from "./stretch/StretchDetail.jsx";
import { StretchHome } from "./stretch/StretchHome.jsx";
import { StretchRun } from "./stretch/StretchRun.jsx";
import { playProgram, playQuick, setRunFolded } from "./model/stretchRunActions.js";
import { AppCtx, Button, DeleteButton, FloatingStack } from "./ui/kit.jsx";
import { applyPalettes } from "./ui/palettes.js";
import { useWakeLock } from "./ui/useWakeLock.js";
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
      <DeleteButton onConfirm={startFresh} confirmText="Старые данные будут перезаписаны">Начать с чистого листа</DeleteButton>
    </div>
  );
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-black text-neutral-400">Загружаю…</div>;
  return <Shell data={data} up={update} replace={replace} saved={saved} />;
}

function Shell({ data, up, replace, saved }) {
  const nav = useNavigation();
  const tour = useTour(data, up);
  const { tab, view, open, back } = nav;
  const stretchMode = data.settings.mode === "stretch";
  // stretching screens only get the stretching part of the data
  const upStretch = (fn) => up((d) => { fn(d.stretch); });

  // each mode's colour picked in the settings, put on <html> so portals (dial, sheets) get it too (ui/palettes)
  const { strengthColor, stretchColor } = data.settings;
  useEffect(() => { applyPalettes({ strengthColor, stretchColor }); }, [strengthColor, stretchColor]);

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

  // the stretching run lives in the data, folded or not too
  const runOpen = !(data.stretch.active && data.stretch.active.folded);
  const setRunOpen = (open) => upStretch((s) => setRunFolded(s, !open));
  // one session at a time: no stretching while a strength workout goes on (and startWorkout() refuses the other way)
  const busy = runningSession(data) === "strength" ? RUNNING_NOTE.strength : null;
  const play = (programId) => { if (!busy) upStretch((s) => playProgram(s, programId, Date.now())); };
  const playNow = (exerciseIds) => { if (!busy) upStretch((s) => playQuick(s, exerciseIds, Date.now())); };

  const sound = data.settings.sound !== false;
  useEffect(() => setSoundThroughSilent(data.settings.soundSilent !== false), [data.settings.soundSilent]);
  // strips above the tab bar: the content leaves room for them
  // «‹» in a running workout shows the programs at the tab's root; the pill leads back. Kept per workout (its start),
  // so the next one opens on itself
  const [listFor, setListFor] = useState(null);
  const workoutList = !!data.active && listFor === data.active.startedAt;
  const setWorkoutList = (on) => setListFor(on && data.active ? data.active.startedAt : null);
  const workoutPill = !!data.active && (stretchMode || tab !== "workout" || !!view || workoutList);
  const bars = (data.active?.restEndsAt ? 1 : 0) + (data.stretch.active && !runOpen ? 1 : 0) + (workoutPill ? 1 : 0);
  // the screen stays on while a strength workout runs, whatever screen is open (stretching: StretchRun)
  useWakeLock(!!data.active && !data.active.paused);

  const common = { data, up, exMap, open, back };
  const stretchProps = { stretch: data.stretch, upStretch, open, back, play, playNow, busy };
  const settings = (close) => <SettingsTab data={data} up={up} saved={saved} back={close} setMode={switchMode} replace={restore} onTour={tour.start} />;
  const SCREENS = {
    stretchProgram: (v) => <StretchEditor {...stretchProps} id={v.id} />,
    stretchSession: (v) => <StretchSession {...stretchProps} id={v.id} />,
    stretchExercise: (v) => <StretchDetail {...stretchProps} id={v.id} />,
    settings: () => settings(back),
    measure: (v) => <MeasureEditor {...common} id={v.id} />,
    exercise: (v) => <ExerciseDetail {...common} id={v.id} />,
    workout: (v) => <WorkoutDetail {...common} id={v.id} />,
    workoutNow: () => <WorkoutDetail {...common} live />, // the running workout's card as if finished now
    program: (v) => <ProgramEditor {...common} id={v.id} goWorkout={() => nav.setTab("workout")} />,
    split: (v) => <SplitEditor {...common} id={v.id} />,
  };
  const TABS = {
    workout: () => (stretchMode ? <StretchHome {...stretchProps} /> : <WorkoutTab {...common} list={workoutList} setList={setWorkoutList} />),
    history: () => (stretchMode ? <StretchHistory {...stretchProps} /> : <HistoryTab {...common} />),
    measures: () => <MeasuresTab {...common} openSettings={() => open({ type: "settings" })} />,
    settings: () => <SettingsTab data={data} up={up} saved={saved} setMode={switchMode} replace={restore} onTour={tour.start} />,
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
        <div className={`mx-auto max-w-md ${["pb-20", "pb-40", "pb-60", "pb-80"][bars]}`}>
          {!view && <MoveBanner data={data} up={up} />}
          {content}
          {tab === "workout" && !view && !data.active && <BackupNag data={data} up={up} />}
        </div>
        <PullToRefresh />
        <FloatingStack>
          {/* a session going on is always in sight: off its own screen, a pill in the corner leads back to it */}
          {workoutPill && <WorkoutPill active={data.active} onOpen={() => { if (stretchMode) switchMode("strength"); setWorkoutList(false); nav.setTab("workout"); }} />}
          <StretchRun stretch={data.stretch} upStretch={upStretch} sound={sound} open={runOpen} setOpen={setRunOpen} settings={settings} />
          {data.active?.restEndsAt && (
            <RestBar endsAt={data.active.restEndsAt} total={data.settings.restSec} up={up} sound={sound} label={stretchMode ? "Отдых · сила" : "Отдых"} />
          )}
        </FloatingStack>
        {modeToast && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="rounded-2xl bg-accent-400 px-6 py-4 text-lg font-bold text-black shadow-xl">{stretchMode ? "Растяжка" : "Сила"}</div>
          </div>
        )}
        <SharedImport data={data} up={up} replace={restore} onImported={() => nav.setTab("history")} />
        {tour.open && <Tour i={tour.i} setI={tour.setI} onTab={nav.setTab} onDone={() => { tour.done(); nav.setTab("workout"); }} />}
        <TabBar tab={tab} onTab={nav.setTab} onSwipe={() => switchMode()} stretchMode={stretchMode}
          running={!!runningSession(data)} pulse={tour.open ? TOUR[tour.i][0] : null} />
      </div>
    </AppCtx.Provider>
  );
}
