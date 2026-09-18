export interface SpendingEntry {
    id: number;
    projectId: number;
    lotId: number | null;
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
    lotId?: number | null;
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
    lotId?: number | null;
    description?: string;
    amount?: number;
    entryDate?: string;
    bank?: string;
    paid?: boolean;
    debtPaid?: boolean;
}
export declare function spendingPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]): number;
export declare function spendingDebtPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]): number;
export declare function spendingNonDebtPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]): number;
