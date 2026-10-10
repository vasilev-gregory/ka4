// One exercise of the running workout, on the shared exercise block (ui/ExerciseCard ExerciseRow: foldable by a tap):
// title with last time's sets, column titles, set rows, and either "add set" or the bar for the selected sets.
import { GripVertical, RefreshCw, Trash2, TrendingUp } from "lucide-react";
import { foldSummary, fmtSets, setLabels } from "../../model/workout.js";
import { stepText } from "../../model/progression.js";
import { ExerciseRow } from "../../ui/ExerciseCard.jsx";
import { SetRow } from "./SetRow.jsx";

const colTitle = (c, ex) =>
  ex.kind === "cardio" ? (c === "r" ? "мин" : "км")
    : c === "w" ? (ex.assist ? "помощь" : ex.bw ? "+кг" : "кг")
    : c === "r" ? (ex.kind === "time" ? "сек" : "повт.")
      : c === "p" ? (ex.kind === "time" ? "" : "частич.") : "RIR";

// g: gesture bindings from ActiveWorkout; sel: {ei, set} while selecting sets; act: the card's actions;
// step: the progression step when the exercise has stalled (model/progression nextStep); fold: the screen's useFolds
export function ExerciseCard({ e, ei, ex, exData, last, step, records, cols, rirOn, compact, sort, sortCount, g, sel, rests, liveKey, liveMs, act, open, fold }) {
  const labels = setLabels(e.sets);
  const cardio = ex.kind === "cardio";
  const exCols = cardio ? ["r", "w"] : cols; // cardio: minutes and km, whatever the strength columns are
  const selHere = sel && sel.ei === ei ? sel : null;
  // the title row swipes: left = remove the exercise (with undo), right = replace it
  const pulled = g.exSwipe && g.exSwipe.key === `ex:${ei}` ? g.exSwipe : null;
  return (
    <div ref={sort.itemRef(ei)} style={sort.itemStyle(ei)} className="relative mb-3 overflow-hidden rounded-xl">
      {pulled && (
        <div className={`absolute inset-0 flex items-start px-4 pt-6 text-xs font-semibold ${
          pulled.dx > 0 ? "justify-start bg-neutral-700 text-neutral-100" : "justify-end bg-red-600 text-white"}`}>
          {pulled.dx > 0 ? "Заменить" : "Убрать"}
        </div>
      )}
      <div style={{ transform: pulled ? `translateX(${pulled.dx}px)` : undefined, transition: pulled ? "none" : "transform 150ms" }} className="relative">
        <ExerciseRow ex={exData} onClick={() => open({ type: "exercise", id: e.exerciseId })} compact={compact} lifted={sort.dragFrom === ei}
          fold={fold(e.exerciseId, foldSummary(e.sets, ex.kind))}
          headProps={{ ...g.exSwipeBind(`ex:${ei}`, (dir) => (dir < 0 ? act.remove() : act.replace())), style: { touchAction: "pan-y" } }}
          lead={<button {...sort.handleProps(ei, sortCount)} className="-ml-1 cursor-grab p-1 text-neutral-500" aria-label="Перетащить"><GripVertical size={20} /></button>}
          text={last && `Прошлый раз: ${fmtSets(last.sets, ex.kind)}`} note={step && <StepNote t={stepText(step, ex)} />}
          right={<>
            <button onClick={act.replace} className="p-1.5 text-neutral-500" aria-label="Заменить"><RefreshCw size={18} /></button>
            <button onClick={act.remove} className="p-1.5 text-neutral-500" aria-label="Убрать упражнение"><Trash2 size={18} /></button>
          </>}>
          {/* hold a column title and slide it to reorder columns for all exercises */}
          <div className="flex items-center gap-1 px-1 text-[11px] text-neutral-500">
            <span className="w-7" />
            {exCols.map((c) => (
              <span key={c} {...(cardio ? {} : g.headerProps(ei, c, cols))}
                className={`${c === "w" || c === "r" ? "flex-1" : "w-9"} rounded-sm py-1 text-center ${
                  g.colDrag && g.colDrag.group === ei ? (g.colDrag.key === c ? "bg-accent-400 text-black" : cols[g.colDrag.to] === c ? "bg-neutral-700 text-neutral-200" : "") : ""}`}>
                {colTitle(c, ex)}
              </span>
            ))}
            <span className="w-11" />
          </div>
          {e.sets.map((s, si) => {
            const key = `${ei}:${si}`;
            return (
              <SetRow key={si} s={s} ex={ex} cols={exCols} rirOn={rirOn && !cardio} label={labels[si]}
                grouped={!!(s.g && si > 0 && e.sets[si - 1].g === s.g)}
                selected={!!(selHere && selHere.set.has(si))}
                rest={rests[key]} live={liveKey === key ? liveMs : null} record={records.has(si)}
                swipe={g.swipe && g.swipe.key === key ? g.swipe : null}
                swipeProps={g.swipeBind(key, (dir) => act.swipeSet(si, dir))}
                numberProps={g.numberProps(si)}
                edit={(patch) => act.editSet(si, patch)} toggle={() => act.toggleSet(si)} rir={(n) => act.rirSet(si, n)} />
            );
          })}
          {selHere ? (
            <div className="mt-2 rounded-lg bg-neutral-800 p-2 text-xs">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-neutral-300">Выбрано: {selHere.set.size}</span>
                <button onClick={act.cancelSelection} className="px-1 text-neutral-400">Отмена</button>
              </div>
              <div className="flex gap-1.5">
                <button disabled={selHere.set.size < 2} onClick={act.mergeSelected} className="flex-1 rounded-md bg-accent-400 py-2 font-semibold text-black disabled:opacity-40">Объединить</button>
                <button onClick={act.unmergeSelected} className="flex-1 rounded-md bg-neutral-700 py-2">Разъединить</button>
                <button onClick={act.deleteSelected} className="flex-1 rounded-md bg-red-600 py-2 text-white">Удалить</button>
              </div>
            </div>
          ) : (
            <button onClick={act.addSet} className="mt-2 w-full rounded-lg py-2 text-xs text-neutral-400 active:bg-neutral-800">{cardio ? "Добавить отрезок" : "Добавить подход"}</button>
          )}
        </ExerciseRow>
      </div>
    </div>
  );
}

// a stalled exercise: how long the same, and today's step (already in the grey hints)
function StepNote({ t }) {
  return (
    <div className="mt-0.5 text-xs text-accent-300" data-testid="progress-step">
      <TrendingUp size={12} className="mr-1 inline -mt-0.5" />
      {t.was} — сегодня {t.now} ({t.why})
    </div>
  );
}
