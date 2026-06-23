export function sortEntriesByDate<T extends { entryDate: string; id: number }>(
  entries: T[]
): T[] {
  return [...entries].sort(
    (a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id
  );
}
