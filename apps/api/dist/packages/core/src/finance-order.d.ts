export declare function compareByEntryDateThenId<T extends {
    entryDate: string;
    id: number;
}>(a: T, b: T): number;
export declare function sortByEntryDate<T extends {
    entryDate: string;
    id: number;
}>(entries: T[]): T[];
