function mapRow(row) {
    return {
        id: row.id,
        documentId: row.document_id,
        projectId: row.project_id,
        userId: row.user_id,
        action: row.action,
        filename: row.filename,
        createdAt: new Date(row.created_at)
    };
}
export class SqliteDocumentActivityRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = db.prepare(`INSERT INTO document_activity_log (document_id, project_id, user_id, action, filename, created_at)
       VALUES (@document_id, @project_id, @user_id, @action, @filename, @created_at)`);
        this.findByIdStmt = db.prepare('SELECT * FROM document_activity_log WHERE id = ?');
        this.listByProjectStmt = db.prepare('SELECT * FROM document_activity_log WHERE project_id = ? ORDER BY created_at DESC LIMIT ?');
    }
    async log(entry) {
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
        const created = this.findByIdStmt.get(info.lastInsertRowid);
        if (!created) {
            throw new Error('Failed to fetch created activity log entry');
        }
        return mapRow(created);
    }
    async listByProject(projectId, limit = 20) {
        const rows = this.listByProjectStmt.all(projectId, limit);
        return rows.map(mapRow);
    }
}
