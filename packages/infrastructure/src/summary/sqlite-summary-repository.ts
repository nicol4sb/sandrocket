import { Database, Statement } from 'better-sqlite3';
import {
  CreateSummaryEntryInput,
  SummaryEntry,
  SummaryRepository,
  UpdateSummaryEntryInput
} from '@sandrocket/core';

interface SummaryRow {
  id: number;
  project_id: number;
  description: string;
  amount: number;
  entry_date: string;
  accompte_paye_date: string;
  paiement_complet_date: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SummaryRow): SummaryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    amount: row.amount,
    entryDate: row.entry_date,
    accomptePayeDate: row.accompte_paye_date ?? '',
    paiementCompletDate: row.paiement_complet_date ?? '',
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export class SqliteSummaryRepository implements SummaryRepository {
  private readonly insertStmt: Statement;
  private readonly findByIdStmt: Statement;
  private readonly listByProjectStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly maxPositionStmt: Statement;
  private readonly getVisibleStmt: Statement;
  private readonly setVisibleStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO project_summary_entries (
         project_id, description, amount, entry_date,
         accompte_paye_date, paiement_complet_date, position, created_at, updated_at
       ) VALUES (
         @project_id, @description, @amount, @entry_date,
         @accompte_paye_date, @paiement_complet_date, @position, @created_at, @updated_at
       )`
    );
    this.findByIdStmt = db.prepare('SELECT * FROM project_summary_entries WHERE id = ?');
    this.listByProjectStmt = db.prepare(
      'SELECT * FROM project_summary_entries WHERE project_id = ? ORDER BY entry_date ASC, id ASC'
    );
    this.updateStmt = db.prepare(
      `UPDATE project_summary_entries SET
         description = COALESCE(@description, description),
         amount = COALESCE(@amount, amount),
         entry_date = COALESCE(@entry_date, entry_date),
         accompte_paye_date = COALESCE(@accompte_paye_date, accompte_paye_date),
         paiement_complet_date = COALESCE(@paiement_complet_date, paiement_complet_date),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = db.prepare('DELETE FROM project_summary_entries WHERE id = ?');
    this.maxPositionStmt = db.prepare(
      'SELECT COALESCE(MAX(position), 0) as maxPos FROM project_summary_entries WHERE project_id = ?'
    );
    this.getVisibleStmt = db.prepare('SELECT summary_visible FROM projects WHERE id = ?');
    this.setVisibleStmt = db.prepare(
      'UPDATE projects SET summary_visible = @visible, updated_at = @updated_at WHERE id = @id'
    );
  }

  async listByProject(projectId: number): Promise<SummaryEntry[]> {
    const rows = this.listByProjectStmt.all(projectId) as SummaryRow[];
    return rows.map(mapRow);
  }

  async findById(id: number): Promise<SummaryEntry | null> {
    const row = this.findByIdStmt.get(id) as SummaryRow | undefined;
    return row ? mapRow(row) : null;
  }

  async create(input: CreateSummaryEntryInput): Promise<SummaryEntry> {
    const now = new Date().toISOString();
    const params = {
      project_id: input.projectId,
      description: input.description,
      amount: input.amount,
      entry_date: input.entryDate,
      accompte_paye_date: input.accomptePayeDate,
      paiement_complet_date: input.paiementCompletDate,
      position: input.position,
      created_at: now,
      updated_at: now
    };
    const info = this.insertStmt.run(params);
    const created = this.findByIdStmt.get(info.lastInsertRowid) as SummaryRow | undefined;
    if (!created) throw new Error('Failed to fetch created summary entry');
    return mapRow(created);
  }

  async update(input: UpdateSummaryEntryInput): Promise<SummaryEntry | null> {
    const existing = this.findByIdStmt.get(input.id) as SummaryRow | undefined;
    if (!existing) return null;

    this.updateStmt.run({
      id: input.id,
      description: input.description ?? null,
      amount: input.amount ?? null,
      entry_date: input.entryDate ?? null,
      accompte_paye_date: input.accomptePayeDate ?? null,
      paiement_complet_date: input.paiementCompletDate ?? null,
      updated_at: new Date().toISOString()
    });
    const after = this.findByIdStmt.get(input.id) as SummaryRow | undefined;
    return after ? mapRow(after) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  async getMaxPosition(projectId: number): Promise<number> {
    const row = this.maxPositionStmt.get(projectId) as { maxPos: number } | undefined;
    return row?.maxPos ?? 0;
  }

  async isVisible(projectId: number): Promise<boolean> {
    const row = this.getVisibleStmt.get(projectId) as { summary_visible: number } | undefined;
    return row ? row.summary_visible === 1 : false;
  }

  async setVisible(projectId: number, visible: boolean): Promise<void> {
    this.setVisibleStmt.run({
      id: projectId,
      visible: visible ? 1 : 0,
      updated_at: new Date().toISOString()
    });
  }
}
