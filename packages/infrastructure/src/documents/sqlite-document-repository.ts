import { Database, Statement } from 'better-sqlite3';
import { CreateDocumentInput, ProjectDocument, DocumentRepository } from '@sandrocket/core';

interface DocumentRow {
  id: number;
  project_id: number;
  uploader_user_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

function mapRow(row: DocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    uploaderUserId: row.uploader_user_id,
    originalFilename: row.original_filename,
    storedFilename: row.stored_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at)
  };
}

export class SqliteDocumentRepository implements DocumentRepository {
  private readonly insertStmt: Statement;
  private readonly findByIdStmt: Statement;
  private readonly listByProjectStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly totalSizeStmt: Statement;
  private readonly deleteByProjectStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO project_documents (project_id, uploader_user_id, original_filename, stored_filename, mime_type, size_bytes, created_at)
       VALUES (@project_id, @uploader_user_id, @original_filename, @stored_filename, @mime_type, @size_bytes, @created_at)`
    );
    this.findByIdStmt = db.prepare('SELECT * FROM project_documents WHERE id = ?');
    this.listByProjectStmt = db.prepare(
      'SELECT * FROM project_documents WHERE project_id = ? ORDER BY created_at DESC'
    );
    this.deleteStmt = db.prepare('DELETE FROM project_documents WHERE id = ?');
    this.totalSizeStmt = db.prepare(
      'SELECT COALESCE(SUM(size_bytes), 0) as total FROM project_documents WHERE project_id = ?'
    );
    this.deleteByProjectStmt = db.prepare('DELETE FROM project_documents WHERE project_id = ?');
  }

  async create(input: CreateDocumentInput): Promise<ProjectDocument> {
    const now = new Date().toISOString();
    const params = {
      project_id: input.projectId,
      uploader_user_id: input.uploaderUserId,
      original_filename: input.originalFilename,
      stored_filename: input.storedFilename,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      created_at: now
    };
    const info = this.insertStmt.run(params);
    const created = this.findByIdStmt.get(info.lastInsertRowid) as DocumentRow | undefined;
    if (!created) {
      throw new Error('Failed to fetch created document');
    }
    return mapRow(created);
  }

  async findById(id: number): Promise<ProjectDocument | null> {
    const row = this.findByIdStmt.get(id) as DocumentRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listByProject(projectId: number): Promise<ProjectDocument[]> {
    const rows = this.listByProjectStmt.all(projectId) as DocumentRow[];
    return rows.map(mapRow);
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  async getTotalSizeForProject(projectId: number): Promise<number> {
    const row = this.totalSizeStmt.get(projectId) as { total: number };
    return row.total;
  }

  async deleteByProject(projectId: number): Promise<number> {
    const result = this.deleteByProjectStmt.run(projectId);
    return result.changes;
  }
}
