// Split changes: create (the first one becomes active), name and programs (edited as a draft, like a program),
// make active, delete. Called as up((d) => action(d, …)).

// programIds: the programs picked on the workout tab, in the order shown
export function createSplit(d, id, programIds = []) {
  d.splits.push({ id, name: "", items: programIds.map((programId) => ({ programId })) });
  if (!d.activeSplitId) d.activeSplitId = id;
}

export const addSplitPrograms = (split, ids) => ids.forEach((programId) => split.items.push({ programId }));

export function setActiveSplit(d, id) {
  d.activeSplitId = id;
}

export function removeSplit(d, id) {
  d.splits = d.splits.filter((s) => s.id !== id);
  if (d.activeSplitId === id) d.activeSplitId = d.splits[0] ? d.splits[0].id : null;
}

// leaving the editor of a split that stayed empty and unnamed
export function dropEmptySplit(d, id) {
  const s = d.splits.find((x) => x.id === id);
  if (s && !s.name.trim() && !s.items.length) removeSplit(d, id);
}
