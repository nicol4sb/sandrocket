export interface SpendingEntry {
    id: number;
    projectId: number;
    description: string;
    amount: number;
    entryDate: string;
    bank: string;
    paid: boolean;
    debtPaid: boolean;
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
    debtPaid: boolean;
    position: number;
}
export interface UpdateSpendingEntryInput {
    id: number;
    description?: string;
    amount?: number;
    entryDate?: string;
    bank?: string;
    paid?: boolean;
    debtPaid?: boolean;
}
export declare function spendingPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid'>[]): number;
export declare function spendingDebtPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'debtPaid'>[]): number;
