import { Database } from 'better-sqlite3';
import { CreateProjectInput, Project, ProjectRepository } from '@sandrocket/core';
export declare class SqliteProjectRepository implements ProjectRepository {
  private readonly db;
  private readonly insertStmt;
  private readonly findByIdStmt;
  private readonly listByOwnerStmt;
  constructor(db: Database);
  create(input: CreateProjectInput): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  listByOwner(userId: string): Promise<Project[]>;
}


