import { Database } from 'better-sqlite3';
import { DocumentAction, DocumentActivity, DocumentActivityRepository } from '@sandrocket/core';
export declare class SqliteDocumentActivityRepository implements DocumentActivityRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByIdStmt;
    private readonly listByProjectStmt;
    constructor(db: Database);
    log(entry: {
        documentId: number | null;
        projectId: number;
        userId: number;
        action: DocumentAction;
        filename: string;
    }): Promise<DocumentActivity>;
    listByProject(projectId: number, limit?: number): Promise<DocumentActivity[]>;
}
