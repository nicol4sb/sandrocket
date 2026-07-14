function mapRow(row) {
    return {
        id: row.id,
        projectId: row.project_id,
        description: row.description,
        amount: row.amount,
        entryDate: row.entry_date,
        bank: row.bank ?? '',
        paid: row.paid == null ? true : row.paid === 1,
        debtPaid: row.debt_paid === 1,
        position: row.position,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
export class SqliteSpendingRepository {
    constructor(db) {
        this.db = db;
        this.insertStmt = db.prepare(`INSERT INTO project_spending_entries (project_id, description, amount, entry_date, bank, paid, debt_paid, position, created_at, updated_at)
       VALUES (@project_id, @description, @amount, @entry_date, @bank, @paid, @debt_paid, @position, @created_at, @updated_at)`);
        this.findByIdStmt = db.prepare('SELECT * FROM project_spending_entries WHERE id = ?');
        this.listByProjectStmt = db.prepare('SELECT * FROM project_spending_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC');
        this.updateStmt = db.prepare(`UPDATE project_spending_entries SET
         description = COALESCE(@description, description),
         amount = COALESCE(@amount, amount),
         entry_date = COALESCE(@entry_date, entry_date),
         bank = COALESCE(@bank, bank),
         paid = COALESCE(@paid, paid),
         debt_paid = COALESCE(@debt_paid, debt_paid),
         updated_at = @updated_at
       WHERE id = @id`);
        this.deleteStmt = db.prepare('DELETE FROM project_spending_entries WHERE id = ?');
        this.deleteByProjectStmt = db.prepare('DELETE FROM project_spending_entries WHERE project_id = ?');
        this.maxPositionStmt = db.prepare('SELECT COALESCE(MAX(position), 0) as maxPos FROM project_spending_entries WHERE project_id = ?');
        this.reorderByDateListStmt = db.prepare('SELECT id FROM project_spending_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC');
        this.reorderByDateUpdateStmt = db.prepare('UPDATE project_spending_entries SET position = @position, updated_at = @updated_at WHERE id = @id');
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
            paid: input.paid ? 1 : 0,
            debt_paid: input.debtPaid ? 1 : 0,
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
            paid: input.paid === undefined ? null : input.paid ? 1 : 0,
            debt_paid: input.debtPaid === undefined ? null : input.debtPaid ? 1 : 0,
            updated_at: new Date().toISOString()
        });
        const after = this.findByIdStmt.get(input.id);
        return after ? mapRow(after) : null;
    }
    async delete(id) {
        const result = this.deleteStmt.run(id);
        return result.changes > 0;
    }
    async deleteByProject(projectId) {
        this.deleteByProjectStmt.run(projectId);
    }
    async replaceAll(projectId, inputs) {
        const run = this.db.transaction(() => {
            this.deleteByProjectStmt.run(projectId);
            const now = new Date().toISOString();
            const created = [];
            for (const input of inputs) {
                const info = this.insertStmt.run({
                    project_id: projectId,
                    description: input.description,
                    amount: input.amount,
                    entry_date: input.entryDate,
                    bank: input.bank,
                    paid: input.paid ? 1 : 0,
                    debt_paid: input.debtPaid ? 1 : 0,
                    position: input.position,
                    created_at: now,
                    updated_at: now
                });
                const row = this.findByIdStmt.get(info.lastInsertRowid);
                if (!row)
                    throw new Error('Failed to fetch imported spending entry');
                created.push(mapRow(row));
            }
            return created;
        });
        return run();
    }
    async getMaxPosition(projectId) {
        const row = this.maxPositionStmt.get(projectId);
        return row?.maxPos ?? 0;
    }
    async reorderPositionsByDate(projectId) {
        const run = this.db.transaction(() => {
            const rows = this.reorderByDateListStmt.all(projectId);
            const now = new Date().toISOString();
            rows.forEach((row, index) => {
                this.reorderByDateUpdateStmt.run({
                    id: row.id,
                    position: index + 1,
                    updated_at: now
                });
            });
        });
        run();
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
