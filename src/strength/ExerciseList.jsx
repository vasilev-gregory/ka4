// Picking strength exercises: the shared picker (ui/ExercisePicker) with the strength catalog, filters by the muscle
// it works most (or cardio), by muscle group (a few together: «руки») and by equipment, sections by muscle group, "твои" from the workouts and programs, and
// the form for a new exercise (names, group, kind).
import { useState } from "react";
import { uid } from "../core/util.js";
import { EX_KINDS, GROUPS } from "../model/catalog.js";
import { EQUIPMENT, equipmentOf } from "../model/equipment.js";
import { MUSCLES, musclesOf } from "../model/muscles.js";
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

// a muscle group, or a few together: «ноги» take the calves, «руки» — biceps, triceps and forearms
const GROUP_CHIPS = [["ноги", ["ноги", "икры"]], ["руки", ["бицепс", "трицепс", "предплечья"]], ["плечи"], ["грудь"], ["спина"], ["кор"],
  ["кардио"], ["бицепс"], ["трицепс"], ["предплечья"], ["икры"]].map(([g, of]) => [g, of || [g]]);
const GROUP_OF = Object.fromEntries(GROUP_CHIPS);

const FILTERS = [
  { id: "group", label: "Группа", chips: GROUP_CHIPS.map(([g]) => [g, g]), fits: (e, g) => GROUP_OF[g].includes(e.group) },
  { id: "muscle", label: "Мышца", chips: [...MUSCLES.map(([m, l]) => [m, l]), ["cardio", "кардио"]],
    // with a group picked: only its muscles (cardio for «кардио»)
    within: (picked) => (picked.group
      ? [...MUSCLES.filter(([, , g]) => GROUP_OF[picked.group].includes(g)).map(([m, l]) => [m, l]), ...(picked.group === "кардио" ? [["cardio", "кардио"]] : [])]
      : FILTERS[1].chips),
    fits: (e, m) => (m === "cardio" ? e.kind === "cardio" : musclesOf(e)[m] >= 1) },
  { id: "equip", label: "Снаряд", chips: EQUIPMENT.map(([k, l]) => [k, l]), fits: (e, k) => equipmentOf(e).includes(k) },
];

// onPick(ex) for one; onPickMany(list) to pick several; already: ids in the program; group: the chip chosen at the start
export function Picker({ data, up, onPick, onPickMany, onClose, group = "", muscle = "", already, title = "Добавить упражнение" }) {
  const tags = (e, inMine) => [inMine && e.group, e.kind === "time" && "на время", e.kind === "cardio" && (inMine || group !== "кардио") && "кардио"].filter(Boolean);
  return (
    <ExercisePicker title={title} items={data.exercises} groups={GROUPS} groupOf={(e) => e.group} filters={FILTERS}
      start={group === "кардио" ? { muscle: "cardio" } : muscle ? { muscle } : {}} usage={exerciseUsage(data.workouts, data.programs)}
      already={already} tags={tags} onPick={onPick} onPickMany={onPickMany} onClose={onClose} newLabel="+ Новое упражнение"
      createForm={({ name, cancel, done }) => (
        <NewExercise name={name} group={group} cancel={cancel} done={(ex) => { up((d) => createExercise(d, ex)); done(ex); }} />
      )} />
  );
}
