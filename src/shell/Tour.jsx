// The first-launch tour: a few cards over the app, each about one tab (it is opened behind, its icon pulses); shown once
// on a fresh install (settings.tourDone), again from Settings → «Как пользоваться».
import { useEffect, useState } from "react";
import { Button } from "../ui/kit.jsx";

// [tab it shows (or none), title, text]
export const TOUR = [
  [null, "Привет! Это Кач", "Дневник силовых тренировок и растяжки. Без регистрации: всё хранится только на этом телефоне. Покажу, что где."],
  ["workout", "Тренировка", "Здесь твои программы. Жми ▶ — тренировка началась. Подход отмечай галочкой, отдых Кач посчитает сам. Программы и сплит меняются под тебя."],
  ["history", "История", "Календарь тренировок и какие мышцы ты нагрузил за день, неделю или месяц. Тап по мышце на схеме — что на неё делал."],
  ["measures", "Замеры", "Вес и обхваты. Вес тела нужен и для упражнений со своим весом — отжиманий, подтягиваний."],
  ["settings", "Настройки", "Сила или растяжка (быстрее — смахни нижнюю панель вбок), цвета, импорт из Hevy и GymKeeper, копия данных."],
  [null, "Последнее", "Раз в неделю отправляй себе копию данных — Кач напомнит. Этот обзор всегда можно открыть снова в Настройках."],
];
export const TOUR_TABS = ["workout", "history", "measures", "settings"];

// onTab(tab): opens the tab a card is about; onDone: closed (finished or skipped); i, setI: the card shown
export function Tour({ i, setI, onTab, onDone }) {
  const [tab, title, text] = TOUR[i];
  const last = i === TOUR.length - 1;
  useEffect(() => { if (tab) onTab(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const at = tab ? TOUR_TABS.indexOf(tab) : -1;
  return (
    // under the tab bar (z-40): it stays lit, its icon for this card pulses (TabBar's `pulse`)
    <div className="fixed inset-0 z-[35] bg-black/70" role="dialog" aria-label="Обзор Кача">
      <div className={`fixed inset-x-0 mx-auto max-w-md px-4 ${at >= 0 ? "above-nav pb-3" : "top-1/3"}`}>
        <div className="relative rounded-2xl bg-neutral-900 p-4 shadow-2xl ring-1 ring-accent-400/50">
          <div className="text-lg font-bold">{title}</div>
          <p className="mt-1 text-sm text-neutral-300">{text}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" aria-hidden>
              {TOUR.map((_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-accent-400" : "bg-neutral-700"}`} />)}
            </div>
            {!last && <button onClick={onDone} className="px-2 py-2 text-xs text-neutral-500">Пропустить</button>}
            {i > 0 && <Button size="xs" variant="secondary" onClick={() => setI(i - 1)}>Назад</Button>}
            <Button size="xs" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Поехали" : "Дальше"}</Button>
          </div>
        </div>
        {/* points down at the tab's icon (the row is as wide as the tab bar's) */}
        {at >= 0 && <span className="absolute bottom-1 h-4 w-4 -translate-x-1/2 rotate-45 bg-neutral-900" style={{ left: `${(at + 0.5) * 25}%` }} />}
      </div>
    </div>
  );
}

// the tour's state in the shell: open on a fresh install until done, or when asked from the settings
export function useTour(data, up) {
  const [step, setStep] = useState(null);
  const open = step != null || !data.settings.tourDone;
  return {
    open,
    i: step ?? 0,
    setI: setStep,
    start: () => setStep(0),
    done: () => { setStep(null); if (!data.settings.tourDone) up((d) => { d.settings.tourDone = true; }); },
  };
}
