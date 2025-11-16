import { randomUUID } from 'node:crypto';
function mapRowToTask(row) {
    return {
        id: row.id,
        epicId: row.epic_id,
        title: row.title,
        description: row.description,
        status: row.status,
        position: row.position,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteTaskRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = this.db.prepare(`INSERT INTO tasks (id, epic_id, title, description, status, position, created_at, updated_at)
       VALUES (@id, @epic_id, @title, @description, @status, @position, @created_at, @updated_at)`);
        this.listByEpicStmt = this.db.prepare('SELECT * FROM tasks WHERE epic_id = ? ORDER BY status ASC, position ASC, created_at ASC');
        this.getMaxPosStmt = this.db.prepare('SELECT MAX(position) as maxPos FROM tasks WHERE epic_id = ? AND status = ?');
        this.getByIdStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        this.updateStmt = this.db.prepare(`UPDATE tasks SET
         title = COALESCE(@title, title),
         description = COALESCE(@description, description),
         status = COALESCE(@status, status),
         position = COALESCE(@position, position),
         updated_at = @updated_at
       WHERE id = @id`);
    }
    async create(input, initialPosition) {
        const now = new Date().toISOString();
        const record = {
            id: randomUUID(),
            epic_id: input.epicId,
            title: input.title,
            description: input.description ?? null,
            status: 'backlog',
            position: initialPosition,
            created_at: now,
            updated_at: now
        };
        this.insertStmt.run(record);
        return mapRowToTask(record);
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
            title: input.title ?? null,
            description: input.description ?? null,
            status: input.status ?? null,
            position: input.position ?? null,
            updated_at: updatedAt
        };
        this.updateStmt.run(updateParams);
        const after = this.getByIdStmt.get(input.id);
        return after ? mapRowToTask(after) : null;
    }
}
