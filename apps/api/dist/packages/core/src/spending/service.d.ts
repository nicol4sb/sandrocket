import { SpendingRepository } from './ports.js';
import { SpendingEntry } from './types.js';
export interface SpendingImportEntryInput {
    description: string;
    amount: number;
    entryDate?: string;
    bank?: string;
    paid?: boolean;
}
export interface SpendingService {
    list(projectId: number): Promise<{
        visible: boolean;
        entries: SpendingEntry[];
        totalAmount: number;
    }>;
    setVisible(projectId: number, visible: boolean): Promise<boolean>;
    createEntry(projectId: number, description: string, amount: number, entryDate?: string, bank?: string, paid?: boolean): Promise<SpendingEntry>;
    updateEntry(id: number, description?: string, amount?: number, entryDate?: string, bank?: string, paid?: boolean): Promise<SpendingEntry | null>;
    deleteEntry(id: number): Promise<boolean>;
    importEntries(projectId: number, entries: SpendingImportEntryInput[], replace?: boolean): Promise<{
        entries: SpendingEntry[];
        totalAmount: number;
    }>;
}
export interface SpendingServiceDependencies {
    spending: SpendingRepository;
}
export declare function createSpendingService(deps: SpendingServiceDependencies): SpendingService;
