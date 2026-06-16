import { SpendingRepository } from './ports.js';
import { SpendingEntry } from './types.js';
export interface SpendingService {
    list(projectId: number): Promise<{
        visible: boolean;
        entries: SpendingEntry[];
        totalAmount: number;
    }>;
    setVisible(projectId: number, visible: boolean): Promise<boolean>;
    createEntry(projectId: number, description: string, amount: number): Promise<SpendingEntry>;
    updateEntry(id: number, description?: string, amount?: number): Promise<SpendingEntry | null>;
    deleteEntry(id: number): Promise<boolean>;
}
export interface SpendingServiceDependencies {
    spending: SpendingRepository;
}
export declare function createSpendingService(deps: SpendingServiceDependencies): SpendingService;
