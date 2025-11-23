import { Database, Statement } from 'better-sqlite3';
import { ProjectInvitationRepository, CreateInvitationInput, ProjectInvitation } from '@sandrocket/core';
import { randomBytes } from 'node:crypto';

interface ProjectInvitationRow {
  id: number;
  project_id: number;
  token: string;
  created_by_user_id: number;
  used_by_user_id: number | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

function mapRowToProjectInvitation(row: ProjectInvitationRow): ProjectInvitation {
  return {
    id: row.id,
    projectId: row.project_id,
    token: row.token,
    createdByUserId: row.created_by_user_id,
    usedByUserId: row.used_by_user_id,
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null
  };
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export class SqliteProjectInvitationRepository implements ProjectInvitationRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly findByTokenStmt: Statement;
  private readonly markAsUsedStmt: Statement;
  private readonly deleteByIdStmt: Statement;
  private readonly deleteByTokenStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO project_invitations (project_id, token, created_by_user_id, created_at, expires_at)
       VALUES (@project_id, @token, @created_by_user_id, @created_at, @expires_at)`
    );
    this.findByTokenStmt = this.db.prepare(
      'SELECT * FROM project_invitations WHERE token = ?'
    );
    this.markAsUsedStmt = this.db.prepare(
      `UPDATE project_invitations 
       SET used_by_user_id = @user_id, used_at = @used_at
       WHERE token = @token AND used_by_user_id IS NULL`
    );
    this.deleteByIdStmt = this.db.prepare('DELETE FROM project_invitations WHERE id = ?');
    this.deleteByTokenStmt = this.db.prepare('DELETE FROM project_invitations WHERE token = ?');
  }

  async create(input: CreateInvitationInput): Promise<ProjectInvitation> {
    const now = new Date().toISOString();
    let token: string;
    let attempts = 0;
    // Ensure unique token
    do {
      token = generateToken();
      const existing = this.findByTokenStmt.get(token) as ProjectInvitationRow | undefined;
      if (!existing) break;
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique invitation token');
      }
    } while (true);

    const params = {
      project_id: input.projectId,
      token,
      created_by_user_id: input.createdByUserId,
      created_at: now,
      expires_at: input.expiresAt ? input.expiresAt.toISOString() : null
    };
    const info = this.insertStmt.run(params);
    const created = this.db.prepare('SELECT * FROM project_invitations WHERE id = ?').get(info.lastInsertRowid) as ProjectInvitationRow | undefined;
    if (!created) {
      throw new Error('Failed to fetch created project invitation');
    }
    return mapRowToProjectInvitation(created);
  }

  async findByToken(token: string): Promise<ProjectInvitation | null> {
    const row = this.findByTokenStmt.get(token) as ProjectInvitationRow | undefined;
    if (!row) return null;
    
    // Check if expired
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (expiresAt < new Date()) {
        return null; // Expired
      }
    }
    
    // Check if already used
    if (row.used_by_user_id !== null) {
      return null; // Already used
    }
    
    return mapRowToProjectInvitation(row);
  }

  async markAsUsed(token: string, userId: number): Promise<boolean> {
    const now = new Date().toISOString();
    const result = this.markAsUsedStmt.run({
      token,
      user_id: userId,
      used_at: now
    });
    return result.changes > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteByIdStmt.run(id);
    return result.changes > 0;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const result = this.deleteByTokenStmt.run(token);
    return result.changes > 0;
  }
}


