// What can be done with sets during a workout: gestures and what RIR means. Pops up on the first workout,
// later from the «?» in the workout header.
import { Button, Sheet } from "../../ui/kit.jsx";

const Row = ({ how, what }) => (
  <li className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-neutral-100">{how}</span><span>{what}</span></li>
);

export function WorkoutHelp({ rirOn, onClose }) {
  return (
    <Sheet title="Как работать с подходами" onClose={onClose}>
      <ul className="space-y-2 text-sm text-neutral-300">
        <Row how="Свайп вправо" what="подход сделан (ещё раз — снять отметку)" />
        <Row how="Удержание ✓" what="веер RIR: потяни к 0–4+ и отпусти — подход сделан с этим RIR" />
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
