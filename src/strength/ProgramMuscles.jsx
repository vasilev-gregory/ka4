// The muscles of a plan while it is being put together, one block for a program and a split: the body map of the
// planned sets. One program is one workout (its own scale); a split is a week (the week's scale and its next steps).
// A program in a split also shows, per muscle, the split's whole planned week — where its shortfall is made up.
import { programLoad, weekHint } from "../model/muscles.js";
import { Card } from "../ui/kit.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

// programs: the plan's programs (a split's in its order, a program in it twice counts twice); week: a split;
// find(m): a program's editor only — exercises for a muscle (a picked one, or one the plan leaves without load);
// split: { name, programs } — the program's split, whose week goes beside each muscle
export function ProgramMuscles({ programs, week = false, split, exMap, open, find }) {
  const own = programLoad(programs, exMap).muscles;
  const wk = split && programLoad(split.programs, exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  return (
    <Card className="mt-4">
      <div className={`font-semibold ${wk ? "" : "mb-2"}`}>{week ? "Мышцы за неделю по плану" : "Мышцы по плану"}</div>
      {wk && <p className="mb-2 text-xs text-neutral-500">«За неделю» — весь сплит «{split.name}» по плану</p>}
      <MuscleBreakdown load={own} single={!week} note={week ? (r) => weekHint(r.sets) : undefined} week={wk ? (m) => (wk[m] ? wk[m].sets : 0) : undefined} exMap={exMap} open={open}
        byNote={week ? "в этом сплите" : "в этой программе"} find={find} />
    </Card>
  );
}
