export function compareByEntryDateThenId(a, b) {
    const dateCmp = a.entryDate.localeCompare(b.entryDate);
    return dateCmp !== 0 ? dateCmp : a.id - b.id;
}
export function sortByEntryDate(entries) {
    return [...entries].sort(compareByEntryDateThenId);
}
