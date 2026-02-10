import { Database, Statement } from 'better-sqlite3';
import { DocumentAction, DocumentActivity, DocumentActivityRepository } from '@sandrocket/core';

interface ActivityRow {
  id: number;
  document_id: number | null;
  project_id: number;
  user_id: number;
  action: string;
  filename: string;
  created_at: string;
}

function mapRow(row: ActivityRow): DocumentActivity {
  return {
    id: row.id,
    documentId: row.document_id,
    projectId: row.project_id,
    userId: row.user_id,
    action: row.action as DocumentAction,
    filename: row.filename,
    createdAt: new Date(row.created_at)
  };
}

export class SqliteDocumentActivityRepository implements DocumentActivityRepository {
  private readonly insertStmt: Statement;
  private readonly findByIdStmt: Statement;
  private readonly listByProjectStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO document_activity_log (document_id, project_id, user_id, action, filename, created_at)
       VALUES (@document_id, @project_id, @user_id, @action, @filename, @created_at)`
    );
    this.findByIdStmt = db.prepare('SELECT * FROM document_activity_log WHERE id = ?');
    this.listByProjectStmt = db.prepare(
      'SELECT * FROM document_activity_log WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    );
  }

  async log(entry: {
    documentId: number | null;
    projectId: number;
    userId: number;
    action: DocumentAction;
    filename: string;
  }): Promise<DocumentActivity> {
    const now = new Date().toISOString();
    const params = {
      document_id: entry.documentId,
      project_id: entry.projectId,
      user_id: entry.userId,
      action: entry.action,
      filename: entry.filename,
      created_at: now
    };
    const info = this.insertStmt.run(params);
    const created = this.findByIdStmt.get(info.lastInsertRowid) as ActivityRow | undefined;
    if (!created) {
      throw new Error('Failed to fetch created activity log entry');
    }
    return mapRow(created);
  }

  async listByProject(projectId: number, limit = 20): Promise<DocumentActivity[]> {
    const rows = this.listByProjectStmt.all(projectId, limit) as ActivityRow[];
    return rows.map(mapRow);
  }
}
