// One set: number (tap = warm-up, hold = select), the enabled columns, and ✓ with the rest time inside.
// The row swipes: right = done / undone, left = delete.
import { useEffect, useRef } from "react";
import { Check, Trophy } from "lucide-react";
import { fmtDur, numericInput } from "../../core/util.js";

const BOX = "rounded-lg bg-black px-1 py-2.5 text-center text-base tabular-nums outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400";

// RIR is a single digit 0-4 ("4+"); typing replaces it, deleting clears it
function rirFromInput(raw, shown) {
  if (raw.length < shown.length) return null;
  const digit = raw.replace(/\D/g, "").slice(-1);
  return digit === "" ? null : Math.min(4, parseInt(digit, 10));
}

// an empty field with last time's value takes it on focus, selected, so typing replaces it
const takeHint = (value, hint, key, edit) => (e) => {
  if (value !== "" || !hint) return;
  const el = e.target;
  edit({ [key]: String(hint) });
  requestAnimationFrame(() => el.select());
};

function Cell({ col, s, ex, edit }) {
  const doneText = s.done ? "text-accent-300" : "";
  if (col === "w") return (
    <input value={s.w} placeholder={s.hw || ""} inputMode="decimal" onFocus={takeHint(s.w, s.hw, "w", edit)}
      onChange={(e) => edit({ w: numericInput(e.target.value, true) })} className={`min-w-0 flex-1 ${BOX} ${doneText}`} />
  );
  if (col === "r") return (
    <input value={s.r} placeholder={s.hr || ""} inputMode="numeric" onFocus={takeHint(s.r, s.hr, "r", edit)}
      onChange={(e) => edit({ r: numericInput(e.target.value, false) })} className={`min-w-0 flex-1 ${BOX} ${doneText}`} />
  );
  if (col === "p") return ex.kind === "time" ? <span className="w-9" /> : (
    <input value={s.p || ""} inputMode="numeric" placeholder={s.hp ? String(s.hp) : "+"} aria-label="Частичные повторы"
      onChange={(e) => edit({ p: numericInput(e.target.value, false) })} className={`w-9 ${BOX} ${doneText || "text-neutral-300"}`} />
  );
  const shown = s.rir == null ? "" : s.rir === 4 ? "4+" : String(s.rir);
  return (
    <input value={shown} inputMode="numeric" placeholder="–" aria-label="RIR, повторов в запасе" disabled={s.t === "w"}
      onChange={(e) => edit({ rir: rirFromInput(e.target.value, shown) })}
      className={`w-9 ${BOX} disabled:opacity-30 ${s.rir === 0 ? "text-red-400" : doneText || "text-neutral-300"}`} />
  );
}

// label: "1", "2a", …; rest: ms before this set or "drop"; live: the running stopwatch is here (ms so far);
// record: this set beat the exercise's best estimated 1RM
export function SetRow({ s, ex, cols, label, grouped, selected, rest, live, record, swipe, swipeProps, numberProps, edit, toggle }) {
  // a short flash when the set gets confirmed (phones without vibration still notice)
  const rowRef = useRef(null);
  const wasDone = useRef(s.done);
  useEffect(() => {
    if (s.done && !wasDone.current && rowRef.current && rowRef.current.animate) {
      rowRef.current.animate([{ backgroundColor: "var(--color-accent-400)" }, { backgroundColor: "transparent" }], { duration: 450, easing: "ease-out" });
    }
    wasDone.current = s.done;
  }, [s.done]);
  return (
    <div ref={rowRef} className={`relative overflow-hidden rounded-lg ${grouped ? "mt-0.5" : "mt-1.5"}`}>
      {swipe && (
        <div className={`absolute inset-0 flex items-center px-4 text-xs font-semibold ${swipe.dx > 0 ? "justify-start bg-accent-400 text-black" : "justify-end bg-red-600 text-white"}`}>
          {swipe.dx > 0 ? (s.done ? "Снять отметку" : "Сделано") : "Удалить"}
        </div>
      )}
      <div {...swipeProps}
        style={{ touchAction: "pan-y", transform: swipe ? `translateX(${swipe.dx}px)` : undefined, transition: swipe ? "none" : "transform 150ms" }}
        className={`relative flex items-center gap-1 rounded-lg border-l-2 px-1 ${s.g ? "border-accent-400" : "border-transparent"} ${selected ? "bg-neutral-700" : "bg-neutral-900"}`}>
        <button {...numberProps} aria-label="Подход: тап — разминка, удержание — выбрать"
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          className={`flex h-11 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${selected ? "bg-accent-400 text-black" : "bg-black"}`}>
          <span className={selected ? "" : s.t === "w" ? "text-sky-400" : s.done ? "text-accent-400" : "text-neutral-500"}>{s.t === "w" ? "Р" : label}</span>
        </button>
        {cols.map((c) => <Cell key={c} col={c} s={s} ex={ex} edit={edit} />)}
        <button onClick={toggle} aria-label="Подход сделан"
          className={`relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none ${
            s.done ? "bg-accent-400 text-neutral-900" : live != null ? "bg-neutral-800 text-accent-400" : "bg-neutral-800 text-neutral-400"}`}>
          {live != null ? (
            <span className="text-xs font-semibold tabular-nums">{fmtDur(live)}</span>
          ) : (
            <>
              <Check size={s.done && rest ? 16 : 20} />
              {s.done && rest && <span className="mt-0.5 text-[9px] font-semibold tabular-nums">{rest === "drop" ? "↳" : fmtDur(rest)}</span>}
            </>
          )}
          {record && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-accent-400" aria-label="Рекорд">
              <Trophy size={10} />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
