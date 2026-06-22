export interface SummaryEntry {
    id: number;
    projectId: number;
    lot: string;
    fichierRetenu: string;
    amount: number;
    entryDate: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateSummaryEntryInput {
    projectId: number;
    lot: string;
    fichierRetenu: string;
    amount: number;
    entryDate: string;
    position: number;
}
export interface UpdateSummaryEntryInput {
    id: number;
    lot?: string;
    fichierRetenu?: string;
    amount?: number;
    entryDate?: string;
}
