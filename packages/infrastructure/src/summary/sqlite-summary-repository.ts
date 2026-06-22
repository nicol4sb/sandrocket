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
  lot?: string;
  description?: string;
  fichier_retenu?: string;
  amount: number;
  entry_date: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SummaryRow): SummaryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    lot: row.lot ?? row.description ?? '',
    fichierRetenu: row.fichier_retenu ?? '',
    amount: row.amount,
    entryDate: row.entry_date,
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
  private readonly deleteByProjectStmt: Statement;
  private readonly maxPositionStmt: Statement;
  private readonly getVisibleStmt: Statement;
  private readonly setVisibleStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      `INSERT INTO project_summary_entries (
         project_id, lot, fichier_retenu, amount, entry_date, position, created_at, updated_at
       ) VALUES (
         @project_id, @lot, @fichier_retenu, @amount, @entry_date, @position, @created_at, @updated_at
       )`
    );
    this.findByIdStmt = db.prepare('SELECT * FROM project_summary_entries WHERE id = ?');
    this.listByProjectStmt = db.prepare(
      'SELECT * FROM project_summary_entries WHERE project_id = ? ORDER BY position ASC, id ASC'
    );
    this.updateStmt = db.prepare(
      `UPDATE project_summary_entries SET
         lot = COALESCE(@lot, lot),
         fichier_retenu = COALESCE(@fichier_retenu, fichier_retenu),
         amount = COALESCE(@amount, amount),
         entry_date = COALESCE(@entry_date, entry_date),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = db.prepare('DELETE FROM project_summary_entries WHERE id = ?');
    this.deleteByProjectStmt = db.prepare(
      'DELETE FROM project_summary_entries WHERE project_id = ?'
    );
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
      lot: input.lot,
      fichier_retenu: input.fichierRetenu,
      amount: input.amount,
      entry_date: input.entryDate,
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
      lot: input.lot ?? null,
      fichier_retenu: input.fichierRetenu ?? null,
      amount: input.amount ?? null,
      entry_date: input.entryDate ?? null,
      updated_at: new Date().toISOString()
    });
    const after = this.findByIdStmt.get(input.id) as SummaryRow | undefined;
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
    inputs: Omit<CreateSummaryEntryInput, 'projectId'>[]
  ): Promise<SummaryEntry[]> {
    const run = this.db.transaction(() => {
      this.deleteByProjectStmt.run(projectId);
      const now = new Date().toISOString();
      const created: SummaryEntry[] = [];
      for (const input of inputs) {
        const info = this.insertStmt.run({
          project_id: projectId,
          lot: input.lot,
          fichier_retenu: input.fichierRetenu,
          amount: input.amount,
          entry_date: input.entryDate,
          position: input.position,
          created_at: now,
          updated_at: now
        });
        const row = this.findByIdStmt.get(info.lastInsertRowid) as SummaryRow | undefined;
        if (!row) throw new Error('Failed to fetch imported summary entry');
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
