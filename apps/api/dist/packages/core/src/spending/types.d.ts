export interface SpendingEntry {
    id: number;
    projectId: number;
    description: string;
    amount: number;
    entryDate: string;
    bank: string;
    paid: boolean;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateSpendingEntryInput {
    projectId: number;
    description: string;
    amount: number;
    entryDate: string;
    bank: string;
    paid: boolean;
    position: number;
}
export interface UpdateSpendingEntryInput {
    id: number;
    description?: string;
    amount?: number;
    entryDate?: string;
    bank?: string;
    paid?: boolean;
}
export declare function spendingPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid'>[]): number;
