import { Database } from 'better-sqlite3';
import { CreateSummaryEntryInput, SummaryEntry, SummaryRepository, UpdateSummaryEntryInput } from '@sandrocket/core';
export declare class SqliteSummaryRepository implements SummaryRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByIdStmt;
    private readonly listByProjectStmt;
    private readonly updateStmt;
    private readonly deleteStmt;
    private readonly deleteByProjectStmt;
    private readonly maxPositionStmt;
    private readonly getVisibleStmt;
    private readonly setVisibleStmt;
    constructor(db: Database);
    listByProject(projectId: number): Promise<SummaryEntry[]>;
    findById(id: number): Promise<SummaryEntry | null>;
    create(input: CreateSummaryEntryInput): Promise<SummaryEntry>;
    update(input: UpdateSummaryEntryInput): Promise<SummaryEntry | null>;
    delete(id: number): Promise<boolean>;
    deleteByProject(projectId: number): Promise<void>;
    replaceAll(projectId: number, inputs: Omit<CreateSummaryEntryInput, 'projectId'>[]): Promise<SummaryEntry[]>;
    getMaxPosition(projectId: number): Promise<number>;
    isVisible(projectId: number): Promise<boolean>;
    setVisible(projectId: number, visible: boolean): Promise<void>;
}
