export interface SpendingEntry {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  entryDate: string; // YYYY-MM-DD
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpendingEntryInput {
  projectId: number;
  description: string;
  amount: number;
  entryDate: string;
  position: number;
}

export interface UpdateSpendingEntryInput {
  id: number;
  description?: string;
  amount?: number;
  entryDate?: string;
}
