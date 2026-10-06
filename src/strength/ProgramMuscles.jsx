// A program's muscles while it is being put together: the body map of its planned sets, or of all programs
// together as a week of the split (each done once), with growth statuses.
import { useState } from "react";
import { programLoad } from "../model/muscles.js";
import { Segmented } from "../ui/kit.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["one", "Эта программа"], ["all", "Все программы"]];

export function ProgramMuscles({ programs, program, exMap, open }) {
  const [view, setView] = useState("one");
  const own = programLoad([program], exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  const others = programs.filter((p) => p.items.length);
  const all = view === "all" && others.length > 1;
  return (
    <div className="mt-4 rounded-xl bg-neutral-900 p-3">
      <div className="mb-2 font-semibold">Мышцы по плану</div>
      {others.length > 1 && <Segmented options={VIEWS} value={view} onChange={setView} />}
      {all && <p className="mt-2 text-[11px] text-neutral-500">Неделя, если каждую из программ ({others.length}) делать по разу.</p>}
      <div className="mt-3">
        {all ? <MuscleBreakdown key="all" load={programLoad(others, exMap).muscles} exMap={exMap} open={open} byNote="за неделю" />
          : <MuscleBreakdown key="one" load={own} single exMap={exMap} open={open} byNote="в этой программе" />}
      </div>
    </div>
  );
}
