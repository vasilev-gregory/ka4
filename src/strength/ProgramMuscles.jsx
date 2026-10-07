// The muscles of a plan while it is being put together, one block for a program and a split: the body map of the
// planned sets. One program is one workout (its own scale); a split is a week (the week's scale and its next steps).
import { programLoad, weekHint } from "../model/muscles.js";
import { Card } from "../ui/kit.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

// programs: the plan's programs (a split's in its order, a program in it twice counts twice); week: a split;
// find(m): exercises for a muscle (a picked one, or one the plan leaves without load)
export function ProgramMuscles({ programs, week = false, exMap, open, find }) {
  const own = programLoad(programs, exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  return (
    <Card className="mt-4">
      <div className="mb-2 font-semibold">{week ? "Мышцы за неделю по плану" : "Мышцы по плану"}</div>
      <MuscleBreakdown load={own} single={!week} note={week ? (r) => weekHint(r.sets) : undefined} exMap={exMap} open={open}
        byNote={week ? "в этом сплите" : "в этой программе"} find={find} />
    </Card>
  );
}
