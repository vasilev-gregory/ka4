// One exercise of the running workout: title with last time's sets, column titles, set rows,
// and either "add set" or the bar for the selected sets.
import { GripVertical, RefreshCw, Trash2 } from "lucide-react";
import { fmtSets, setLabels } from "../../model/workout.js";
import { ConfirmButton, ExImg, useApp } from "../../ui/kit.jsx";
import { SetRow } from "./SetRow.jsx";

const colTitle = (c, ex) =>
  c === "w" ? (ex.assist ? "помощь" : ex.bw ? "+кг" : "кг")
    : c === "r" ? (ex.kind === "time" ? "сек" : "повт.")
      : c === "p" ? (ex.kind === "time" ? "" : "частич.") : "RIR";

// g: gesture bindings from ActiveWorkout; sel: {ei, set} while selecting sets; act: the card's actions
export function ExerciseCard({ e, ei, ex, exData, last, cols, compact, sort, sortCount, g, sel, rests, liveKey, liveMs, act, open }) {
  const { nm1, nm2 } = useApp();
  const labels = setLabels(e.sets);
  const selHere = sel && sel.ei === ei ? sel : null;
  return (
    <div ref={sort.itemRef(ei)} style={sort.itemStyle(ei)}
      className={`mb-3 rounded-xl p-3 ${sort.dragFrom === ei ? "bg-neutral-800" : "bg-neutral-900"}`}>
      <div className={`flex items-center gap-1 ${compact ? "" : "mb-2"}`}>
        <button {...sort.handleProps(ei, sortCount)} className="-ml-1 cursor-grab p-1 text-neutral-500" aria-label="Перетащить">
          <GripVertical size={20} />
        </button>
        <ExImg ex={exData} />
        <button onClick={() => open({ type: "exercise", id: e.exerciseId })} className="ml-2 min-w-0 flex-1 text-left">
          <div className="font-semibold">{nm1(ex)}</div>
          {nm2(ex) && <div className="truncate text-xs text-neutral-500">{nm2(ex)}</div>}
          {last && !compact && <div className="truncate text-xs text-neutral-400">Прошлый раз: {fmtSets(last.sets, ex.kind)}</div>}
        </button>
        <button onClick={act.replace} className="p-1.5 text-neutral-500" aria-label="Заменить"><RefreshCw size={18} /></button>
        <ConfirmButton onConfirm={act.remove} className="p-1.5 text-neutral-500" armedClassName="rounded-md bg-red-600 px-2 py-1 text-xs text-white">
          <Trash2 size={18} />
        </ConfirmButton>
      </div>
      {!compact && (
        <>
          {/* hold a column title and slide it to reorder columns for all exercises */}
          <div className="flex items-center gap-1 px-1 text-[11px] text-neutral-500">
            <span className="w-7" />
            {cols.map((c) => (
              <span key={c} {...g.headerProps(ei, c, cols)}
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
              <SetRow key={si} s={s} ex={ex} cols={cols} label={labels[si]}
                grouped={!!(s.g && si > 0 && e.sets[si - 1].g === s.g)}
                selected={!!(selHere && selHere.set.has(si))}
                rest={rests[key]} live={liveKey === key ? liveMs : null}
                swipe={g.swipe && g.swipe.key === key ? g.swipe : null}
                swipeProps={g.swipeBind(key, (dir) => act.swipeSet(si, dir))}
                numberProps={g.numberProps(si)}
                edit={(patch) => act.editSet(si, patch)} toggle={() => act.toggleSet(si)} />
            );
          })}
          {selHere ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-xs">
              <span className="flex-1 text-neutral-300">{selHere.set.size}</span>
              <button disabled={selHere.set.size < 2} onClick={act.mergeSelected} className="rounded-md bg-accent-400 px-3 py-2 font-semibold text-black disabled:opacity-40">Объединить</button>
              <button onClick={act.unmergeSelected} className="rounded-md bg-neutral-700 px-3 py-2">Разъед.</button>
              <button onClick={act.deleteSelected} className="rounded-md bg-red-600 px-3 py-2 text-white">Удалить</button>
              <button onClick={act.cancelSelection} className="px-2 py-2 text-neutral-400">Отмена</button>
            </div>
          ) : (
            <button onClick={act.addSet} className="mt-2 w-full rounded-lg py-2 text-xs text-neutral-400 active:bg-neutral-800">Добавить подход</button>
          )}
        </>
      )}
    </div>
  );
}
