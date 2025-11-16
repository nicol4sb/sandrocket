import { randomUUID } from 'node:crypto';
function mapRowToEpic(row) {
    return {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteEpicRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = this.db.prepare(`INSERT INTO epics (id, project_id, name, description, created_at, updated_at)
       VALUES (@id, @project_id, @name, @description, @created_at, @updated_at)`);
        this.listByProjectStmt = this.db.prepare('SELECT * FROM epics WHERE project_id = ? ORDER BY created_at ASC');
    }
    async create(input) {
        const now = new Date().toISOString();
        const record = {
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
    async listByProject(projectId) {
        const rows = this.listByProjectStmt.all(projectId);
        return rows.map(mapRowToEpic);
    }
}
