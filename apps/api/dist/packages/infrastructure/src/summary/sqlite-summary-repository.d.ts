import { Database } from 'better-sqlite3';
import { CreateSummaryEntryInput, SummaryEntry, SummaryRepository, UpdateSummaryEntryInput } from '@sandrocket/core';
export declare class SqliteSummaryRepository implements SummaryRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByIdStmt;
    private readonly listByProjectStmt;
    private readonly updateStmt;
    private readonly deleteStmt;
    private readonly maxPositionStmt;
    private readonly getVisibleStmt;
    private readonly setVisibleStmt;
    constructor(db: Database);
    listByProject(projectId: number): Promise<SummaryEntry[]>;
    findById(id: number): Promise<SummaryEntry | null>;
    create(input: CreateSummaryEntryInput): Promise<SummaryEntry>;
    update(input: UpdateSummaryEntryInput): Promise<SummaryEntry | null>;
    delete(id: number): Promise<boolean>;
    getMaxPosition(projectId: number): Promise<number>;
    isVisible(projectId: number): Promise<boolean>;
    setVisible(projectId: number, visible: boolean): Promise<void>;
}
