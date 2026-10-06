// How the exercise picker lists things, the same for strength exercises and stretches: every typed word must be
// in one of the names (endings, «ё» and small words like «на», «в» don't matter); nothing like that — the closest
// ones (most words found); "твои" (done or in a program, most used first) on top; the rest by group; each list by
// the name the user sees.
const norm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ");
const SMALL = new Set(["на", "в", "во", "с", "со", "к", "ко", "и", "по", "для", "из", "от", "до", "за", "a", "the", "with", "on", "of"]);
// a long word without its ending: «тренажере» finds «тренажёр», «разведения» — «разведение»
const stem = (w) => (w.length > 5 ? w.slice(0, -2) : w);
function words(q) {
  const all = norm(q).split(" ").filter(Boolean);
  const meaningful = all.filter((w) => !SMALL.has(w));
  return (meaningful.length ? meaningful : all).map(stem);
}
const found = (e, ws) => { const hay = norm(`${e.name} ${e.ru || ""}`); return ws.filter((w) => hay.includes(w)).length; };
export const matchesQuery = (e, q) => { const ws = words(q); return found(e, ws) === ws.length; };

// a name typed exactly as an existing one (then "create «…»" isn't offered)
export const exactName = (items, q) => {
  const ql = q.trim().toLowerCase();
  return !!ql && items.some((e) => e.name.toLowerCase() === ql || (e.ru || "").toLowerCase() === ql);
};

export const CLOSEST = "ближе всего";
// nothing has every word: the ones with the most of them (at least half), at most 10
function closest(items, ws) {
  const scored = items.map((e) => [e, found(e, ws)]).filter(([, n]) => n >= Math.max(1, Math.ceil(ws.length / 2)));
  const best = Math.max(0, ...scored.map(([, n]) => n));
  return scored.filter(([, n]) => n >= best - 1).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([e]) => e);
}

// Sections of the list: [["твои", items], [group, items], …] or [[CLOSEST, items]]. groupOf(e): its group; groups:
// their order (others after); usage: { id: { n, last } } (the "твои"); nameOf(e): the name shown (sorting);
// group: only that one ("" = all).
export function pickerSections(items, { query = "", group = "", groupOf, groups = [], usage = {}, nameOf }) {
  const byName = (x, y) => nameOf(x).localeCompare(nameOf(y), "ru");
  const inGroup = items.filter((e) => !group || groupOf(e) === group);
  const ws = words(query);
  const hits = inGroup.filter((e) => found(e, ws) === ws.length);
  if (ws.length > 1 && !hits.length) { const near = closest(inGroup, ws); return near.length ? [[CLOSEST, near]] : []; }
  const mine = hits.filter((e) => usage[e.id])
    .sort((x, y) => usage[y.id].n - usage[x.id].n || usage[y.id].last - usage[x.id].last || byName(x, y));
  const rest = hits.filter((e) => !usage[e.id]);
  const all = [...groups, ...new Set(items.map(groupOf).filter((g) => !groups.includes(g)))];
  return [
    ...(mine.length ? [["твои", mine]] : []),
    ...all.map((g) => [g, rest.filter((e) => groupOf(e) === g).sort(byName)]).filter(([, l]) => l.length),
  ];
}

// "твои" from sessions: each one an exercise appears in counts 1 (with its latest date); being in a program only, 0.5.
// sessions: [{ startedAt, ids: [exerciseId…] }], programs: [{ items: [{ exerciseId }] }]
export function usageOf(sessions, programs) {
  const u = {};
  sessions.forEach((x) => new Set(x.ids).forEach((id) => {
    const e = u[id] || (u[id] = { n: 0, last: 0 });
    e.n += 1;
    e.last = Math.max(e.last, x.startedAt);
  }));
  programs.forEach((p) => p.items.forEach((it) => { if (!u[it.exerciseId]) u[it.exerciseId] = { n: 0.5, last: 0 }; }));
  return u;
}
