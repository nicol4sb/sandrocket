import { Database } from 'better-sqlite3';
import { ProjectInvitationRepository, CreateInvitationInput, ProjectInvitation } from '@sandrocket/core';
export declare class SqliteProjectInvitationRepository implements ProjectInvitationRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByTokenStmt;
    private readonly markAsUsedStmt;
    private readonly deleteByIdStmt;
    private readonly deleteByTokenStmt;
    constructor(db: Database);
    create(input: CreateInvitationInput): Promise<ProjectInvitation>;
    findByToken(token: string): Promise<ProjectInvitation | null>;
    markAsUsed(token: string, userId: number): Promise<boolean>;
    delete(id: number): Promise<boolean>;
    deleteByToken(token: string): Promise<boolean>;
}
