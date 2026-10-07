// A program's muscles while it is being put together: the body map of its planned sets (as one workout).
import { programLoad, sessionWindows } from "../model/muscles.js";
import { ViewsCard } from "../ui/Session.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

const VIEWS = [["one", "Эта программа"]];

export function ProgramMuscles({ data, program, exMap, open }) {
  const own = programLoad([program], exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  return (
    <ViewsCard title="Мышцы по плану" views={VIEWS} className="mt-4">
      {() => <MuscleBreakdown load={own} windows={sessionWindows(data, exMap)} exMap={exMap} open={open} byNote="в этой программе" />}
    </ViewsCard>
  );
}
