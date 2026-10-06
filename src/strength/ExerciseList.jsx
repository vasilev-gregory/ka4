// Picking strength exercises: the shared picker (ui/ExercisePicker) with the strength catalog, muscle groups,
// "твои" from the workouts and programs, and the form for a new exercise (names, group, kind).
import { useState } from "react";
import { uid } from "../core/util.js";
import { EX_KINDS, GROUPS } from "../model/catalog.js";
import { exerciseUsage } from "../model/workout.js";
import { createExercise } from "../model/workoutActions.js";
import { Chip } from "../ui/kit.jsx";
import { CreateForm, ExercisePicker, NameInput } from "../ui/ExercisePicker.jsx";

// a new exercise of the user's own: two names, a muscle group, a kind (choosing cardio puts it into «кардио»)
function NewExercise({ name: start, group, cancel, done }) {
  const [name, setName] = useState(start);
  const [ru, setRu] = useState("");
  const [grp, setGrp] = useState(group || "спина");
  const [kind, setKind] = useState("reps");
  const create = () => done({ id: uid(), name: name.trim(), ...(ru.trim() ? { ru: ru.trim() } : {}), group: grp, kind });
  return (
    <CreateForm canCreate={!!name.trim()} cancel={cancel} create={create}>
      <NameInput value={name} onChange={setName} placeholder="Название" />
      <NameInput value={ru} onChange={setRu} placeholder="Второе название (необязательно)" />
      <div className="mb-2 text-xs text-neutral-400">Группа мышц</div>
      <div className="mb-3 flex flex-wrap gap-1.5">{GROUPS.map((g) => <Chip key={g} on={grp === g} onClick={() => setGrp(g)}>{g}</Chip>)}</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {EX_KINDS.map(([k, l]) => <Chip key={k} secondary on={kind === k} onClick={() => { setKind(k); if (k === "cardio") setGrp("кардио"); }}>{l}</Chip>)}
      </div>
    </CreateForm>
  );
}

// onPick(ex) for one; onPickMany(list) to pick several; already: ids in the program; group: the chip chosen at the start
export function Picker({ data, up, onPick, onPickMany, onClose, group = "", already, title = "Добавить упражнение" }) {
  const tags = (e, inMine) => [inMine && e.group, e.kind === "time" && "на время", e.kind === "cardio" && (inMine || group !== "кардио") && "кардио"].filter(Boolean);
  return (
    <ExercisePicker title={title} items={data.exercises} groups={GROUPS} groupOf={(e) => e.group} usage={exerciseUsage(data.workouts, data.programs)}
      already={already} tags={tags} onPick={onPick} onPickMany={onPickMany} onClose={onClose} group={group} newLabel="+ Новое упражнение"
      createForm={({ name, cancel, done }) => (
        <NewExercise name={name} group={group} cancel={cancel} done={(ex) => { up((d) => createExercise(d, ex)); done(ex); }} />
      )} />
  );
}
