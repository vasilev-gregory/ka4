// A program's muscles while it is being put together: the body map of its planned sets (as one workout).
import { programLoad } from "../model/muscles.js";
import { Card } from "../ui/kit.jsx";
import { MuscleBreakdown } from "./MuscleBreakdown.jsx";

export function ProgramMuscles({ program, exMap, open }) {
  const own = programLoad([program], exMap).muscles;
  if (!Object.keys(own).length) return null; // empty, or cardio only
  return (
    <Card className="mt-4">
      <div className="mb-2 font-semibold">Мышцы по плану</div>
      <MuscleBreakdown load={own} single exMap={exMap} open={open} byNote="в этой программе" />
    </Card>
  );
}
