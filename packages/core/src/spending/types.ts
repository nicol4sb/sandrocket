export interface SpendingEntry {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpendingEntryInput {
  projectId: number;
  description: string;
  amount: number;
  position: number;
}

export interface UpdateSpendingEntryInput {
  id: number;
  description?: string;
  amount?: number;
}
