// What can be done with sets during a workout: gestures and what RIR means. Pops up on the first workout,
// later from the «?» in the workout header.
import { Button, Sheet } from "../../ui/kit.jsx";

const Row = ({ how, what }) => (
  <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-neutral-100">{how}</span><span>{what}</span></li>
);

// why switch RIR on (Settings → columns, its «?»): what it gives, said to make it worth a try
export const RirPitch = () => (
  <div className="mt-1 space-y-1.5 rounded-xl bg-neutral-800 p-3 text-xs leading-snug text-neutral-300">
    <p><b className="text-neutral-100">RIR — сколько повторов ты ещё мог бы сделать.</b> Одна цифра, а картина тренировок становится честной:</p>
    <p>💪 <b className="text-neutral-100">Счёт мышц по делу.</b> Мышцы растут от подходов близко к отказу — 0–3 в запасе. Без RIR каждый отмеченный подход
      считается тяжёлым, даже лёгкий; с RIR лёгкие (4+) не раздувают статистику, и «оптимум» значит оптимум.</p>
    <p>🎯 <b className="text-neutral-100">Видно, где недожал.</b> Подходы с 4+ в запасе — сигнал добавить вес, сплошные нули — пора сбавить, пока не загнал себя.</p>
    <p>⚡ <b className="text-neutral-100">Одно движение.</b> Удержи ✓, потяни к цифре и отпусти — подход отмечен сразу с RIR. Или впиши в колонку.</p>
    <p className="text-neutral-500">Не уверен в цифре — ставь примерно: 1–2 «ещё чуть-чуть мог», 3 «мог пару», 4+ «легко».</p>
  </div>
);

export function WorkoutHelp({ rirOn, onClose }) {
  return (
    <Sheet title="Как работать с подходами" onClose={onClose}>
      <ul className="space-y-2 text-sm text-neutral-300">
        <Row how="Свайп вправо" what="подход сделан (ещё раз — снять отметку)" />
        {rirOn && <Row how="Удержание ✓" what="веер RIR: потяни к 0–4+ и отпусти — подход сделан с этим RIR" />}
        <Row how="Свайп влево" what="удалить подход, можно вернуть" />
        <Row how="Свайп упражнения" what="по названию: влево — убрать, вправо — заменить" />
        <Row how="Тап по номеру" what="разминка: не идёт в подходы и рекорды" />
        <Row how="Удержание номера" what="выбрать несколько: объединить в дроп-сет или удалить" />
        <Row how="Удержание колонки" what="переставить колонки (кг, повт., …)" />
        <Row how="Пустое поле" what="тап подставит прошлое значение" />
      </ul>
      <div className="mt-4 mb-1 font-semibold">RIR — повторы в запасе</div>
      <p className="text-sm text-neutral-300">
        Сколько ещё повторов ты смог бы сделать: 0 — отказ, 1–3 — тяжёлый подход (такие считаются в недельной статистике),
        4+ — лёгкий. Частичные повторы сами ставят RIR 0.
        {!rirOn && " Колонка RIR включается в Настройках → «Колонки подхода»."}
      </p>
      <Button block className="mt-4" onClick={onClose}>Понятно</Button>
    </Sheet>
  );
}
