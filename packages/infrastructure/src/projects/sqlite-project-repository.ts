import { randomUUID } from 'node:crypto';
import { Database, Statement } from 'better-sqlite3';
import { CreateProjectInput, Project, ProjectRepository } from '@sandrocket/core';

interface ProjectRow {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export class SqliteProjectRepository implements ProjectRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly findByIdStmt: Statement;
  private readonly listByOwnerStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at)
       VALUES (@id, @owner_user_id, @name, @description, @created_at, @updated_at)`
    );
    this.findByIdStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    this.listByOwnerStmt = this.db.prepare(
      'SELECT * FROM projects WHERE owner_user_id = ? ORDER BY created_at ASC'
    );
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const record: ProjectRow = {
      id: randomUUID(),
      owner_user_id: input.ownerUserId,
      name: input.name,
      description: input.description ?? null,
      created_at: now,
      updated_at: now
    };
    this.insertStmt.run(record);
    return mapRowToProject(record);
  }

  async findById(id: string): Promise<Project | null> {
    const row = this.findByIdStmt.get(id) as ProjectRow | undefined;
    return row ? mapRowToProject(row) : null;
  }

  async listByOwner(userId: string): Promise<Project[]> {
    const rows = this.listByOwnerStmt.all(userId) as ProjectRow[];
    return rows.map(mapRowToProject);
  }
}


