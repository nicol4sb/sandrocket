import { Database } from 'better-sqlite3';
import { CreateEpicInput, Epic, EpicRepository, UpdateEpicInput } from '@sandrocket/core';
export declare class SqliteEpicRepository implements EpicRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly listByProjectStmt;
    private readonly updateStmt;
    private readonly deleteStmt;
    constructor(db: Database);
    create(input: CreateEpicInput): Promise<Epic>;
    listByProject(projectId: number): Promise<Epic[]>;
    update(input: UpdateEpicInput): Promise<Epic | null>;
    delete(id: number): Promise<boolean>;
}
