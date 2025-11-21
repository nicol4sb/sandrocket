import { Database, Statement } from 'better-sqlite3';
import { CreateEpicInput, Epic, EpicRepository, UpdateEpicInput } from '@sandrocket/core';

interface EpicRow {
  id: number;
  project_id: number;
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
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO epics (project_id, name, description, created_at, updated_at)
       VALUES (@project_id, @name, @description, @created_at, @updated_at)`
    );
    this.listByProjectStmt = this.db.prepare(
      'SELECT * FROM epics WHERE project_id = ? ORDER BY created_at ASC'
    );
    this.updateStmt = this.db.prepare(
      `UPDATE epics SET
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = this.db.prepare('DELETE FROM epics WHERE id = ?');
  }

  async create(input: CreateEpicInput): Promise<Epic> {
    const now = new Date().toISOString();
    const params = {
      project_id: input.projectId,
      name: input.name,
      description: input.description ?? null,
      created_at: now,
      updated_at: now
    };
    const info = this.insertStmt.run(params);
    const row = this.db.prepare('SELECT * FROM epics WHERE id = ?').get(info.lastInsertRowid) as EpicRow | undefined;
    if (!row) throw new Error('Failed to fetch created epic');
    return mapRowToEpic(row);
  }

  async listByProject(projectId: number): Promise<Epic[]> {
    const rows = this.listByProjectStmt.all(projectId) as EpicRow[];
    return rows.map(mapRowToEpic);
  }

  async update(input: UpdateEpicInput): Promise<Epic | null> {
    const now = new Date().toISOString();
    const params = {
      id: input.id,
      name: input.name ?? null,
      description: input.description ?? null,
      updated_at: now
    };
    const info = this.updateStmt.run(params);
    if (info.changes === 0) return null;
    const row = this.db.prepare('SELECT * FROM epics WHERE id = ?').get(input.id) as EpicRow | undefined;
    return row ? mapRowToEpic(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}


