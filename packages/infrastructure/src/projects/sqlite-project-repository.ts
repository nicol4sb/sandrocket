import { Database, Statement } from 'better-sqlite3';
import { CreateProjectInput, Project, ProjectRepository, UpdateProjectInput } from '@sandrocket/core';

interface ProjectRow {
  id: number;
  owner_user_id: number;
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
  private readonly listByUserStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO projects (owner_user_id, name, description, created_at, updated_at)
       VALUES (@owner_user_id, @name, @description, @created_at, @updated_at)`
    );
    this.findByIdStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    this.listByOwnerStmt = this.db.prepare(
      'SELECT * FROM projects WHERE owner_user_id = ? ORDER BY created_at ASC'
    );
    this.listByUserStmt = this.db.prepare(
      `SELECT DISTINCT p.* FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?
       ORDER BY p.created_at ASC`
    );
    this.updateStmt = this.db.prepare(
      `UPDATE projects SET
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const params = {
      owner_user_id: input.ownerUserId,
      name: input.name,
      description: input.description ?? null,
      created_at: now,
      updated_at: now
    };
    const info = this.insertStmt.run(params);
    const created = this.findByIdStmt.get(info.lastInsertRowid) as ProjectRow | undefined;
    if (!created) {
      throw new Error('Failed to fetch created project');
    }
    return mapRowToProject(created);
  }

  async findById(id: number): Promise<Project | null> {
    const row = this.findByIdStmt.get(id) as ProjectRow | undefined;
    return row ? mapRowToProject(row) : null;
  }

  async listByOwner(userId: number): Promise<Project[]> {
    const rows = this.listByOwnerStmt.all(userId) as ProjectRow[];
    return rows.map(mapRowToProject);
  }

  async listByUser(userId: number): Promise<Project[]> {
    const rows = this.listByUserStmt.all(userId) as ProjectRow[];
    return rows.map(mapRowToProject);
  }

  async update(input: UpdateProjectInput): Promise<Project | null> {
    const existing = this.findByIdStmt.get(input.id) as ProjectRow | undefined;
    if (!existing) return null;

    const updatedAt = new Date().toISOString();
    const updateParams = {
      id: input.id,
      name: input.name ?? null,
      description: input.description ?? null,
      updated_at: updatedAt
    };
    this.updateStmt.run(updateParams);
    const after = this.findByIdStmt.get(input.id) as ProjectRow | undefined;
    return after ? mapRowToProject(after) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}


