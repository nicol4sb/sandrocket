import { Database } from 'better-sqlite3';
import { CreateSpendingEntryInput, SpendingEntry, SpendingRepository, UpdateSpendingEntryInput } from '@sandrocket/core';
export declare class SqliteSpendingRepository implements SpendingRepository {
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
    listByProject(projectId: number): Promise<SpendingEntry[]>;
    findById(id: number): Promise<SpendingEntry | null>;
    create(input: CreateSpendingEntryInput): Promise<SpendingEntry>;
    update(input: UpdateSpendingEntryInput): Promise<SpendingEntry | null>;
    delete(id: number): Promise<boolean>;
    getMaxPosition(projectId: number): Promise<number>;
    isVisible(projectId: number): Promise<boolean>;
    setVisible(projectId: number, visible: boolean): Promise<void>;
}
