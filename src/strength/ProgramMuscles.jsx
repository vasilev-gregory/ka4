// A program's muscles while it is being put together: the body map of its planned sets (as one workout).
import { programLoad } from "../model/muscles.js";
import { ViewsCard } from "../ui/Session.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["one", "Эта программа"]];

export function ProgramMuscles({ program, exMap, open }) {
  const own = programLoad([program], exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  return (
    <ViewsCard title="Мышцы по плану" views={VIEWS} className="mt-4">
      {() => <MuscleBreakdown load={own} single exMap={exMap} open={open} byNote="в этой программе" />}
    </ViewsCard>
  );
}
