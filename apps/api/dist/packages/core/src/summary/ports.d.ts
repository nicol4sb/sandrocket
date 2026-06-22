import { CreateSummaryEntryInput, SummaryEntry, UpdateSummaryEntryInput } from './types.js';
export interface SummaryRepository {
    listByProject(projectId: number): Promise<SummaryEntry[]>;
    findById(id: number): Promise<SummaryEntry | null>;
    create(input: CreateSummaryEntryInput): Promise<SummaryEntry>;
    update(input: UpdateSummaryEntryInput): Promise<SummaryEntry | null>;
    delete(id: number): Promise<boolean>;
    getMaxPosition(projectId: number): Promise<number>;
    isVisible(projectId: number): Promise<boolean>;
    setVisible(projectId: number, visible: boolean): Promise<void>;
}
