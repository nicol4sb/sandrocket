import { Database } from 'better-sqlite3';
import { CreateEpicInput, Epic, EpicRepository } from '@sandrocket/core';
export declare class SqliteEpicRepository implements EpicRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly listByProjectStmt;
    constructor(db: Database);
    create(input: CreateEpicInput): Promise<Epic>;
    listByProject(projectId: string): Promise<Epic[]>;
}
