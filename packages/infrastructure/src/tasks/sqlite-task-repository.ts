import { Database, Statement } from 'better-sqlite3';
import { CreateTaskInput, Task, TaskRepository, UpdateTaskInput } from '@sandrocket/core';

interface TaskRow {
  id: number;
  epic_id: number | null;
  project_id: number;
  epic_name: string | null;
  creator_user_id: number;
  description: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
  last_edited_by_user_id: number | null;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    epicId: row.epic_id,
    projectId: row.project_id,
    epicName: row.epic_name,
    creatorUserId: row.creator_user_id,
    description: row.description,
    status: row.status as Task['status'],
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastEditedByUserId: row.last_edited_by_user_id
  };
}

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly listByEpicStmt: Statement;
  private readonly listOrphanedDoneStmt: Statement;
  private readonly getMaxPosStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly updateStmt: Statement;
  private readonly deleteStmt: Statement;
  private readonly detachDoneStmt: Statement;
  private readonly deleteActiveStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO tasks (epic_id, project_id, creator_user_id, description, status, position, created_at, updated_at)
       SELECT @epic_id, e.project_id, @creator_user_id, @description, @status, @position, @created_at, @updated_at
       FROM epics e WHERE e.id = @epic_id`
    );
    this.listByEpicStmt = this.db.prepare(
      'SELECT * FROM tasks WHERE epic_id = ? ORDER BY status ASC, position ASC, created_at ASC'
    );
    this.listOrphanedDoneStmt = this.db.prepare(
      `SELECT * FROM tasks
       WHERE project_id = ? AND epic_id IS NULL AND status = 'done'
       ORDER BY updated_at DESC, id DESC`
    );
    this.getMaxPosStmt = this.db.prepare(
      'SELECT MAX(position) as maxPos FROM tasks WHERE epic_id = ? AND status = ?'
    );
    this.getByIdStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    this.updateStmt = this.db.prepare(
      `UPDATE tasks SET
         description = COALESCE(@description, description),
         status = COALESCE(@status, status),
         position = COALESCE(@position, position),
         last_edited_by_user_id = COALESCE(@last_edited_by_user_id, last_edited_by_user_id),
         updated_at = @updated_at
       WHERE id = @id`
    );
    this.deleteStmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    this.detachDoneStmt = this.db.prepare(
      `UPDATE tasks SET
         epic_id = NULL,
         epic_name = @epic_name,
         project_id = @project_id,
         updated_at = @updated_at
       WHERE epic_id = @epic_id AND status = 'done'`
    );
    this.deleteActiveStmt = this.db.prepare(
      `DELETE FROM tasks WHERE epic_id = ? AND status != 'done'`
    );
  }

  async create(input: CreateTaskInput, initialPosition: number): Promise<Task> {
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
    const row = this.getByIdStmt.get(info.lastInsertRowid) as TaskRow | undefined;
    if (!row) throw new Error('Failed to fetch created task');
    return mapRowToTask(row);
  }

  async listByEpic(epicId: number): Promise<Task[]> {
    const rows = this.listByEpicStmt.all(epicId) as TaskRow[];
    return rows.map(mapRowToTask);
  }

  async listOrphanedDoneByProject(projectId: number): Promise<Task[]> {
    const rows = this.listOrphanedDoneStmt.all(projectId) as TaskRow[];
    return rows.map(mapRowToTask);
  }

  async getMaxPosition(epicId: number, status: Task['status']): Promise<number> {
    const row = this.getMaxPosStmt.get(epicId, status) as { maxPos: number | null } | undefined;
    return row?.maxPos ?? 0;
  }

  async detachDoneTasks(epicId: number, epicName: string, projectId: number): Promise<void> {
    this.detachDoneStmt.run({
      epic_id: epicId,
      epic_name: epicName,
      project_id: projectId,
      updated_at: new Date().toISOString()
    });
  }

  async deleteActiveByEpic(epicId: number): Promise<void> {
    this.deleteActiveStmt.run(epicId);
  }

  async update(input: UpdateTaskInput): Promise<Task | null> {
    const existing = this.getByIdStmt.get(input.id) as TaskRow | undefined;
    if (!existing) return null;

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
    const after = this.getByIdStmt.get(input.id) as TaskRow | undefined;
    return after ? mapRowToTask(after) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
