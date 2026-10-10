// What can be done with sets during a workout: gestures and what RIR means. Pops up on the first workout,
// later from the «?» in the workout header.
import { Check } from "lucide-react";
import { Button, Sheet } from "../../ui/kit.jsx";
import { SET_CHECK } from "../setMarks.js";

// a section of the help: a title and its lines (how → what)
const Part = ({ title, rows }) => (
  <div className="mb-3">
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</div>
    <ul className="space-y-1.5 text-sm text-neutral-300">
      {rows.filter(Boolean).map(([how, what]) => (
        <li key={how} className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-neutral-100">{how}</span><span>{what}</span></li>
      ))}
    </ul>
  </div>
);

// a done ✓ of each kind, as it looks in the rows
const Mark = ({ kind, children }) => (
  <span className="flex items-center gap-1.5">
    <span className={`flex h-6 w-6 items-center justify-center rounded-md ${SET_CHECK[kind]}`}><Check size={14} /></span>{children}
  </span>
);

// why switch RIR on (Settings → columns, its «?»): what it gives, said to make it worth a try
export const RirPitch = () => (
  <div className="mt-1 space-y-1.5 rounded-xl bg-neutral-800 p-3 text-xs leading-snug text-neutral-300">
    <p><b className="text-neutral-100">RIR — сколько повторов ты ещё мог бы сделать.</b> Одна цифра, а картина тренировок становится честной:</p>
    <p>💪 <b className="text-neutral-100">Счёт мышц по делу.</b> Мышцы растут от подходов близко к отказу — 0–3 в запасе. Без RIR каждый отмеченный подход
      считается тяжёлым, даже лёгкий; с RIR лёгкие (4+) не раздувают статистику, и «оптимум» значит оптимум.</p>
    <p>🎯 <b className="text-neutral-100">Видно, где недожал.</b> Подходы с 4+ в запасе — сигнал добавить вес, сплошные нули — пора сбавить, пока не загнал себя.</p>
    <p>⚡ <b className="text-neutral-100">Одно движение.</b> Удержи ✓, потяни к цифре и отпусти — подход отмечен сразу с RIR.</p>
    <p className="text-neutral-500">Не уверен в цифре — ставь примерно: 1–2 «ещё чуть-чуть мог», 3 «мог пару», 4+ «легко».</p>
  </div>
);

export function WorkoutHelp({ rirOn, onClose }) {
  return (
    <Sheet title="Как работать с подходами" onClose={onClose}>
      <Part title="Отметить подход" rows={[
        ["Тап по ✓", "подход сделан; вес и повторы, если не вписал, — как в прошлый раз (они видны серым)"],
        rirOn && ["Удержи ✓", "появится веер 0 · 1 · 2 · 3 · 4+ — потяни к цифре и отпусти: подход сделан с этим RIR"],
        ["Вписал частичные", "подход сразу отмечен — до отказа"],
      ]} />
      <div className="mb-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Цвет отметки</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-neutral-300">
          <Mark kind="work">рабочий</Mark><Mark kind="warmup">разминка</Mark><Mark kind="fail">до отказа (RIR 0)</Mark>
        </div>
      </div>
      <Part title="Подходы" rows={[
        ["Тап по номеру", "сделать разминкой («Р»): она не идёт в статистику и рекорды"],
        ["Свайп влево", "удалить подход (можно вернуть)"],
        ["Свайп вправо", "выбрать подход; можно выбрать несколько (или удержать номер)"],
        ["Выбрал", "«Объединить» — дроп-сет, «Удалить» — убрать выбранные"],
      ]} />
      <Part title="Упражнение" rows={[
        ["Свайп названия", "влево — убрать упражнение, вправо — заменить"],
        ["⋮⋮ слева", "перетащить упражнение выше или ниже"],
        ["Удержи «кг»", "и потяни — поменять колонки местами"],
      ]} />
      <div className="mb-1 mt-4 font-semibold">RIR — повторы в запасе</div>
      <p className="text-sm text-neutral-300">
        Сколько ещё повторов ты смог бы сделать: 0 — отказ, 1–3 — тяжёлый подход (считается в статистике мышц), 4+ — лёгкий.
        {!rirOn && " Включается в Настройках → «Колонки подхода» → RIR."}
      </p>
      <Button block className="mt-4" onClick={onClose}>Понятно</Button>
    </Sheet>
  );
}
