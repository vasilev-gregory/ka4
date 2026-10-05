// A file picked in Settings or shared to Кач from another app: recognise it, show what it would do,
// and on confirmation restore the backup / add the workouts.
import { useState, useEffect } from "react";
import { fmtDate, plural } from "../core/util.js";
import { applyImport, planImport } from "../model/importActions.js";
import { readImport, SOURCES } from "../model/imports/index.js";
import { Button, Sheet } from "../ui/kit.jsx";

// "21.06.2022": imports span years, so the year is shown
const dmy = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

async function readFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  return readImport(file.name, text, bytes);
}

// onDone(message) after an import; onClose() when cancelled
export function ImportFlow({ file, data, up, replace, onDone, onClose }) {
  const [res, setRes] = useState(null); // { ok } | { error }
  useEffect(() => {
    let live = true;
    readFile(file).then((ok) => live && setRes({ ok }), (e) => live && setRes({ error: e.message || "Не получилось прочитать файл" }));
    return () => { live = false; };
  }, [file]);

  if (!res) return <Sheet title="Читаю файл…" onClose={onClose}><p className="text-sm text-neutral-400">{file.name}</p></Sheet>;
  if (res.error) return (
    <Sheet title="Не получилось" onClose={onClose}>
      <p className="mb-4 text-sm text-neutral-300">{res.error}</p>
      <Button variant="quiet" block onClick={onClose}>Закрыть</Button>
    </Sheet>
  );

  const r = res.ok;
  if (r.kind === "backup") {
    const s = r.backup.summary;
    return (
      <Sheet title="Копия Кача" onClose={onClose}>
        <p className="mb-4 text-sm text-neutral-300">
          В файле: тренировок {s.workouts}, программ {s.programs}{s.exportedAt ? `, сохранено ${fmtDate(s.exportedAt)}` : ""}.
          Все текущие данные будут заменены.
        </p>
        <button onClick={() => { replace(r.backup.data); onDone("Данные загружены"); }}
          className="mb-2 w-full rounded-xl bg-red-600 py-3 font-semibold text-white">Заменить всё</button>
        <Button variant="quiet" block onClick={onClose}>Отмена</Button>
      </Sheet>
    );
  }

  const plan = planImport(data, r.workouts, r.measurements);
  const created = [...plan.exercises].filter(([, ex]) => !ex).map(([name]) => name);
  const found = plan.exercises.size - created.length;
  const first = plan.add[0], last = plan.add[plan.add.length - 1];
  const n = plan.add.length, nm = plan.measures.length;
  return (
    <Sheet title={`Импорт из ${SOURCES[r.source]}`} onClose={onClose}>
      {n === 0 && nm === 0 ? (
        <p className="mb-4 text-sm text-neutral-300">Все {r.workouts.length} {plural(r.workouts.length, "тренировка", "тренировки", "тренировок")} из файла уже есть в истории.</p>
      ) : (
        <div className="mb-4 space-y-2 text-sm text-neutral-300">
          {n > 0 && (
            <p>
              Добавится {n} {plural(n, "тренировка", "тренировки", "тренировок")}
              {n > 1 ? `: ${dmy(first.startedAt)} – ${dmy(last.startedAt)}` : `, ${dmy(first.startedAt)}`}
              {plan.skipped ? ` (ещё ${plan.skipped} уже есть)` : ""}.
            </p>
          )}
          {nm > 0 && <p>Замеров: {nm}.</p>}
          {n > 0 && <p>Упражнения: {found} нашлись в Каче{created.length ? `, ${created.length} будут созданы:` : "."}</p>}
          {created.length > 0 && <p className="text-xs text-neutral-400">{created.join(", ")}</p>}
          <p className="text-xs text-neutral-500">Всё добавляется к тому, что уже есть, ничего не заменяется. Группу мышц новых упражнений можно поправить на их экране.</p>
        </div>
      )}
      {(n > 0 || nm > 0) && (
        <Button block className="mb-2" onClick={() => {
          up((d) => applyImport(d, planImport(d, r.workouts, r.measurements), r.source));
          onDone(n > 0 ? `Добавлено ${n} ${plural(n, "тренировка", "тренировки", "тренировок")}` : `Добавлено замеров: ${nm}`);
        }}>Импортировать</Button>
      )}
      <Button variant="quiet" block onClick={onClose}>{n > 0 || nm > 0 ? "Отмена" : "Закрыть"}</Button>
    </Sheet>
  );
}
