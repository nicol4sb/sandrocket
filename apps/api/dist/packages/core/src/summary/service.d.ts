import { SummaryRepository } from './ports.js';
import { SummaryEntry } from './types.js';
export interface SummaryService {
    list(projectId: number): Promise<{
        visible: boolean;
        entries: SummaryEntry[];
        totalAmount: number;
    }>;
    setVisible(projectId: number, visible: boolean): Promise<boolean>;
    createEntry(projectId: number, description: string, amount: number, entryDate?: string, accomptePayeDate?: string, paiementCompletDate?: string): Promise<SummaryEntry>;
    updateEntry(id: number, description?: string, amount?: number, entryDate?: string, accomptePayeDate?: string, paiementCompletDate?: string): Promise<SummaryEntry | null>;
    deleteEntry(id: number): Promise<boolean>;
}
export interface SummaryServiceDependencies {
    summary: SummaryRepository;
}
export declare function createSummaryService(deps: SummaryServiceDependencies): SummaryService;
