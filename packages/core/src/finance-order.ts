export function compareByEntryDateThenId<T extends { entryDate: string; id: number }>(
  a: T,
  b: T
): number {
  const dateCmp = a.entryDate.localeCompare(b.entryDate);
  return dateCmp !== 0 ? dateCmp : a.id - b.id;
}

export function sortByEntryDate<T extends { entryDate: string; id: number }>(entries: T[]): T[] {
  return [...entries].sort(compareByEntryDateThenId);
}
