import { Database, Statement } from 'better-sqlite3';
import { ProjectMemberRepository, ProjectMember, ProjectRole } from '@sandrocket/core';

interface ProjectMemberRow {
  id: number;
  project_id: number;
  user_id: number;
  role: string;
  created_at: string;
}

function mapRowToProjectMember(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role as ProjectRole,
    createdAt: new Date(row.created_at)
  };
}

export class SqliteProjectMemberRepository implements ProjectMemberRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly findByProjectAndUserStmt: Statement;
  private readonly listByUserStmt: Statement;
  private readonly listByProjectStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (@project_id, @user_id, @role, @created_at)`
    );
    this.findByProjectAndUserStmt = this.db.prepare(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?'
    );
    this.listByUserStmt = this.db.prepare(
      'SELECT * FROM project_members WHERE user_id = ?'
    );
    this.listByProjectStmt = this.db.prepare(
      'SELECT * FROM project_members WHERE project_id = ?'
    );
    this.deleteStmt = this.db.prepare(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
    );
  }

  async create(projectId: number, userId: number, role: ProjectRole): Promise<ProjectMember> {
    const now = new Date().toISOString();
    const params = {
      project_id: projectId,
      user_id: userId,
      role,
      created_at: now
    };
    const info = this.insertStmt.run(params);
    const created = this.db.prepare('SELECT * FROM project_members WHERE id = ?').get(info.lastInsertRowid) as ProjectMemberRow | undefined;
    if (!created) {
      throw new Error('Failed to fetch created project member');
    }
    return mapRowToProjectMember(created);
  }

  async findByProjectAndUser(projectId: number, userId: number): Promise<ProjectMember | null> {
    const row = this.findByProjectAndUserStmt.get(projectId, userId) as ProjectMemberRow | undefined;
    return row ? mapRowToProjectMember(row) : null;
  }

  async listByUser(userId: number): Promise<ProjectMember[]> {
    const rows = this.listByUserStmt.all(userId) as ProjectMemberRow[];
    return rows.map(mapRowToProjectMember);
  }

  async listByProject(projectId: number): Promise<ProjectMember[]> {
    const rows = this.listByProjectStmt.all(projectId) as ProjectMemberRow[];
    return rows.map(mapRowToProjectMember);
  }

  async delete(projectId: number, userId: number): Promise<boolean> {
    const result = this.deleteStmt.run(projectId, userId);
    return result.changes > 0;
  }
}

