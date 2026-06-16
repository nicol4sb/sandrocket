function mapRow(row) {
    return {
        id: row.id,
        projectId: row.project_id,
        description: row.description,
        amount: row.amount,
        entryDate: row.entry_date,
        bank: row.bank ?? '',
        position: row.position,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteSpendingRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = db.prepare(`INSERT INTO project_spending_entries (project_id, description, amount, entry_date, bank, position, created_at, updated_at)
       VALUES (@project_id, @description, @amount, @entry_date, @bank, @position, @created_at, @updated_at)`);
        this.findByIdStmt = db.prepare('SELECT * FROM project_spending_entries WHERE id = ?');
        this.listByProjectStmt = db.prepare('SELECT * FROM project_spending_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC');
        this.updateStmt = db.prepare(`UPDATE project_spending_entries SET
         description = COALESCE(@description, description),
         amount = COALESCE(@amount, amount),
         entry_date = COALESCE(@entry_date, entry_date),
         bank = COALESCE(@bank, bank),
         updated_at = @updated_at
       WHERE id = @id`);
        this.deleteStmt = db.prepare('DELETE FROM project_spending_entries WHERE id = ?');
        this.maxPositionStmt = db.prepare('SELECT COALESCE(MAX(position), 0) as maxPos FROM project_spending_entries WHERE project_id = ?');
        this.getVisibleStmt = db.prepare('SELECT spending_visible FROM projects WHERE id = ?');
        this.setVisibleStmt = db.prepare('UPDATE projects SET spending_visible = @visible, updated_at = @updated_at WHERE id = @id');
    }
    async listByProject(projectId) {
        const rows = this.listByProjectStmt.all(projectId);
        return rows.map(mapRow);
    }
    async findById(id) {
        const row = this.findByIdStmt.get(id);
        return row ? mapRow(row) : null;
    }
    async create(input) {
        const now = new Date().toISOString();
        const params = {
            project_id: input.projectId,
            description: input.description,
            amount: input.amount,
            entry_date: input.entryDate,
            bank: input.bank,
            position: input.position,
            created_at: now,
            updated_at: now
        };
        const info = this.insertStmt.run(params);
        const created = this.findByIdStmt.get(info.lastInsertRowid);
        if (!created)
            throw new Error('Failed to fetch created spending entry');
        return mapRow(created);
    }
    async update(input) {
        const existing = this.findByIdStmt.get(input.id);
        if (!existing)
            return null;
        this.updateStmt.run({
            id: input.id,
            description: input.description ?? null,
            amount: input.amount ?? null,
            entry_date: input.entryDate ?? null,
            bank: input.bank ?? null,
            updated_at: new Date().toISOString()
        });
        const after = this.findByIdStmt.get(input.id);
        return after ? mapRow(after) : null;
    }
    async delete(id) {
        const result = this.deleteStmt.run(id);
        return result.changes > 0;
    }
    async getMaxPosition(projectId) {
        const row = this.maxPositionStmt.get(projectId);
        return row?.maxPos ?? 0;
    }
    async isVisible(projectId) {
        const row = this.getVisibleStmt.get(projectId);
        return row ? row.spending_visible === 1 : false;
    }
    async setVisible(projectId, visible) {
        this.setVisibleStmt.run({
            id: projectId,
            visible: visible ? 1 : 0,
            updated_at: new Date().toISOString()
        });
    }
}
