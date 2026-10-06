// How the exercise picker lists things, the same for strength exercises and stretches: every typed word must be
// in one of the names; "твои" (done or in a program, most used first) on top; the rest by group; each list by the
// name the user sees.
const words = (q) => q.trim().toLowerCase().split(/\s+/).filter(Boolean);

export const matchesQuery = (e, q) => {
  const hay = `${e.name} ${e.ru || ""}`.toLowerCase();
  return words(q).every((w) => hay.includes(w));
};

// a name typed exactly as an existing one (then "create «…»" isn't offered)
export const exactName = (items, q) => {
  const ql = q.trim().toLowerCase();
  return !!ql && items.some((e) => e.name.toLowerCase() === ql || (e.ru || "").toLowerCase() === ql);
};

// Sections of the list: [["твои", items], [group, items], …]. groupOf(e): its group; groups: their order (others
// after); usage: { id: { n, last } } (the "твои"); nameOf(e): the name shown (sorting); group: only that one ("" = all).
export function pickerSections(items, { query = "", group = "", groupOf, groups = [], usage = {}, nameOf }) {
  const byName = (x, y) => nameOf(x).localeCompare(nameOf(y), "ru");
  const found = items.filter((e) => (!group || groupOf(e) === group) && matchesQuery(e, query));
  const mine = found.filter((e) => usage[e.id])
    .sort((x, y) => usage[y.id].n - usage[x.id].n || usage[y.id].last - usage[x.id].last || byName(x, y));
  const rest = found.filter((e) => !usage[e.id]);
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
