import { Database } from 'better-sqlite3';
import { CreateProjectInput, Project, ProjectRepository, UpdateProjectInput } from '@sandrocket/core';
export declare class SqliteProjectRepository implements ProjectRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly findByIdStmt;
    private readonly listByOwnerStmt;
    private readonly updateStmt;
    private readonly deleteStmt;
    constructor(db: Database);
    create(input: CreateProjectInput): Promise<Project>;
    findById(id: number): Promise<Project | null>;
    listByOwner(userId: number): Promise<Project[]>;
    update(input: UpdateProjectInput): Promise<Project | null>;
    delete(id: number): Promise<boolean>;
}
