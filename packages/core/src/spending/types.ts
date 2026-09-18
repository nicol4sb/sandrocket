export interface SpendingEntry {
  id: number;
  projectId: number;
  lotId: number | null;
  description: string;
  amount: number;
  entryDate: string; // YYYY-MM-DD
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

export function spendingPaidTotal(
  entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]
): number {
  return spendingDebtPaidTotal(entries) + spendingNonDebtPaidTotal(entries);
}

export function spendingDebtPaidTotal(
  entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]
): number {
  return entries.filter((e) => e.paid && e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}

export function spendingNonDebtPaidTotal(
  entries: Pick<SpendingEntry, 'amount' | 'paid' | 'debtPaid'>[]
): number {
  return entries.filter((e) => e.paid && !e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}
