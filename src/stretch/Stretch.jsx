// Stretching mode screens: programs, editor, picker, interval player, history.
import { useState, useEffect, useRef } from "react";
import { X, Check, Trash2, ChevronLeft, GripVertical, Search, Play, Settings } from "lucide-react";
import { beep, blip, tick } from "../core/sound.js";
import { DAY, fmtDate, fmtDur, progTitle, uid, weekStartOf } from "../core/util.js";
import { ST_AREAS, ST_FIELDS, ST_WEEK_MAX } from "../model/catalog.js";
import { PHASE, buildTimeline, stExMap, stTiming, stretchVerdict, stretchWeek } from "../model/stretch.js";
import { ConfirmButton, ExImg, Header, PhotoPicker, SecStepper, exPhoto, useNow } from "../ui/kit.jsx";
import { moveItem, useSortable } from "../ui/sortable.js";

export function StretchWeekPanel({ data, ws, only }) {
  const { areas, days } = stretchWeek(data, ws);
  const keys = (only || Object.keys(areas)).filter((k) => k in areas || (only && only.includes(k)));
  if (!keys.length) return null;
  return (
    <div className="rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-semibold">Неделя</div>
        <div className="text-xs text-neutral-400">дней с растяжкой: {days} из 5</div>
      </div>
      <div className="space-y-2">
        {keys.map((k) => {
          const sec = areas[k] || 0;
          const [label, cls, hint] = stretchVerdict(sec);
          return (
            <div key={k}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 text-neutral-300">{k}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-teal-400" style={{ width: `${Math.min(100, (sec / ST_WEEK_MAX) * 100)}%` }} />
                  <div className="absolute inset-y-0 w-px bg-neutral-400" style={{ left: "50%" }} />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-neutral-400">{fmtDur(sec * 1000)}</span>
                <span className={`w-20 shrink-0 rounded-md py-0.5 text-center text-[11px] ${cls}`}>{label}</span>
              </div>
              <div className="mt-0.5 pl-28 text-[11px] text-neutral-500">{hint}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-neutral-500">
        Считается время удержания на одну сторону. По обзору Thomas et al. (2018) для прироста гибкости нужно не меньше 5 минут
        в неделю на группу мышц (черта на шкале), и чем чаще в неделю, тем лучше — ориентир 5 дней. Более свежие сводные данные
        показывают, что после ~10 минут в неделю прирост почти не растёт.
      </p>
    </div>
  );
}

export function StretchHome({ data, up, open }) {
  const sx = data.stretch;
  const exMap = stExMap(data);
  const create = () => {
    const id = uid();
    up((d) => { d.stretch.programs.push({ id, name: "", timing: { ...d.stretch.defaults }, items: [] }); });
    open({ type: "stretchProgram", id });
  };
  return (
    <div className="p-4">
      <Header title="Растяжка" />
      <div className="space-y-2">
        {sx.programs.map((p) => {
          const tl = buildTimeline(p, exMap);
          const total = tl.reduce((x, ph) => x + ph.dur, 0);
          return (
            <div key={p.id} className="flex items-stretch gap-2 rounded-xl bg-neutral-900 p-2 pl-4">
              <button onClick={() => open({ type: "stretchProgram", id: p.id })} className="min-w-0 flex-1 py-2 text-left">
                <div className="text-base font-semibold">{progTitle(p)}</div>
                <div className="mt-1 text-xs text-neutral-400">
                  {p.items.length} упр.{total ? `, ≈ ${fmtDur(total * 1000)}` : ""}
                </div>
              </button>
              <button disabled={!tl.length} onClick={() => open({ type: "stretchPlay", id: p.id })} aria-label="Начать"
                className="flex w-14 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-black disabled:opacity-30">
                <Play size={22} />
              </button>
            </div>
          );
        })}
        <button onClick={create} className="w-full rounded-xl border border-dashed border-neutral-700 p-4 text-neutral-300">
          + Новая программа растяжки
        </button>
      </div>
    </div>
  );
}

export function StretchPicker({ data, up, onPick, onClose, already = [] }) {
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState([]);
  const toggle = (ex) => setChosen((c) => (c.some((x) => x.id === ex.id) ? c.filter((x) => x.id !== ex.id) : [...c, ex]));
  const [sides, setSides] = useState(true);
  const ql = q.trim().toLowerCase();
  const words = ql.split(/\s+/).filter(Boolean);
  const list = data.stretch.exercises.filter((e) => words.every((w) => `${e.name} ${e.ru || ""}`.toLowerCase().includes(w)));
  const exact = data.stretch.exercises.some((e) => e.name.toLowerCase() === ql || (e.ru || "").toLowerCase() === ql);
  const create = () => {
    const ex = { id: "st-" + uid(), name: q.trim(), sides };
    up((d) => { d.stretch.exercises.push(ex); });
    setQ("");
    setChosen((c) => [...c, ex]);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto max-w-md p-4 pb-32">
        <Header title="Добавить растяжку" right={<button onClick={onClose} className="p-2 text-neutral-400"><X size={22} /></button>} />
        <div className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3">
          <Search size={18} className="text-neutral-500" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск или новая растяжка"
            className="flex-1 bg-transparent py-3 outline-none placeholder-neutral-500" />
          {q && <button onClick={() => setQ("")} className="-mr-2 p-2 text-neutral-400" aria-label="Очистить поиск"><X size={20} /></button>}
        </div>
        <div className="mt-3 divide-y divide-neutral-800 rounded-xl bg-neutral-900">
          {list.map((e) => (
            <button key={e.id} onClick={() => toggle(e)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left active:bg-neutral-800 ${chosen.some((x) => x.id === e.id) ? "bg-neutral-800" : ""}`}>
              <span className="min-w-0 flex-1">
                <span className="block">{e.ru || e.name}</span>
                {e.ru && <span className="block text-xs text-neutral-500">{e.name}</span>}
              </span>
              {already.includes(e.id) && <span className="text-[11px] text-teal-300">уже в программе</span>}
              {e.sides && <span className="text-[11px] text-neutral-500">2 стороны</span>}
              <span className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${chosen.some((x) => x.id === e.id) ? "bg-teal-400 text-black" : "border border-neutral-700"}`}>
                {chosen.some((x) => x.id === e.id) && <Check size={14} />}
              </span>
            </button>
          ))}
        </div>
        {ql && !exact && list.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-700 p-3">
            <div className="mb-2 text-xs text-neutral-300">Новая растяжка «{q.trim()}»</div>
            <div className="mb-3 flex gap-1.5">
              {[[true, "на обе стороны"], [false, "одна сторона"]].map(([v, l]) => (
                <button key={l} onClick={() => setSides(v)}
                  className={`rounded-full px-3 py-1 text-xs ${sides === v ? "bg-teal-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
              ))}
            </div>
            <button onClick={create} className="w-full rounded-lg bg-teal-400 py-2.5 font-semibold text-black">Создать</button>
          </div>
        )}
      </div>
      {chosen.length > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 bg-black/90 px-4 pt-3">
          <div className="mx-auto max-w-md pb-3">
            <button onClick={() => onPick(chosen)} className="w-full rounded-xl bg-teal-400 py-3 font-semibold text-black">Добавить ({chosen.length})</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StretchEditor({ data, up, id, back, open }) {
  const [picker, setPicker] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const mutP = (fn) => up((d) => { const pp = d.stretch.programs.find((x) => x.id === id); if (pp) fn(pp, d); });
  const sort = useSortable((from, to) => mutP((pp) => moveItem(pp.items, from, to)));
  const p = data.stretch.programs.find((x) => x.id === id);
  if (!p) return <div className="p-4"><Header title="Программа удалена" back={back} /></div>;
  const exMap = stExMap(data);
  const T = stTiming(p);
  const tl = buildTimeline(p, exMap);
  const total = tl.reduce((x, ph) => x + ph.dur, 0);
  const setT = (k, v) => mutP((pp) => { pp.timing = { ...stTiming(pp), [k]: v }; });

  return (
    <div className="p-4 pb-28">
      <Header title="Программа растяжки" back={back} />
      <input value={p.name} placeholder="Название программы" autoFocus={!p.name}
        onChange={(e) => mutP((pp) => { pp.name = e.target.value; })}
        className="mb-4 w-full rounded-xl bg-neutral-900 px-3 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-teal-400" />

      <div className="mb-4 rounded-xl bg-neutral-900 p-3">
        <div className="mb-2 text-xs text-neutral-400">Таймер программы</div>
        <div className="space-y-1.5">
          {ST_FIELDS.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span><SecStepper value={T[k]} onChange={(v) => setT(k, v)} /></div>
          ))}
        </div>
        <div className="mt-3 flex gap-1.5">
          {[["circuit", "по кругу"], ["sequence", "по порядку"]].map(([k, l]) => (
            <button key={k} onClick={() => setT("mode", k)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${T.mode === k ? "bg-teal-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{l}</button>
          ))}
        </div>
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

      <div className="space-y-2">
        {p.items.map((it, i) => {
          const ex = exMap[it.exerciseId];
          const t = stTiming(p, it);
          const isOpen = openItem === i;
          return (
            <div key={i + it.exerciseId} ref={(el) => { sort.refs.current[i] = el; }} style={sort.itemStyle(i)}
              className={`rounded-xl p-2 ${sort.dragFrom === i ? "bg-neutral-800" : "bg-neutral-900"}`}>
              <div className="flex items-center gap-1">
                <button {...sort.handleProps(i, p.items.length)} className="cursor-grab p-1 text-neutral-500" aria-label="Перетащить"><GripVertical size={18} /></button>
                {ex && exPhoto(ex) && <ExImg ex={ex} size={34} />}
                <button onClick={() => setOpenItem(isOpen ? null : i)} className="ml-1 min-w-0 flex-1 py-1 text-left">
                  <div className="truncate">{ex ? ex.ru || ex.name : "Удалённая растяжка"}</div>
                  <div className={`truncate text-xs ${it.over && Object.keys(it.over).length ? "text-teal-300" : "text-neutral-500"}`}>
                    {ex && ex.area ? `${ex.area} · ` : ""}{t.work} с{ex && ex.sides ? " × 2 стороны" : ""}, отдых {t.rest} с
                  </div>
                </button>
                <button onClick={() => mutP((pp) => { pp.items.splice(i, 1); })} className="p-1 text-neutral-500" aria-label="Убрать"><X size={18} /></button>
              </div>
              {isOpen && ex && (
                <div className="mt-2 space-y-1.5 border-t border-neutral-800 pt-2">
                  {ST_FIELDS.map(([k, l]) => {
                    const own = it.over && it.over[k] != null;
                    return (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${own ? "" : "text-neutral-500"}`}>{l}</span>
                        <div className="flex items-center gap-1">
                          {own && <button onClick={() => mutP((pp) => { delete pp.items[i].over[k]; })} className="px-1 text-[11px] text-neutral-500">как в программе</button>}
                          <SecStepper value={t[k]} dim={!own} onChange={(v) => mutP((pp) => { pp.items[i].over = { ...(pp.items[i].over || {}), [k]: v }; })} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-1 text-xs text-neutral-400">Группа мышц</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ST_AREAS.map((ar) => (
                      <button key={ar} onClick={() => up((d) => { const e = d.stretch.exercises.find((x) => x.id === ex.id); if (e) e.area = ar; })}
                        className={`rounded-full px-2.5 py-1 text-[11px] ${ex.area === ar ? "bg-teal-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>{ar}</button>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">Фото</div>
                  <PhotoPicker ex={ex} accent="bg-teal-400"
                    onChange={(v) => up((d) => { const e = d.stretch.exercises.find((x) => x.id === ex.id); if (e) { if (v) e.photo = v; else delete e.photo; } })} />
                  <button onClick={() => up((d) => { const e = d.stretch.exercises.find((x) => x.id === ex.id); if (e) e.sides = !e.sides; })}
                    className={`mt-1 rounded-full px-3 py-1 text-xs ${ex.sides ? "bg-teal-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>
                    на обе стороны: {ex.sides ? "да" : "нет"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={() => setPicker(true)} className="mt-2 w-full rounded-xl border border-dashed border-neutral-700 py-3 text-neutral-300">
        Добавить растяжку
      </button>
      <p className="mt-2 text-xs text-neutral-500">Тап по растяжке — своё время для неё. Серым — как в программе.</p>

      <button disabled={!tl.length} onClick={() => open({ type: "stretchPlay", id })}
        className="mt-6 w-full rounded-xl bg-teal-400 py-3 font-semibold text-black disabled:opacity-40">
        Начать{total ? ` · ≈ ${fmtDur(total * 1000)}` : ""}
      </button>
      <ConfirmButton onConfirm={() => { up((d) => { d.stretch.programs = d.stretch.programs.filter((x) => x.id !== id); }); back(); }}
        confirmText="Удалить программу?" className="mt-3 w-full py-3 text-neutral-500" armedClassName="mt-3 w-full rounded-xl bg-red-600 py-3 text-white">
        Удалить программу
      </ConfirmButton>

      {picker && (
        <StretchPicker data={data} up={up} onClose={() => setPicker(false)} already={p.items.map((it) => it.exerciseId)}
          onPick={(list) => {
            // a stretch appears once per program; repeats come from rounds
            mutP((pp) => { list.forEach((ex) => { if (!pp.items.some((it) => it.exerciseId === ex.id)) pp.items.push({ exerciseId: ex.id }); }); });
            setPicker(false);
          }} />
      )}
    </div>
  );
}

export function StretchPlayer({ data, up, id, back, settings }) {
  const p = data.stretch.programs.find((x) => x.id === id);
  const exMap = stExMap(data);
  // the run's timeline; can grow (+ round) and change (durations edited on the fly)
  const [tl, setTl] = useState(() => (p ? buildTimeline(p, exMap) : []));
  const [showSettings, setShowSettings] = useState(false);
  const [st, setSt] = useState(() => ({ idx: 0, end: Date.now() + ((tl[0] && tl[0].dur) || 0) * 1000, pausedLeft: null, startedAt: Date.now(), done: tl.length === 0 }));
  const now = useNow(200, !st.done && st.pausedLeft == null);
  const left = st.pausedLeft != null ? st.pausedLeft : st.end - now;
  const ticked = useRef(new Set());
  const saved = useRef(false);
  const workDone = useRef({}); // exerciseId -> seconds held (per side)
  const phaseStart = useRef(Date.now());
  const pausedMs = useRef(0);
  // credit the time actually spent in the current work phase before leaving it
  const creditPhase = () => {
    const ph0 = tl[st.idx];
    if (!ph0 || ph0.k !== "work" || ph0.side === "правая сторона") return;
    const spent = Math.min(ph0.dur, Math.max(0, (Date.now() - phaseStart.current - pausedMs.current) / 1000));
    workDone.current[ph0.ex.id] = (workDone.current[ph0.ex.id] || 0) + Math.round(spent);
  };

  // keep the screen on while the player is open
  useEffect(() => {
    let lock = null;
    const req = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch (e) {} };
    req();
    const onVis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock && lock.release(); } catch (e) {} };
  }, []);

  const sound = data.settings.sound !== false;
  const phaseSound = (ph) => { if (!sound || !ph) return; if (ph.k === "work") beep(); else blip(); };
  useEffect(() => { phaseSound(tl[0]); }, []);

  const save = (complete) => {
    if (saved.current) return;
    saved.current = true;
    const elapsed = Date.now() - st.startedAt;
    if (!complete && elapsed < 60e3) return;
    const work = { ...workDone.current };
    up((d) => { d.stretch.sessions.push({ id: uid(), programId: id, name: progTitle(p, "Растяжка"), startedAt: st.startedAt, finishedAt: Date.now(), complete, work }); });
  };
  const go = (i) => {
    if (i < 0) i = 0;
    creditPhase();
    phaseStart.current = Date.now();
    pausedMs.current = 0;
    if (i >= tl.length) { save(true); setSt((s) => ({ ...s, done: true })); if (sound) beep(); return; }
    setSt((s) => ({ ...s, idx: i, end: Date.now() + tl[i].dur * 1000, pausedLeft: null }));
    phaseSound(tl[i]);
  };
  useEffect(() => { if (!st.done && st.pausedLeft == null && left <= 0) go(st.idx + 1); }, [left <= 0, st.idx, st.done, st.pausedLeft]);
  const secLeft = Math.ceil(left / 1000);
  useEffect(() => {
    if (!sound || st.done || st.pausedLeft != null || secLeft > 3 || secLeft < 1) return;
    const k = `${st.idx}:${secLeft}`;
    if (ticked.current.has(k)) return;
    ticked.current.add(k);
    tick();
  }, [secLeft, st.idx]);
  const pauseAt = useRef(0);
  const togglePause = () => {
    if (st.pausedLeft != null) pausedMs.current += Date.now() - pauseAt.current; else pauseAt.current = Date.now();
    setSt((s) => (s.pausedLeft != null ? { ...s, end: Date.now() + s.pausedLeft, pausedLeft: null } : { ...s, pausedLeft: Math.max(0, s.end - Date.now()) }));
  };
  const close = () => { if (!st.done) { creditPhase(); save(false); } back(); };

  const mutProgram = (fn) => up((d) => { const pp = d.stretch.programs.find((x) => x.id === id); if (pp) fn(pp); });
  const FIELD = { work: "work", rest: "rest", prep: "prep", switch: "sw", roundRest: "roundRest" };
  // change the current phase's length; saved at the lowest level: this stretch's own time in the program
  // (between-rounds rest is a program setting). Applies to the rest of this run as well.
  const adjust = (delta) => {
    const cur = tl[st.idx];
    if (!cur) return;
    const newDur = Math.max(5, cur.dur + delta);
    const dd = newDur - cur.dur;
    if (!dd) return;
    const field = FIELD[cur.k];
    if (cur.k === "roundRest") mutProgram((pp) => { pp.timing = { ...stTiming(pp), roundRest: newDur }; });
    else mutProgram((pp) => { pp.items.forEach((it) => { if (it.exerciseId === cur.ex.id) it.over = { ...(it.over || {}), [field]: newDur }; }); });
    setTl((t) => t.map((x, i) => (i >= st.idx && x.k === cur.k && (cur.k === "roundRest" || x.ex === cur.ex) ? { ...x, dur: newDur } : x)));
    setSt((s0) => (s0.pausedLeft != null ? { ...s0, pausedLeft: Math.max(0, s0.pausedLeft + dd * 1000) } : { ...s0, end: s0.end + dd * 1000 }));
  };
  // one more full round at the end, for this run only
  const addRound = () => {
    if (!p) return;
    const T = stTiming(p);
    const round = buildTimeline({ ...p, timing: { ...T, rounds: 1, mode: "circuit" } }, exMap);
    setTl((t) => [...t, ...(T.roundRest > 0 ? [{ k: "roundRest", dur: T.roundRest }] : []), ...round]);
  };

  const ph = tl[st.idx];
  // during rest the screen is about what's coming, not what just ended
  const resting = ph && (ph.k === "rest" || ph.k === "roundRest");
  const shownIdx = resting ? tl.findIndex((x, i) => i > st.idx && x.ex) : st.idx;
  const shownEx = shownIdx >= 0 && tl[shownIdx] ? tl[shownIdx].ex : null;
  const next = shownEx ? tl.slice(Math.max(shownIdx, st.idx) + 1).find((x) => x.ex && x.ex !== shownEx) : null;
  const pct = ph ? Math.max(0, Math.min(100, 100 - (left / (ph.dur * 1000)) * 100)) : 100;
  const isWork = ph && ph.k === "work";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {showSettings && settings && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto max-w-md">{settings(() => setShowSettings(false))}</div>
        </div>
      )}
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <div className="truncate text-sm text-neutral-400">{progTitle(p, "Растяжка")}</div>
          {!st.done && <div className="text-xs text-neutral-600">{st.idx + 1} / {tl.length}</div>}
        </div>
        <div className="flex items-center gap-1">
          {!st.done && <button onClick={addRound} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300">+ круг</button>}
          <button onClick={() => setShowSettings(true)} className="p-2 text-neutral-400" aria-label="Настройки"><Settings size={22} /></button>
          <button onClick={close} className="p-2 text-neutral-400" aria-label="Закрыть"><X size={24} /></button>
        </div>
      </div>

      {st.done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
          <div className="text-3xl font-bold text-teal-300">Готово</div>
          <div className="text-neutral-400">{fmtDur(Date.now() - st.startedAt)}</div>
          <div className="w-full max-w-md text-left">
            <StretchWeekPanel data={data} ws={weekStartOf(Date.now())}
              only={[...new Set(tl.filter((x) => x.ex).map((x) => (x.ex.area || "без группы")))]} />
          </div>
          <button onClick={back} className="mt-2 rounded-xl bg-teal-400 px-8 py-3 font-semibold text-black">Закрыть</button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className={`mb-3 rounded-full px-4 py-1 text-sm font-semibold ${isWork ? "bg-teal-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {PHASE[ph.k]}
            </div>
            {resting && shownEx && <div className="mb-1 text-sm text-neutral-500">Следующая</div>}
            {shownEx && exPhoto(shownEx) && <ExImg ex={shownEx} size={140} />}
            {shownEx && <div className="mt-2 text-2xl font-bold">{shownEx.ru || shownEx.name}</div>}
            {ph.side && <div className="mt-1 text-base text-teal-300">{ph.side}</div>}
            <div className="mt-6 flex items-center gap-4">
              <button onClick={() => adjust(-5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">−5</button>
              <div className={`text-8xl font-bold tabular-nums ${isWork ? "text-teal-300" : "text-neutral-200"}`}>
                {st.pausedLeft != null ? fmtDur(left + 999) : fmtDur(Math.max(0, left) + 999)}
              </div>
              <button onClick={() => adjust(5)} className="rounded-full bg-neutral-900 px-3 py-2 text-sm font-semibold tabular-nums text-neutral-300">+5</button>
            </div>
            <div className="mt-1 text-[11px] text-neutral-600">
              {ph.k === "roundRest" ? "±5 — отдых между кругами в программе" : `±5 — ${PHASE[ph.k].toLowerCase()} для этой растяжки, сохранится в программе`}
            </div>
            <div className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-800">
              <div className={`h-full ${isWork ? "bg-teal-400" : "bg-neutral-500"}`} style={{ width: `${pct}%`, transition: "width 200ms linear" }} />
            </div>
            {next && next.ex && <div className="mt-4 text-sm text-neutral-500">Дальше: {next.ex.ru || next.ex.name}</div>}
          </div>
          <div className="flex items-center justify-center gap-6 p-6">
            <button onClick={() => go(st.idx - 1)} className="rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Назад"><ChevronLeft size={28} /></button>
            <button onClick={togglePause} className="rounded-full bg-teal-400 px-8 py-5 text-lg font-semibold text-black">
              {st.pausedLeft != null ? "Дальше" : "Пауза"}
            </button>
            <button onClick={() => go(st.idx + 1)} className="rotate-180 rounded-full bg-neutral-900 p-4 text-neutral-300" aria-label="Пропустить"><ChevronLeft size={28} /></button>
          </div>
        </>
      )}
    </div>
  );
}

export function StretchHistory({ data, up }) {
  const list = data.stretch.sessions.slice().reverse();
  const [ws, setWs] = useState(() => weekStartOf(Date.now()));
  return (
    <div className="p-4">
      <Header title="История растяжки" />
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setWs(weekStartOf(ws - 3 * DAY))} className="p-2 text-neutral-400"><ChevronLeft size={20} /></button>
        <div className="text-sm">
          {new Date(ws).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} – {new Date(ws + 6 * DAY + 3600e3).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
        </div>
        <button onClick={() => setWs(weekStartOf(ws + 8 * DAY))} className="rotate-180 p-2 text-neutral-400"><ChevronLeft size={20} /></button>
      </div>
      <div className="mb-5">
        <StretchWeekPanel data={data} ws={ws} />
        {!Object.keys(stretchWeek(data, ws).areas).length && <p className="text-xs text-neutral-500">На этой неделе растяжки не было.</p>}
      </div>
      {list.length === 0 && <p className="text-neutral-400">Здесь появятся пройденные растяжки.</p>}
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl bg-neutral-900 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-neutral-400">{fmtDate(s.startedAt)}</div>
              <div className="font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-neutral-400 tabular-nums">{fmtDur(s.finishedAt - s.startedAt)}{s.complete ? "" : ", не до конца"}</div>
            </div>
            <ConfirmButton onConfirm={() => up((d) => { d.stretch.sessions = d.stretch.sessions.filter((x) => x.id !== s.id); })}
              confirmText="Удалить?" className="p-2 text-neutral-600" armedClassName="rounded-lg bg-red-600 px-3 py-2 text-xs text-white">
              <Trash2 size={18} />
            </ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}
