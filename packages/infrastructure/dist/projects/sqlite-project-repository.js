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
        this.insertStmt = this.db.prepare(`INSERT INTO projects (owner_user_id, name, description, created_at, updated_at)
       VALUES (@owner_user_id, @name, @description, @created_at, @updated_at)`);
        this.findByIdStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        this.listByOwnerStmt = this.db.prepare('SELECT * FROM projects WHERE owner_user_id = ? ORDER BY created_at ASC');
        this.updateStmt = this.db.prepare(`UPDATE projects SET
         name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         updated_at = @updated_at
       WHERE id = @id`);
        this.deleteStmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    }
    async create(input) {
        const now = new Date().toISOString();
        const params = {
            owner_user_id: input.ownerUserId,
            name: input.name,
            description: input.description ?? null,
            created_at: now,
            updated_at: now
        };
        const info = this.insertStmt.run(params);
        const created = this.findByIdStmt.get(info.lastInsertRowid);
        if (!created) {
            throw new Error('Failed to fetch created project');
        }
        return mapRowToProject(created);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRowToProject(row) : null;
    }
    async listByOwner(userId) {
        const rows = this.listByOwnerStmt.all(userId);
        return rows.map(mapRowToProject);
    }
    async update(input) {
        const existing = this.findByIdStmt.get(input.id);
        if (!existing)
            return null;
        const updatedAt = new Date().toISOString();
        const updateParams = {
            id: input.id,
            name: input.name ?? null,
            description: input.description ?? null,
            updated_at: updatedAt
        };
        this.updateStmt.run(updateParams);
        const after = this.findByIdStmt.get(input.id);
        return after ? mapRowToProject(after) : null;
    }
    async delete(id) {
        const result = this.deleteStmt.run(id);
        return result.changes > 0;
    }
}
