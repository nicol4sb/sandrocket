import { Database } from 'better-sqlite3';
import { ProjectMemberRepository, ProjectMember, ProjectRole } from '@sandrocket/core';
export declare class SqliteProjectMemberRepository implements ProjectMemberRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByProjectAndUserStmt;
    private readonly listByUserStmt;
    private readonly listByProjectStmt;
    private readonly deleteStmt;
    constructor(db: Database);
    create(projectId: number, userId: number, role: ProjectRole): Promise<ProjectMember>;
    findByProjectAndUser(projectId: number, userId: number): Promise<ProjectMember | null>;
    listByUser(userId: number): Promise<ProjectMember[]>;
    listByProject(projectId: number): Promise<ProjectMember[]>;
    delete(projectId: number, userId: number): Promise<boolean>;
}
