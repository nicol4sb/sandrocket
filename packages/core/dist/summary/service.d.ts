import { SummaryRepository } from './ports.js';
import { SummaryEntry } from './types.js';
export interface SummaryImportEntryInput {
    lot: string;
    fichierRetenu?: string;
    amount: number;
    entryDate?: string;
}
export interface SummaryService {
    list(projectId: number): Promise<{
        visible: boolean;
        entries: SummaryEntry[];
        totalAmount: number;
    }>;
    setVisible(projectId: number, visible: boolean): Promise<boolean>;
    createEntry(projectId: number, lot: string, amount: number, entryDate?: string, fichierRetenu?: string): Promise<SummaryEntry>;
    updateEntry(id: number, lot?: string, amount?: number, entryDate?: string, fichierRetenu?: string): Promise<SummaryEntry | null>;
    deleteEntry(id: number): Promise<boolean>;
    importEntries(projectId: number, entries: SummaryImportEntryInput[], replace?: boolean): Promise<{
        entries: SummaryEntry[];
        totalAmount: number;
    }>;
}
export interface SummaryServiceDependencies {
    summary: SummaryRepository;
}
export declare function createSummaryService(deps: SummaryServiceDependencies): SummaryService;
