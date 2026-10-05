// Active strength workout (and the program list when none is running) + rest countdown bar.
import { useState, useEffect, useRef } from "react";
import { Check, Trash2, RefreshCw, GripVertical, Play } from "lucide-react";
import { beep, blip, tick, unlockAudio } from "../core/sound.js";
import { fmtDate, fmtDur, fmtKg, num, uid } from "../core/util.js";
import { buildSets, closeSegment, columnConfig, durations, finalizeActive, fmtSets, lastSession, normalizeGroups, restBefore, restShown, segmentsOf, setColumns, setLabels, startWorkout, stats } from "../model/workout.js";
import { Picker } from "./ExerciseList.jsx";
import { ConfirmButton, ExImg, Header, useApp, useNow } from "../ui/kit.jsx";
import { moveItem, setDragActive, useSortable } from "../ui/sortable.js";

export function WorkoutTab({ data, up, exMap, open }) {
  const { nm1, nm2, bwAt } = useApp();
  const a = data.active;
  const [picker, setPicker] = useState(false);
  const [askUpdate, setAskUpdate] = useState(false);
  const [sel, setSel] = useState(null); // {ei, set: Set<si>} while selecting sets to merge
  const [swipe, setSwipe] = useState(null); // {key, dx}
  const sw = useRef(null);
  const justSwiped = useRef(false);
  const [undo, setUndo] = useState(null); // {ei, si, set}
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 5000); return () => clearTimeout(t); }, [undo]);
  const cols = setColumns(data.settings);
  const restOn = restShown(data.settings);
  const rests = a && restOn ? restBefore(a) : {};
  let liveKey = null; // where the running "rest so far" is shown
  if (restOn && a && !a.paused && a.lastSetAt) {
    let li = -1, ls = -1;
    a.exercises.forEach((e, ei) => e.sets.forEach((s, si) => { if (s.done && s.at === a.lastSetAt) { li = ei; ls = si; } }));
    if (li >= 0) {
      outer: for (let ei = li; ei < a.exercises.length; ei++) {
        const ss = a.exercises[ei].sets;
        for (let si = ei === li ? ls + 1 : 0; si < ss.length; si++) if (!ss[si].done) { liveKey = `${ei}:${si}`; break outer; }
      }
    }
  }
  // hold a column title (кг, повт., …) and slide it left/right to reorder columns for all exercises
  const [colDrag, setColDrag] = useState(null); // {ei, key, dx, to}
  const hdrRefs = useRef({});
  const colPress = useRef(null);
  const reorderCols = (from, to) => up((d) => {
    const full = columnConfig(d.settings);
    const vis = setColumns(d.settings);
    const nv = vis.slice();
    const [k] = nv.splice(from, 1);
    nv.splice(to, 0, k);
    const visSet = new Set(vis);
    let j = 0;
    d.settings.columns = full.map((c) => {
      if (!visSet.has(c.key)) return c;
      const k2 = nv[j++];
      return full.find((x) => x.key === k2);
    });
  });
  const colHeaderProps = (ei, key) => ({
    ref: (el) => { hdrRefs.current[`${ei}:${key}`] = el; },
    style: {
      touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
      ...(colDrag && colDrag.ei === ei && colDrag.key === key ? { transform: `translateX(${colDrag.dx}px)`, position: "relative", zIndex: 20 } : {}),
    },
    onContextMenu: (e) => e.preventDefault(),
    onPointerDown: (ev) => {
      const x0 = ev.clientX;
      const target = ev.currentTarget;
      clearTimeout(colPress.current);
      const cancel = () => clearTimeout(colPress.current);
      target.addEventListener("pointerup", cancel, { once: true });
      target.addEventListener("pointercancel", cancel, { once: true });
      colPress.current = setTimeout(() => {
        const rects = cols.map((c) => { const r = hdrRefs.current[`${ei}:${c}`].getBoundingClientRect(); return r.left + r.width / 2; });
        const from = cols.indexOf(key);
        let cur = { ei, key, dx: 0, to: from };
        setColDrag(cur);
        setDragActive(true);
        try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
        const move = (e2) => {
          const dx = e2.clientX - x0;
          const x = rects[from] + dx;
          let to = 0, best = Infinity;
          rects.forEach((cx, j) => { if (Math.abs(x - cx) < best) { best = Math.abs(x - cx); to = j; } });
          cur = { ...cur, dx, to };
          setColDrag(cur);
        };
        const upH = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", upH);
          window.removeEventListener("pointercancel", upH);
          setDragActive(false);
          setColDrag(null);
          if (cur.to !== from) reorderCols(from, cur.to);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", upH);
        window.addEventListener("pointercancel", upH);
      }, 250);
    },
  });
  const pressT = useRef(null);
  const longFired = useRef(false);
  const now = useNow(1000, !!a && !a.paused);
  const sort = useSortable((from, to) => up((d) => { moveItem(d.active.exercises, from, to); }));

  if (!a) {
    const last = data.workouts[data.workouts.length - 1];
    return (
      <div className="p-4">
        <Header title="Тренировка" />
        {last && <p className="text-xs text-neutral-400 mb-3">Прошлая: {last.name}, {fmtDate(last.startedAt)}</p>}
        {data.pendingProgramUpdate && data.programs.some((x) => x.id === data.pendingProgramUpdate.programId) && (
          <div className="mb-3 rounded-xl bg-neutral-900 p-4">
            <div className="font-semibold">Вчерашняя тренировка завершена</div>
            <p className="mb-3 text-xs text-neutral-400">
              Она отличалась от «{data.programs.find((x) => x.id === data.pendingProgramUpdate.programId).name}». Записать изменения в программу?
            </p>
            <div className="flex gap-2">
              <button onClick={() => up((d) => { delete d.pendingProgramUpdate; })} className="rounded-xl bg-neutral-800 px-4 py-2.5 text-neutral-300">Нет</button>
              <button onClick={() => up((d) => {
                const pu = d.pendingProgramUpdate;
                const pp = pu && d.programs.find((x) => x.id === pu.programId);
                if (pp) pp.items = pu.items;
                delete d.pendingProgramUpdate;
              })} className="flex-1 rounded-xl bg-amber-400 py-2.5 font-semibold text-black">Обновить программу</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {data.programs.map((p) => (
            <div key={p.id} className="flex items-stretch gap-2 rounded-xl bg-neutral-900 p-2 pl-4">
              <button onClick={() => open({ type: "program", id: p.id })} className="min-w-0 flex-1 py-2 text-left">
                <div className="text-base font-semibold">{p.name}</div>
                <div className="mt-1 text-xs text-neutral-400">
                  {p.items.map((i) => exMap[i.exerciseId]?.name).filter(Boolean).join(", ") || "Пока без упражнений"}
                </div>
              </button>
              <button onClick={() => startWorkout(up, p)} aria-label="Начать"
                className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-black">
                <Play size={22} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => {
              const id = uid();
              up((d) => { d.programs.push({ id, name: "Новая программа", items: [] }); });
              open({ type: "program", id });
            }} className="flex-1 rounded-xl border border-dashed border-neutral-700 p-4 text-neutral-300">
              + Новая программа
            </button>
            <button onClick={() => startWorkout(up, null)} className="flex-1 rounded-xl border border-dashed border-neutral-700 p-4 text-neutral-300">
              Без программы
            </button>
          </div>
        </div>
      </div>
    );
  }

  const st = stats(a, exMap, bwAt);
  const setSet = (ei, si, patch) => up((d) => { Object.assign(d.active.exercises[ei].sets[si], patch); });
  const toggle = (ei, si) => {
    unlockAudio();
    up((d) => {
      const s = d.active.exercises[ei].sets[si];
      s.done = !s.done;
      if (s.done) {
        // confirming a set without typing means "same as last time"
        if (s.w === "" && s.hw) s.w = s.hw;
        if (s.r === "" && s.hr) s.r = s.hr;
        if (!s.p && s.hp) s.p = s.hp;
        if (num(s.p) > 0 && s.t !== "w") s.rir = 0; // partials mean the set went to failure
      }
      if (s.done && d.active.paused) { closeSegment(d.active); d.active.segments.push({ start: Date.now() }); d.active.paused = false; }
      if (s.done) {
        s.at = Date.now(); // for rest-time stats
        d.active.lastSetAt = s.at;
        // no rest in the middle of a drop set / ladder
        const nx = d.active.exercises[ei].sets[si + 1];
        const midGroup = s.g && nx && nx.g === s.g && !nx.done;
        const countdown = d.settings.countdown !== false;
        d.active.restEndsAt = midGroup || !countdown ? null : Date.now() + d.settings.restSec * 1000;
      } else {
        delete s.at;
      }
    });
  };
  const addSet = (ei) => up((d) => {
    const ss = d.active.exercises[ei].sets, l = ss[ss.length - 1];
    ss.push({ w: "", r: "", p: "", hw: l ? l.w || l.hw || "" : "", hr: l ? l.r || l.hr || "" : "", hp: l ? l.p || l.hp || "" : "", done: false });
  });
  const mergeSel = () => {
    const { ei, set } = sel;
    const idx = [...set].sort((x, y) => x - y);
    up((d) => {
      const ex0 = d.active.exercises[ei];
      const ss = ex0.sets;
      const g = uid();
      const picked = idx.map((i) => ss[i]);
      picked.forEach((st) => { st.g = g; });
      const rest = ss.filter((_, i) => !set.has(i));
      const at = ss.slice(0, idx[0]).filter((_, i) => !set.has(i)).length;
      rest.splice(at, 0, ...picked);
      normalizeGroups(rest);
      ex0.sets = rest;
    });
    setSel(null);
  };
  // swipe a set row: left = delete (with undo), right = done / undone
  const swipeProps = (ei, si) => {
    const key = `${ei}:${si}`;
    return {
      onPointerDown: (e) => { if (sel) return; sw.current = { key, x: e.clientX, y: e.clientY, active: false, dx: 0 }; },
      onPointerMove: (e) => {
        const st = sw.current;
        if (!st || st.key !== key) return;
        const dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.active) {
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            st.active = true;
            clearTimeout(pressT.current);
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          } else {
            if (Math.abs(dy) > 12) sw.current = null;
            return;
          }
        }
        st.dx = Math.max(-150, Math.min(150, dx));
        setSwipe({ key, dx: st.dx });
      },
      onPointerUp: () => finishSwipe(ei, si),
      onPointerCancel: () => { sw.current = null; setSwipe(null); },
      onClickCapture: (e) => { if (justSwiped.current) { e.stopPropagation(); e.preventDefault(); } },
    };
  };
  const finishSwipe = (ei, si) => {
    const st = sw.current;
    sw.current = null;
    setSwipe(null);
    if (!st || !st.active) return;
    justSwiped.current = true;
    setTimeout(() => { justSwiped.current = false; }, 80);
    if (st.dx < -80) {
      const removed = a.exercises[ei]?.sets[si];
      if (!removed) return;
      setUndo({ ei, si, set: structuredClone(removed) });
      up((d) => { const ss = d.active.exercises[ei].sets; ss.splice(si, 1); normalizeGroups(ss); });
    } else if (st.dx > 80) {
      toggle(ei, si);
    }
  };
  const undoDelete = () => {
    const u = undo;
    setUndo(null);
    if (!u) return;
    up((d) => { const ex0 = d.active && d.active.exercises[u.ei]; if (ex0) ex0.sets.splice(Math.min(u.si, ex0.sets.length), 0, u.set); });
  };
  const delSel = () => {
    const { ei, set } = sel;
    up((d) => { const ex0 = d.active.exercises[ei]; ex0.sets = ex0.sets.filter((_, i) => !set.has(i)); normalizeGroups(ex0.sets); });
    setSel(null);
  };
  const unmergeSel = () => {
    const { ei, set } = sel;
    up((d) => { const ss = d.active.exercises[ei].sets; set.forEach((i) => { if (ss[i]) delete ss[i].g; }); normalizeGroups(ss); });
    setSel(null);
  };
  // number cell: tap = warm-up on/off (or select while selecting), long press = start selecting
  const pressProps = (ei, si) => ({
    onPointerDown: () => {
      longFired.current = false;
      clearTimeout(pressT.current);
      pressT.current = setTimeout(() => {
        longFired.current = true;
        try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
        setSel({ ei, set: new Set([si]) });
      }, 450);
    },
    onPointerUp: () => clearTimeout(pressT.current),
    onPointerLeave: () => clearTimeout(pressT.current),
    onPointerCancel: () => clearTimeout(pressT.current),
    onContextMenu: (ev) => ev.preventDefault(),
    onClick: () => {
      if (longFired.current) { longFired.current = false; return; }
      if (sel && sel.ei === ei) {
        setSel((prev) => { const n = new Set(prev.set); if (n.has(si)) n.delete(si); else n.add(si); return n.size ? { ei, set: n } : null; });
      } else {
        const cur = a.exercises[ei].sets[si];
        setSet(ei, si, cur.t === "w" ? { t: "" } : { t: "w", rir: null });
      }
    },
  });
  const delEx = (ei) => up((d) => { d.active.exercises.splice(ei, 1); });
  const addEx = (ex) => {
    const rep = picker.replace;
    up((d) => {
      if (rep !== undefined) {
        const e = d.active.exercises[rep];
        if (e) { e.exerciseId = ex.id; e.sets = buildSets(d, ex.id, e.sets.length || 3); }
      } else d.active.exercises.push({ exerciseId: ex.id, sets: buildSets(d, ex.id, 3) });
    });
    setPicker(false);
  };
  const hasDone = a.exercises.some((e) => e.sets.some((s) => s.done));
  const program = a.programId ? data.programs.find((p) => p.id === a.programId) : null;
  const newItems = a.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length || 1 }));
  const programChanged = !!program && JSON.stringify(program.items) !== JSON.stringify(newItems);
  const finish = () => (programChanged ? setAskUpdate(true) : doFinish(false));
  const doFinish = (updateProgram) => {
    setAskUpdate(false);
    const id = a.id;
    up((d) => { finalizeActive(d, updateProgram); });
    if (hasDone) open({ type: "workout", id });
  };
  const pause = () => up((d) => { closeSegment(d.active); d.active.paused = true; d.active.restEndsAt = null; });
  const resume = () => up((d) => { closeSegment(d.active); d.active.segments.push({ start: Date.now() }); d.active.paused = false; });
  const segs = segmentsOf(a);
  const cur = segs[segs.length - 1];
  const dur = durations(a, now);

  return (
    <div className="p-4 pb-44">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">{a.paused ? "На паузе" : segs.length > 1 ? `Продолжение, отрезок ${segs.length}` : "Идёт тренировка"}</p>
          <h1 className="text-lg font-bold">{a.name}</h1>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold tabular-nums ${a.paused ? "text-neutral-500" : "text-amber-400"}`}>
            {a.paused ? fmtDur(dur.main) : fmtDur(now - cur.start)}
          </div>
          <div className="text-xs text-neutral-400 tabular-nums">
            {st.sets} подх., {fmtKg(st.vol)}
            {segs.length > 1 && <span className="block">основная {fmtDur(dur.main)}{dur.extra >= 60000 ? `, +${fmtDur(dur.extra)}` : ""}</span>}
          </div>
        </div>
      </div>

      {a.paused && (
        <button onClick={resume} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-semibold text-black">
          <Play size={18} /> Продолжить тренировку
        </button>
      )}

      {a.exercises.map((e, ei) => {
        const ex = exMap[e.exerciseId] || { name: "Удалённое упражнение", kind: "reps" };
        const last = lastSession(data.workouts, e.exerciseId);
        return (
          <div key={ei + e.exerciseId} ref={(el) => { sort.refs.current[ei] = el; }} style={sort.itemStyle(ei)}
            className={`mb-3 rounded-xl p-3 ${sort.dragFrom === ei ? "bg-neutral-800" : "bg-neutral-900"}`}>
            <div className={`flex items-center gap-1 ${sort.dragging ? "" : "mb-2"}`}>
              <button {...sort.handleProps(ei, a.exercises.length)} className="-ml-1 cursor-grab p-1 text-neutral-500" aria-label="Перетащить">
                <GripVertical size={20} />
              </button>
              <ExImg ex={exMap[e.exerciseId]} />
              <button onClick={() => open({ type: "exercise", id: e.exerciseId })} className="ml-2 min-w-0 flex-1 text-left">
                <div className="font-semibold">{nm1(ex)}</div>
                {nm2(ex) && <div className="truncate text-xs text-neutral-500">{nm2(ex)}</div>}
                {last && !sort.dragging && <div className="truncate text-xs text-neutral-400">Прошлый раз: {fmtSets(last.sets, ex.kind)}</div>}
              </button>
              <button onClick={() => setPicker({ replace: ei })} className="p-1.5 text-neutral-500" aria-label="Заменить"><RefreshCw size={18} /></button>
              <ConfirmButton onConfirm={() => delEx(ei)} className="p-1.5 text-neutral-500" armedClassName="rounded-md bg-red-600 px-2 py-1 text-xs text-white">
                <Trash2 size={18} />
              </ConfirmButton>
            </div>
            {!sort.dragging && (<>
            <div className="flex items-center gap-1 px-1 text-[11px] text-neutral-500">
              <span className="w-7" />
              {cols.map((c) => (
                <span key={c} {...colHeaderProps(ei, c)}
                  className={`${c === "w" || c === "r" ? "flex-1" : "w-9"} rounded py-1 text-center ${
                    colDrag && colDrag.ei === ei ? (colDrag.key === c ? "bg-amber-400 text-black" : cols[colDrag.to] === c ? "bg-neutral-700 text-neutral-200" : "") : ""}`}>
                  {c === "w" ? (ex.assist ? "помощь" : ex.bw ? "+кг" : "кг") : c === "r" ? (ex.kind === "time" ? "сек" : "повт.") : c === "p" ? (ex.kind === "time" ? "" : "частич.") : "RIR"}
                </span>
              ))}
              <span className="w-11" />
            </div>
            {(() => {
              const labels = setLabels(e.sets);
              return e.sets.map((s, si) => {
                const inSel = sel && sel.ei === ei && sel.set.has(si);
                const cont = s.g && si > 0 && e.sets[si - 1].g === s.g;
                const box = "rounded-lg bg-black px-1 py-2.5 text-center text-base tabular-nums outline-none placeholder-neutral-600 focus:ring-2 focus:ring-amber-400";
                const rirShown = s.rir == null ? "" : s.rir === 4 ? "4+" : String(s.rir);
                const cell = (c) => {
                  if (c === "w") return (
                    <input key={c} value={s.w} placeholder={s.hw || ""} inputMode="decimal" onChange={(ev) => setSet(ei, si, { w: ev.target.value })}
                      className={`min-w-0 flex-1 ${box} ${s.done ? "text-amber-300" : ""}`} />
                  );
                  if (c === "r") return (
                    <input key={c} value={s.r} placeholder={s.hr || ""} inputMode="numeric" onChange={(ev) => setSet(ei, si, { r: ev.target.value })}
                      className={`min-w-0 flex-1 ${box} ${s.done ? "text-amber-300" : ""}`} />
                  );
                  if (c === "p") return ex.kind === "time" ? <span key={c} className="w-9" /> : (
                    <input key={c} value={s.p || ""} inputMode="numeric" placeholder={s.hp ? String(s.hp) : "+"} aria-label="Частичные повторы"
                      onChange={(ev) => setSet(ei, si, { p: ev.target.value, ...(num(ev.target.value) > 0 && s.t !== "w" ? { rir: 0 } : {}) })}
                      className={`w-9 ${box} ${s.done ? "text-amber-300" : "text-neutral-300"}`} />
                  );
                  return (
                    <input key={c} value={rirShown} inputMode="numeric" placeholder="–" aria-label="RIR, повторов в запасе" disabled={s.t === "w"}
                      onChange={(ev) => {
                        const raw = ev.target.value;
                        if (raw.length < rirShown.length) return setSet(ei, si, { rir: null });
                        const dg = raw.replace(/\D/g, "").slice(-1);
                        setSet(ei, si, { rir: dg === "" ? null : Math.min(4, parseInt(dg, 10)) });
                      }}
                      className={`w-9 ${box} disabled:opacity-30 ${s.rir === 0 ? "text-red-400" : s.done ? "text-amber-300" : "text-neutral-300"}`} />
                  );
                };
                return (
                  <div key={si} className={`relative overflow-hidden rounded-lg ${cont ? "mt-0.5" : "mt-1.5"}`}>
                  {swipe && swipe.key === `${ei}:${si}` && (
                    <div className={`absolute inset-0 flex items-center px-4 text-xs font-semibold ${swipe.dx > 0 ? "justify-start bg-amber-400 text-black" : "justify-end bg-red-600 text-white"}`}>
                      {swipe.dx > 0 ? (s.done ? "Снять отметку" : "Сделано") : "Удалить"}
                    </div>
                  )}
                  <div {...swipeProps(ei, si)}
                    style={{ touchAction: "pan-y", transform: swipe && swipe.key === `${ei}:${si}` ? `translateX(${swipe.dx}px)` : undefined, transition: swipe && swipe.key === `${ei}:${si}` ? "none" : "transform 150ms" }}
                    className={`relative flex items-center gap-1 rounded-lg px-1 ${s.g ? "border-l-2 border-amber-400" : "border-l-2 border-transparent"} ${inSel ? "bg-neutral-700" : "bg-neutral-900"}`}>
                    <button {...pressProps(ei, si)} aria-label="Подход: тап — разминка, удержание — выбрать"
                      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                      className={`flex h-11 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${inSel ? "bg-amber-400 text-black" : "bg-black"}`}>
                      <span className={inSel ? "" : s.t === "w" ? "text-sky-400" : s.done ? "text-amber-400" : "text-neutral-500"}>{s.t === "w" ? "Р" : labels[si]}</span>
                    </button>
                    {cols.map(cell)}
                    {(() => {
                      const key = `${ei}:${si}`;
                      const live = liveKey === key;
                      const rv = rests[key];
                      return (
                        <button onClick={() => toggle(ei, si)} aria-label="Подход сделан"
                          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none ${s.done ? "bg-amber-400 text-neutral-900" : live ? "bg-neutral-800 text-amber-400" : "bg-neutral-800 text-neutral-400"}`}>
                          {live ? (
                            <span className="text-xs font-semibold tabular-nums">{fmtDur(now - a.lastSetAt)}</span>
                          ) : (
                            <>
                              <Check size={s.done && rv ? 16 : 20} />
                              {s.done && rv && <span className="mt-0.5 text-[9px] font-semibold tabular-nums">{rv === "drop" ? "↳" : fmtDur(rv)}</span>}
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  </div>
                );
              });
            })()}
            {sel && sel.ei === ei ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-xs">
                <span className="flex-1 text-neutral-300">{sel.set.size}</span>
                <button disabled={sel.set.size < 2} onClick={mergeSel} className="rounded-md bg-amber-400 px-3 py-2 font-semibold text-black disabled:opacity-40">Объединить</button>
                <button onClick={unmergeSel} className="rounded-md bg-neutral-700 px-3 py-2">Разъед.</button>
                <button onClick={delSel} className="rounded-md bg-red-600 px-3 py-2 text-white">Удалить</button>
                <button onClick={() => setSel(null)} className="px-2 py-2 text-neutral-400">Отмена</button>
              </div>
            ) : (
              <button onClick={() => addSet(ei)} className="mt-2 w-full rounded-lg py-2 text-xs text-neutral-400 active:bg-neutral-800">
                Добавить подход
              </button>
            )}
            </>)}
          </div>
        );
      })}

      <button onClick={() => setPicker(true)} className="w-full rounded-xl border border-dashed border-neutral-700 py-3 text-neutral-300">
        Добавить упражнение
      </button>

      <div className="mt-6 flex gap-2">
        <ConfirmButton onConfirm={() => up((d) => { d.active = null; })} confirmText="Удалить тренировку?"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-neutral-400" armedClassName="rounded-xl bg-red-600 px-4 py-3 text-white">
          Отменить
        </ConfirmButton>
        {a.paused ? (
          <>
            <button onClick={resume} className="flex-1 rounded-xl bg-amber-400 py-3 font-semibold text-black">Продолжить</button>
            <button onClick={finish} className="rounded-xl bg-neutral-800 px-4 py-3">Завершить</button>
          </>
        ) : (
          <>
            <button onClick={pause} className="rounded-xl bg-neutral-800 px-4 py-3">Пауза</button>
            <button onClick={finish} className="flex-1 rounded-xl bg-amber-400 py-3 font-semibold text-black">Завершить</button>
          </>
        )}
      </div>

      {askUpdate && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3" onClick={() => setAskUpdate(false)}>
          <div className="safe-bottom mx-auto w-full max-w-md rounded-2xl bg-neutral-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-base font-semibold">Обновить программу?</div>
            <p className="mb-4 text-xs text-neutral-400">
              Состав или подходы отличаются от «{program?.name}». Можно записать в программу то, как ты тренировался сегодня.
            </p>
            <button onClick={() => doFinish(true)} className="mb-2 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black">Обновить программу</button>
            <button onClick={() => doFinish(false)} className="w-full rounded-xl bg-neutral-800 py-3 text-neutral-300">Оставить программу как была</button>
          </div>
        </div>
      )}

      {undo && (
        <div className="fixed inset-x-0 top-0 z-50 px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-black shadow-lg">
            <span className="flex-1">Подход удалён</span>
            <button onClick={undoDelete} className="font-semibold text-amber-700">Вернуть</button>
          </div>
        </div>
      )}

      {picker && <Picker data={data} up={up} onPick={addEx} onClose={() => setPicker(false)}
        onPickMany={picker.replace !== undefined ? undefined : (list) => { up((d) => { list.forEach((ex) => d.active.exercises.push({ exerciseId: ex.id, sets: buildSets(d, ex.id, 3) })); }); setPicker(false); }}
        title={picker.replace !== undefined ? "Заменить упражнение" : undefined} />}
    </div>
  );
}

export function RestBar({ endsAt, total, up, sound }) {
  const now = useNow(200, true);
  const left = endsAt - now;
  const done = left <= 0;
  const fired = useRef(null);
  const ticked = useRef(new Set());
  useEffect(() => { if (sound && endsAt - Date.now() > total * 1000 - 1500) blip(); }, []);
  const secLeft = Math.ceil(left / 1000);
  useEffect(() => {
    if (!sound || done || secLeft > 3 || ticked.current.has(secLeft)) return;
    ticked.current.add(secLeft);
    tick();
  }, [secLeft, done]);
  useEffect(() => {
    if (!done) return;
    if (fired.current !== endsAt) {
      fired.current = endsAt;
      if (Date.now() - endsAt < 5000) {
        if (sound) beep();
        try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
      }
    }
    const t = setTimeout(() => up((d) => { if (d.active) d.active.restEndsAt = null; }), 2500);
    return () => clearTimeout(t);
  }, [done, endsAt]);
  const adjust = (sec) => up((d) => { if (d.active?.restEndsAt) d.active.restEndsAt += sec * 1000; });
  const pct = Math.min(100, Math.max(0, (left / (total * 1000)) * 100));

  return (
    <div className="above-nav fixed inset-x-0 z-40 px-3">
      <div className={`mx-auto max-w-md overflow-hidden rounded-2xl shadow-lg ${done ? "bg-amber-400 text-neutral-900" : "bg-neutral-100 text-neutral-900"}`}>
        <div className="h-1.5 bg-neutral-300"><div className="h-full bg-amber-500" style={{ width: `${pct}%`, transition: "width 250ms linear" }} /></div>
        <div className="flex items-center gap-2 p-3">
          <div className="flex-1">
            <div className="text-xs text-neutral-600">{done ? "Время подхода" : "Отдых"}</div>
            <div className="text-2xl font-bold tabular-nums">{done ? "0:00" : fmtDur(left + 999)}</div>
          </div>
          <button onClick={() => adjust(-15)} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">−15</button>
          <button onClick={() => adjust(15)} className="rounded-lg bg-neutral-300 px-3 py-2 font-semibold tabular-nums">+15</button>
          <button onClick={() => up((d) => { if (d.active) d.active.restEndsAt = null; })} className="rounded-lg bg-black px-3 py-2 font-semibold text-neutral-100">
            Хватит
          </button>
        </div>
      </div>
    </div>
  );
}
