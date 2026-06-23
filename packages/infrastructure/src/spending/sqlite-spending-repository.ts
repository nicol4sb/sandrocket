import { Database, Statement } from 'better-sqlite3';
import {
  CreateSpendingEntryInput,
  SpendingEntry,
  SpendingRepository,
  UpdateSpendingEntryInput
} from '@sandrocket/core';

interface SpendingRow {
  id: number;
  project_id: number;
  description: string;
  amount: number;
  entry_date: string;
  bank?: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SpendingRow): SpendingEntry {
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

export class SqliteSpendingRepository implements SpendingRepository {
  private readonly insertStmt: Statement;
  private readonly findByIdStmt: Statement;
  private readonly listByProjectStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly deleteByProjectStmt: Statement;
  private readonly maxPositionStmt: Statement;
  private readonly reorderByDateListStmt: Statement;
  private readonly reorderByDateUpdateStmt: Statement;
  private readonly getVisibleStmt: Statement;
  private readonly setVisibleStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO project_spending_entries (project_id, description, amount, entry_date, bank, position, created_at, updated_at)
       VALUES (@project_id, @description, @amount, @entry_date, @bank, @position, @created_at, @updated_at)`
    );
    this.findByIdStmt = db.prepare('SELECT * FROM project_spending_entries WHERE id = ?');
    this.listByProjectStmt = db.prepare(
      'SELECT * FROM project_spending_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC'
    );
    this.updateStmt = db.prepare(
      `UPDATE project_spending_entries SET
         description = COALESCE(@description, description),
         amount = COALESCE(@amount, amount),
         entry_date = COALESCE(@entry_date, entry_date),
         bank = COALESCE(@bank, bank),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = db.prepare('DELETE FROM project_spending_entries WHERE id = ?');
    this.deleteByProjectStmt = db.prepare(
      'DELETE FROM project_spending_entries WHERE project_id = ?'
    );
    this.maxPositionStmt = db.prepare(
      'SELECT COALESCE(MAX(position), 0) as maxPos FROM project_spending_entries WHERE project_id = ?'
    );
    this.reorderByDateListStmt = db.prepare(
      'SELECT id FROM project_spending_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC'
    );
    this.reorderByDateUpdateStmt = db.prepare(
      'UPDATE project_spending_entries SET position = @position, updated_at = @updated_at WHERE id = @id'
    );
    this.getVisibleStmt = db.prepare('SELECT spending_visible FROM projects WHERE id = ?');
    this.setVisibleStmt = db.prepare(
      'UPDATE projects SET spending_visible = @visible, updated_at = @updated_at WHERE id = @id'
    );
  }

  async listByProject(projectId: number): Promise<SpendingEntry[]> {
    const rows = this.listByProjectStmt.all(projectId) as SpendingRow[];
    return rows.map(mapRow);
  }

  async findById(id: number): Promise<SpendingEntry | null> {
    const row = this.findByIdStmt.get(id) as SpendingRow | undefined;
    return row ? mapRow(row) : null;
  }

  async create(input: CreateSpendingEntryInput): Promise<SpendingEntry> {
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
    const created = this.findByIdStmt.get(info.lastInsertRowid) as SpendingRow | undefined;
    if (!created) throw new Error('Failed to fetch created spending entry');
    return mapRow(created);
  }

  async update(input: UpdateSpendingEntryInput): Promise<SpendingEntry | null> {
    const existing = this.findByIdStmt.get(input.id) as SpendingRow | undefined;
    if (!existing) return null;

    this.updateStmt.run({
      id: input.id,
      description: input.description ?? null,
      amount: input.amount ?? null,
      entry_date: input.entryDate ?? null,
      bank: input.bank ?? null,
      updated_at: new Date().toISOString()
    });
    const after = this.findByIdStmt.get(input.id) as SpendingRow | undefined;
    return after ? mapRow(after) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  async deleteByProject(projectId: number): Promise<void> {
    this.deleteByProjectStmt.run(projectId);
  }

  async replaceAll(
    projectId: number,
    inputs: Omit<CreateSpendingEntryInput, 'projectId'>[]
  ): Promise<SpendingEntry[]> {
    const run = this.db.transaction(() => {
      this.deleteByProjectStmt.run(projectId);
      const now = new Date().toISOString();
      const created: SpendingEntry[] = [];
      for (const input of inputs) {
        const info = this.insertStmt.run({
          project_id: projectId,
          description: input.description,
          amount: input.amount,
          entry_date: input.entryDate,
          bank: input.bank,
          position: input.position,
          created_at: now,
          updated_at: now
        });
        const row = this.findByIdStmt.get(info.lastInsertRowid) as SpendingRow | undefined;
        if (!row) throw new Error('Failed to fetch imported spending entry');
        created.push(mapRow(row));
      }
      return created;
    });
    return run();
  }

  async getMaxPosition(projectId: number): Promise<number> {
    const row = this.maxPositionStmt.get(projectId) as { maxPos: number } | undefined;
    return row?.maxPos ?? 0;
  }

  async reorderPositionsByDate(projectId: number): Promise<void> {
    const run = this.db.transaction(() => {
      const rows = this.reorderByDateListStmt.all(projectId) as { id: number }[];
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

  async isVisible(projectId: number): Promise<boolean> {
    const row = this.getVisibleStmt.get(projectId) as { spending_visible: number } | undefined;
    return row ? row.spending_visible === 1 : false;
  }

  async setVisible(projectId: number, visible: boolean): Promise<void> {
    this.setVisibleStmt.run({
      id: projectId,
      visible: visible ? 1 : 0,
      updated_at: new Date().toISOString()
    });
  }
}
