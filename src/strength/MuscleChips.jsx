// Picking the muscles of an exercise (its card, a new one): a tap cycles main → helping 50% → 25% → none
// (model cycleMuscle); a helping one shows its share.
import { cycleMuscle, MUSCLES } from "../model/muscles.js";
import { Chip } from "../ui/kit.jsx";

// ex: the exercise as it is now (its muscles, or the rules for its name and group); onChange(muscles)
export function MuscleChips({ ex, worked, onChange }) {
  return (
    <>
      <div className="mb-1.5 mt-3 text-xs text-neutral-400">Мышцы: тап — основная, ещё — помогает 50%, 25%, ещё — убрать</div>
      <div className="flex flex-wrap gap-1.5" data-testid="muscle-chips">
        {MUSCLES.map(([m, name]) => (
          <Chip key={m} on={worked[m] >= 1} half={worked[m] > 0 && worked[m] < 1} onClick={() => onChange(cycleMuscle(ex, m))}>
            {name}{worked[m] > 0 && worked[m] < 1 ? ` ${Math.round(worked[m] * 100)}%` : ""}
          </Chip>
        ))}
      </div>
    </>
  );
}
