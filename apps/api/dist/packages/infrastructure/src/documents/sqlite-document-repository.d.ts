import { Database } from 'better-sqlite3';
import { CreateDocumentInput, ProjectDocument, DocumentRepository } from '@sandrocket/core';
export declare class SqliteDocumentRepository implements DocumentRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByIdStmt;
    private readonly listByProjectStmt;
    private readonly deleteStmt;
    private readonly totalSizeStmt;
    private readonly deleteByProjectStmt;
    constructor(db: Database);
    create(input: CreateDocumentInput): Promise<ProjectDocument>;
    findById(id: number): Promise<ProjectDocument | null>;
    listByProject(projectId: number): Promise<ProjectDocument[]>;
    delete(id: number): Promise<boolean>;
    getTotalSizeForProject(projectId: number): Promise<number>;
    deleteByProject(projectId: number): Promise<number>;
}
