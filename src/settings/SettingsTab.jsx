// Settings: app update, mode, per-mode preferences, storage protection, backups.
import { ChevronDown } from "lucide-react";
import { beep, unlockAudio } from "../core/sound.js";
import { fmtDur, fmtNum, num, numericInput } from "../core/util.js";
import { ST_DEFAULTS, ST_FIELDS } from "../model/catalog.js";
import { setCountdown } from "../model/workoutActions.js";
import { Card, Header, SecStepper, Segmented, Stepper, SwitchRow, useApp, useNow } from "../ui/kit.jsx";
import { BackupSection } from "./BackupSection.jsx";
import { ColumnsSettings } from "./ColumnsSettings.jsx";
import { StorageStatus } from "./StorageStatus.jsx";
import { UpdateButton } from "./UpdateButton.jsx";

const buildDate = new Date(__BUILD_TIME__).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function SettingsTab({ data, up, replace, saved, back, setMode }) {
  const s = data.settings;
  const stretch = s.mode === "stretch";
  return (
    <div className="p-4 pb-28">
      <Header title="Настройки" back={back} />
      <Card className="mb-3">
        <div className="mb-2 font-semibold">Режим</div>
        <Segmented options={[["strength", "Сила"], ["stretch", "Растяжка"]]} value={s.mode || "strength"} onChange={setMode} />
        <p className="mt-2 text-xs text-neutral-500">Быстрее: смахни нижнюю панель вкладок влево или вправо.</p>
      </Card>
      {stretch && <StretchDefaults defaults={data.stretch.defaults} up={up} />}
      {!stretch && <StrengthSettings data={data} up={up} />}
      <SwitchRow title="Звук таймера" hint={`Щелчки 3-2-1 и сигналы${stretch ? " в плеере растяжки" : " в конце отдыха"}`}
        on={s.sound !== false} className="mb-6"
        onClick={() => { unlockAudio(); up((d) => { d.settings.sound = d.settings.sound === false; }); if (s.sound === false) beep(); }} />
      {!stretch && <ColumnsSettings settings={s} up={up} />}
      <details className="group mt-2 rounded-xl bg-neutral-950">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">
          Данные и приложение <ChevronDown size={18} className="text-neutral-500 transition-transform group-open:rotate-180" />
        </summary>
        {saved.state === "error" && <p className="mb-3 text-xs text-red-400">Не сохраняется: {saved.msg}</p>}
        <BackupSection data={data} up={up} replace={replace} />
        <StorageStatus />
        <UpdateButton />
        <p className="-mt-4 text-xs text-neutral-500">Версия {__VERSION__} от {buildDate}</p>
      </details>
    </div>
  );
}

function StretchDefaults({ defaults, up }) {
  const cur = defaults || ST_DEFAULTS;
  return (
    <Card className="mb-6">
      <div className="mb-2 font-semibold">Растяжка по умолчанию</div>
      <div className="space-y-1.5">
        {ST_FIELDS.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span>
            <SecStepper value={cur[k]} onChange={(v) => up((d) => { d.stretch.defaults = { ...ST_DEFAULTS, ...(d.stretch.defaults || {}), [k]: v }; })} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-500">Подставляется в новые программы растяжки.</p>
    </Card>
  );
}

function StrengthSettings({ data, up }) {
  const s = data.settings;
  const countdown = s.countdown !== false;
  return (
    <>
      <Card className="mb-3">
        <div className="mb-2 font-semibold">Названия упражнений</div>
        <Segmented options={[[true, "сначала русские"], [false, "сначала английские"]]} value={s.namesRu !== false}
          onChange={(v) => up((d) => { d.settings.namesRu = v; })} />
      </Card>
      <Card className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Тренировок в неделю</div>
          <div className="text-xs text-neutral-400">Сколько обычно получается. Из этого — норма подходов на мышцу за одну тренировку</div>
        </div>
        <Stepper value={s.perWeek || 3} min={1} onChange={(v) => up((d) => { d.settings.perWeek = Math.min(7, v); })} />
      </Card>
      <BodyWeight data={data} up={up} />
      <SwitchRow title="Обратный отсчёт после подхода" hint="Отсчёт внизу экрана. Секундомер в кнопке ✓ — колонка «Отдых» ниже"
        on={countdown} className="mb-3"
        onClick={() => up((d) => setCountdown(d, d.settings.countdown === false))} />
      <Card className={`mb-2 flex items-center justify-between ${countdown ? "" : "opacity-40"}`}>
        <div><div className="font-semibold">Отдых между подходами</div><div className="text-xs text-neutral-400">Для обратного отсчёта</div></div>
        <Stepper value={s.restSec} step={15} min={15} fmt={(v) => fmtDur(v * 1000)} onChange={(v) => up((d) => { d.settings.restSec = v; })} />
      </Card>
    </>
  );
}

// from the latest measurement if there is one, else typed in here
function BodyWeight({ data, up }) {
  const { bwAt } = useApp();
  const now = useNow(60e3);
  const measured = (data.measurements || []).some((m) => num(m.values && m.values.weight) > 0);
  return (
    <Card className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className="font-semibold">Вес тела</div>
        <div className="text-xs text-neutral-400">
          {measured ? "Из последнего замера, меняется во вкладке «Замеры»" : "Пока нет замеров. Нужен для подтягиваний, брусьев, отжиманий"}
        </div>
      </div>
      {measured ? (
        <span className="shrink-0 text-base font-semibold tabular-nums">{fmtNum(bwAt(now))} кг</span>
      ) : (
        <input value={data.settings.bodyWeight || ""} inputMode="decimal" placeholder="кг"
          onChange={(e) => { const v = numericInput(e.target.value, true); up((d) => { d.settings.bodyWeight = v; }); }}
          className="w-20 rounded-lg bg-black px-2 py-2 text-right tabular-nums outline-hidden placeholder:text-neutral-600 focus:ring-2 focus:ring-accent-400" />
      )}
    </Card>
  );
}
