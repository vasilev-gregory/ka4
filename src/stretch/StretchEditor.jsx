// Stretching program editor on the shared parts (ui/ProgramEdit): stretches (per-stretch times; the stretch itself:
// area, photo, own ones' sides), the minutes per area they plan for, program timer, start, delete. Saved as you go.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { fmtDur, plural } from "../core/util.js";
import { ST_AREAS, ST_FIELDS, isBuiltInStretch } from "../model/catalog.js";
import { buildTimeline, stExMap, stTiming, stretchPlan } from "../model/stretch.js";
import * as S from "../model/stretchActions.js";
import { Button, ExImg, Header, PhotoPicker, SecStepper, Segmented, exPhoto } from "../ui/kit.jsx";
import { ProgramFooter, ProgramItems, ProgramName } from "../ui/ProgramEdit.jsx";
import { StretchPicker } from "./StretchPicker.jsx";
import { StretchBreakdown } from "./StretchBreakdown.jsx";

// inRun: opened over the player (its settings): no start / delete; onAppSettings opens the app's settings
export function StretchEditor({ stretch, upStretch, id, back, play, inRun = false, onAppSettings }) {
  const [picker, setPicker] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const change = (fn) => upStretch((s) => { const p = S.findProgram(s, id); if (p) fn(p); });
  const p = S.findProgram(stretch, id);
  if (!p) return <div className="p-4"><Header title="Программа удалена" back={back} /></div>;
  const exMap = stExMap(stretch);
  const T = stTiming(p);
  const tl = buildTimeline(p, exMap);
  const total = tl.reduce((x, ph) => x + ph.dur, 0);
  const plan = stretchPlan(p, exMap);
  const setT = (k, v) => change((pp) => S.setProgramTiming(pp, k, v));

  return (
    <div className="p-4 pb-28">
      <Header title={inRun ? "Настройки программы" : "Программа растяжки"} back={back} />
      {inRun && <p className="-mt-3 mb-3 text-xs text-neutral-500">Изменения сразу идут в эту растяжку и сохраняются в программе.</p>}
      <ProgramName value={p.name} onChange={(name) => change((pp) => { pp.name = name; })} />
      <ProgramItems items={p.items} change={change} removed="Растяжка убрана" row={(it, i) => {
        const ex = exMap[it.exerciseId];
        const t = stTiming(p, it);
        const isOpen = openItem === i;
        return {
          body: <>
            {ex && exPhoto(ex) && <ExImg ex={ex} size={34} />}
            <button onClick={() => setOpenItem(isOpen ? null : i)} className="ml-1 min-w-0 flex-1 py-1 text-left">
              <div className="truncate">{ex ? ex.ru || ex.name : "Удалённая растяжка"}</div>
              <div className={`truncate text-xs ${it.over && Object.keys(it.over).length ? "text-accent-300" : "text-neutral-500"}`}>
                {ex && ex.area ? `${ex.area} · ` : ""}{t.work} с{ex && ex.sides ? " × 2 стороны" : ""}, отдых {t.rest} с
              </div>
            </button>
          </>,
          below: isOpen && ex && <ItemPanel it={it} t={t} ex={ex} change={(fn) => change((pp) => fn(pp, i))} upStretch={upStretch} />,
        };
      }} />
      <Button variant="dashed" block onClick={() => setPicker(true)} className="mt-2">Добавить растяжку</Button>
      {p.items.length > 0 && <p className="mt-2 text-xs text-neutral-500">Тап по растяжке — своё время для неё. Серым — как в программе.</p>}
      {Object.keys(plan).length > 0 && (
        <div className="mt-4 rounded-xl bg-neutral-900 p-3">
          <div className="mb-2 font-semibold">Мышцы по плану</div>
          <StretchBreakdown areas={plan} single exMap={exMap} byNote="в этой программе" />
        </div>
      )}
      <div className="mt-4 rounded-xl bg-neutral-900 p-3">
        <button onClick={() => setTimerOpen((x) => !x)} className="flex w-full items-center justify-between text-left">
          <span>
            <span className="block text-xs text-neutral-400">Таймер программы</span>
            <span className="text-sm">
              {T.prep} / {T.work} / {T.sw} / {T.rest} с · {T.mode === "circuit" ? `${T.rounds} ${plural(T.rounds, "круг", "круга", "кругов")}` : `по порядку × ${T.rounds}`}
            </span>
          </span>
          <ChevronDown size={18} className={`text-neutral-500 transition-transform ${timerOpen ? "rotate-180" : ""}`} />
        </button>
        {timerOpen && (
          <div className="mt-3">
            <div className="space-y-1.5">
              {ST_FIELDS.map(([k, l]) => (
                <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span><SecStepper value={T[k]} onChange={(v) => setT(k, v)} /></div>
              ))}
            </div>
            <div className="mt-3"><Segmented options={[["circuit", "по кругу"], ["sequence", "по порядку"]]} value={T.mode} onChange={(v) => setT("mode", v)} /></div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm">{T.mode === "circuit" ? "кругов" : "повторов каждого"}</span>
              <SecStepper value={T.rounds} min={1} step={1} unit="" onChange={(v) => setT("rounds", v)} />
            </div>
            {T.mode === "circuit" && T.rounds > 1 && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-sm">отдых между кругами</span>
                <SecStepper value={T.roundRest} onChange={(v) => setT("roundRest", v)} />
              </div>
            )}
          </div>
        )}
      </div>

      {inRun ? <>
        <Button block onClick={back} className="mt-6">Продолжить растяжку</Button>
        {onAppSettings && <Button variant="quiet" block onClick={onAppSettings} className="mt-2">Общие настройки: звук и другое</Button>}
      </> : <>
        <ProgramFooter canStart={tl.length > 0} onStart={() => play(id)} onDelete={() => { upStretch((s) => S.removeProgram(s, id)); back(); }}
          startLabel={stretch.active && !stretch.active.done ? "Вернуться к растяжке" : `Начать${total ? ` · ≈ ${fmtDur(total * 1000)}` : ""}`} />
      </>}

      {picker && (
        <StretchPicker stretch={stretch} upStretch={upStretch} onClose={() => setPicker(false)} already={p.items.map((x) => x.exerciseId)}
          onPick={(list) => { change((pp) => S.addToProgram(pp, list)); setPicker(false); }} />
      )}
    </div>
  );
}

// One stretch opened in the editor: its own times (grey = as in the program), and the stretch itself
// (muscle area, photo, one side or both), which applies everywhere it's used.
function ItemPanel({ it, t, ex, change, upStretch }) {
  const updateEx = (patch) => upStretch((s) => S.updateExercise(s, ex.id, patch));
  return (
    <div className="mt-2 space-y-1.5 border-t border-neutral-800 pt-2">
      {ST_FIELDS.map(([k, l]) => {
        const own = it.over && it.over[k] != null;
        return (
          <div key={k} className="flex items-center justify-between gap-2">
            <span className={`text-sm ${own ? "" : "text-neutral-500"}`}>{l}</span>
            <div className="flex items-center gap-1">
              {own && <button onClick={() => change((pp, i) => S.clearItemTiming(pp, i, k))} className="px-1 text-[11px] text-neutral-500">как в программе</button>}
              <SecStepper value={t[k]} dim={!own} onChange={(v) => change((pp, i) => S.setItemTiming(pp, i, k, v))} />
            </div>
          </div>
        );
      })}
      <div className="mt-2 border-t border-neutral-800 pt-2 text-[11px] text-neutral-500">Сама растяжка — меняется во всех программах</div>
      <div className="mt-1 text-xs text-neutral-400">Группа мышц</div>
      <div className="flex flex-wrap gap-1.5">
        {ST_AREAS.map((ar) => (
          <button key={ar} onClick={() => updateEx({ area: ar })}
            className={`rounded-full px-2.5 py-1 text-[11px] ${ex.area === ar ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{ar}</button>
        ))}
      </div>
      <div className="mt-1 text-xs text-neutral-400">Фото</div>
      <PhotoPicker ex={ex} onChange={(v) => updateEx({ photo: v || undefined })} />
      {/* one side or two is what a stretch is: fixed for built-in ones, the user's own say it themselves */}
      {!isBuiltInStretch(ex.id) && (
        <button onClick={() => updateEx({ sides: !ex.sides })}
          className={`mt-1 rounded-full px-3 py-1 text-xs ${ex.sides ? "bg-accent-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>
          на обе стороны: {ex.sides ? "да" : "нет"}
        </button>
      )}
    </div>
  );
}
