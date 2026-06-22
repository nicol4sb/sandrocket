export interface SummaryEntry {
  id: number;
  projectId: number;
  description: string;
  amount: number;
  entryDate: string; // YYYY-MM-DD
  accomptePayeDate: string; // YYYY-MM-DD or ''
  paiementCompletDate: string; // YYYY-MM-DD or ''
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSummaryEntryInput {
  projectId: number;
  description: string;
  amount: number;
  entryDate: string;
  accomptePayeDate: string;
  paiementCompletDate: string;
  position: number;
}

export interface UpdateSummaryEntryInput {
  id: number;
  description?: string;
  amount?: number;
  entryDate?: string;
  accomptePayeDate?: string;
  paiementCompletDate?: string;
}
