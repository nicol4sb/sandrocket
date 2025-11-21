function mapRowToTask(row) {
    return {
        id: row.id,
        epicId: row.epic_id,
        creatorUserId: row.creator_user_id,
        description: row.description,
        status: row.status,
        position: row.position,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastEditedByUserId: row.last_edited_by_user_id
    };
}
export class SqliteTaskRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = this.db.prepare(`INSERT INTO tasks (epic_id, creator_user_id, description, status, position, created_at, updated_at)
       VALUES (@epic_id, @creator_user_id, @description, @status, @position, @created_at, @updated_at)`);
        this.listByEpicStmt = this.db.prepare('SELECT * FROM tasks WHERE epic_id = ? ORDER BY status ASC, position ASC, created_at ASC');
        this.getMaxPosStmt = this.db.prepare('SELECT MAX(position) as maxPos FROM tasks WHERE epic_id = ? AND status = ?');
        this.getByIdStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        this.updateStmt = this.db.prepare(`UPDATE tasks SET
         description = COALESCE(@description, description),
         status = COALESCE(@status, status),
         position = COALESCE(@position, position),
         last_edited_by_user_id = COALESCE(@last_edited_by_user_id, last_edited_by_user_id),
         updated_at = @updated_at
       WHERE id = @id`);
        this.deleteStmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    }
    async create(input, initialPosition) {
        const now = new Date().toISOString();
        const params = {
            epic_id: input.epicId,
            creator_user_id: input.creatorUserId,
            description: input.description,
            status: 'backlog',
            position: initialPosition,
            created_at: now,
            updated_at: now
        };
        const info = this.insertStmt.run(params);
        const row = this.getByIdStmt.get(info.lastInsertRowid);
        if (!row)
            throw new Error('Failed to fetch created task');
        return mapRowToTask(row);
    }
    async listByEpic(epicId) {
        const rows = this.listByEpicStmt.all(epicId);
        return rows.map(mapRowToTask);
    }
    async getMaxPosition(epicId, status) {
        const row = this.getMaxPosStmt.get(epicId, status);
        return row?.maxPos ?? 0;
    }
    async update(input) {
        const existing = this.getByIdStmt.get(input.id);
        if (!existing)
            return null;
        const updatedAt = new Date().toISOString();
        const updateParams = {
            id: input.id,
            description: input.description ?? null,
            status: input.status ?? null,
            position: input.position ?? null,
            last_edited_by_user_id: input.lastEditedByUserId ?? null,
            updated_at: updatedAt
        };
        this.updateStmt.run(updateParams);
        const after = this.getByIdStmt.get(input.id);
        return after ? mapRowToTask(after) : null;
    }
    async delete(id) {
        const result = this.deleteStmt.run(id);
        return result.changes > 0;
    }
}
