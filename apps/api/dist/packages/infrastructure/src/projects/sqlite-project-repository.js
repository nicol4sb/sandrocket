import { randomUUID } from 'node:crypto';
function mapRowToProject(row) {
    return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteProjectRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = this.db.prepare(`INSERT INTO projects (id, owner_user_id, name, description, created_at, updated_at)
       VALUES (@id, @owner_user_id, @name, @description, @created_at, @updated_at)`);
        this.findByIdStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        this.listByOwnerStmt = this.db.prepare('SELECT * FROM projects WHERE owner_user_id = ? ORDER BY created_at ASC');
    }
    async create(input) {
        const now = new Date().toISOString();
        const record = {
            id: randomUUID(),
            owner_user_id: input.ownerUserId,
            name: input.name,
            description: input.description ?? null,
            created_at: now,
            updated_at: now
        };
        this.insertStmt.run(record);
        return mapRowToProject(record);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRowToProject(row) : null;
    }
    async listByOwner(userId) {
        const rows = this.listByOwnerStmt.all(userId);
        return rows.map(mapRowToProject);
    }
}
