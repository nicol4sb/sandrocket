export interface SpendingEntry {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  entryDate: string; // YYYY-MM-DD
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

export function spendingPaidTotal(entries: Pick<SpendingEntry, 'amount' | 'paid'>[]): number {
  return entries.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);
}
