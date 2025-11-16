import { randomUUID } from 'node:crypto';
import { Database, Statement } from 'better-sqlite3';
import { CreateEpicInput, Epic, EpicRepository } from '@sandrocket/core';

interface EpicRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToEpic(row: EpicRow): Epic {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export class SqliteEpicRepository implements EpicRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly listByProjectStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO epics (id, project_id, name, description, created_at, updated_at)
       VALUES (@id, @project_id, @name, @description, @created_at, @updated_at)`
    );
    this.listByProjectStmt = this.db.prepare(
      'SELECT * FROM epics WHERE project_id = ? ORDER BY created_at ASC'
    );
  }

  async create(input: CreateEpicInput): Promise<Epic> {
    const now = new Date().toISOString();
    const record: EpicRow = {
      id: randomUUID(),
      project_id: input.projectId,
      name: input.name,
      description: input.description ?? null,
      created_at: now,
      updated_at: now
    };
    this.insertStmt.run(record);
    return mapRowToEpic(record);
  }

  async listByProject(projectId: string): Promise<Epic[]> {
    const rows = this.listByProjectStmt.all(projectId) as EpicRow[];
    return rows.map(mapRowToEpic);
  }
}


