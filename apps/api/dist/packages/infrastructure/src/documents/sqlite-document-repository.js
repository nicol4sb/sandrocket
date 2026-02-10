function mapRow(row) {
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
export class SqliteDocumentRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = db.prepare(`INSERT INTO project_documents (project_id, uploader_user_id, original_filename, stored_filename, mime_type, size_bytes, created_at)
       VALUES (@project_id, @uploader_user_id, @original_filename, @stored_filename, @mime_type, @size_bytes, @created_at)`);
        this.findByIdStmt = db.prepare('SELECT * FROM project_documents WHERE id = ?');
        this.listByProjectStmt = db.prepare('SELECT * FROM project_documents WHERE project_id = ? ORDER BY created_at DESC');
        this.deleteStmt = db.prepare('DELETE FROM project_documents WHERE id = ?');
        this.totalSizeStmt = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM project_documents WHERE project_id = ?');
        this.deleteByProjectStmt = db.prepare('DELETE FROM project_documents WHERE project_id = ?');
    }
    async create(input) {
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
        const created = this.findByIdStmt.get(info.lastInsertRowid);
        if (!created) {
            throw new Error('Failed to fetch created document');
        }
        return mapRow(created);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRow(row) : null;
    }
    async listByProject(projectId) {
        const rows = this.listByProjectStmt.all(projectId);
        return rows.map(mapRow);
    }
    async delete(id) {
        const result = this.deleteStmt.run(id);
        return result.changes > 0;
    }
    async getTotalSizeForProject(projectId) {
        const row = this.totalSizeStmt.get(projectId);
        return row.total;
    }
    async deleteByProject(projectId) {
        const result = this.deleteByProjectStmt.run(projectId);
        return result.changes;
    }
}
