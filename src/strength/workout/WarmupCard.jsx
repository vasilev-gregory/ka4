// The warm-up block every workout opens with (no warm-up exercises yet). Finishing it starts the rest
// before the first set; ticking a set first ends it too.
import { Check } from "lucide-react";
import { fmtDur } from "../../core/util.js";
import { Button, Card } from "../../ui/kit.jsx";

export function WarmupCard({ warmup, startedAt, now, onDone }) {
  if (warmup.doneAt) return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm text-neutral-400">
      <Check size={16} className="text-accent-400" /> Разминка
      <span className="ml-auto tabular-nums">{fmtDur(warmup.doneAt - startedAt)}</span>
    </div>
  );
  return (
    <Card className="mb-3">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold">Разминка</div>
        <div className="text-sm tabular-nums text-accent-400">{fmtDur(now - startedAt)}</div>
      </div>
      <p className="mt-1 text-xs text-neutral-400">Разомнись и отметь. Отдых перед первым подходом начнётся отсюда.</p>
      <Button block className="mt-3" onClick={onDone}>Закончил разминку</Button>
    </Card>
  );
}
