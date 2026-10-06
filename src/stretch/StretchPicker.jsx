// Picking stretches: the shared picker (ui/ExercisePicker) with the stretches, their muscle areas, "твои" from the
// runs and programs, and the form for a new stretch (name, area, one side or two).
import { useState } from "react";
import { uid } from "../core/util.js";
import { ST_AREAS } from "../model/catalog.js";
import { NO_AREA, areaOf, stretchUsage } from "../model/stretch.js";
import { createExercise } from "../model/stretchActions.js";
import { Chip, Segmented } from "../ui/kit.jsx";
import { CreateForm, ExercisePicker, NameInput } from "../ui/ExercisePicker.jsx";

function NewStretch({ name: start, cancel, done }) {
  const [name, setName] = useState(start);
  const [area, setArea] = useState("");
  const [sides, setSides] = useState(true);
  const create = () => done({ id: "st-" + uid(), name: name.trim(), sides, ...(area ? { area } : {}) });
  return (
    <CreateForm canCreate={!!name.trim()} cancel={cancel} create={create}>
      <NameInput value={name} onChange={setName} placeholder="Название" />
      <div className="mb-2 text-xs text-neutral-400">Группа мышц</div>
      <div className="mb-3 flex flex-wrap gap-1.5">{ST_AREAS.map((a) => <Chip key={a} on={area === a} onClick={() => setArea(area === a ? "" : a)}>{a}</Chip>)}</div>
      <div className="mb-3"><Segmented options={[[true, "на обе стороны"], [false, "одна сторона"]]} value={sides} onChange={setSides} /></div>
    </CreateForm>
  );
}

// onPick(list): the chosen stretches; already: ids in the program; title / action: the screen's title and the button's word
export function StretchPicker({ stretch, upStretch, onPick, onClose, already = [], title = "Добавить растяжку", action = "Добавить" }) {
  return (
    <ExercisePicker title={title} items={stretch.exercises} groups={[...ST_AREAS, NO_AREA]} groupOf={areaOf} usage={stretchUsage(stretch)}
      already={already} tags={(e) => (e.sides ? ["2 стороны"] : [])} onPickMany={onPick} onClose={onClose} action={action} newLabel="+ Новая растяжка"
      createForm={({ name, cancel, done }) => (
        <NewStretch name={name} cancel={cancel} done={(ex) => { upStretch((s) => createExercise(s, ex)); done(ex); }} />
      )} />
  );
}
