import { randomUUID } from 'node:crypto';
import { Database, Statement } from 'better-sqlite3';
import { CreateTaskInput, Task, TaskRepository, UpdateTaskInput } from '@sandrocket/core';

interface TaskRow {
  id: string;
  epic_id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    epicId: row.epic_id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: Database;
  private readonly insertStmt: Statement;
  private readonly listByEpicStmt: Statement;
  private readonly getMaxPosStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly updateStmt: Statement;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = this.db.prepare(
      `INSERT INTO tasks (id, epic_id, title, description, status, position, created_at, updated_at)
       VALUES (@id, @epic_id, @title, @description, @status, @position, @created_at, @updated_at)`
    );
    this.listByEpicStmt = this.db.prepare(
      'SELECT * FROM tasks WHERE epic_id = ? ORDER BY status ASC, position ASC, created_at ASC'
    );
    this.getMaxPosStmt = this.db.prepare(
      'SELECT MAX(position) as maxPos FROM tasks WHERE epic_id = ? AND status = ?'
    );
    this.getByIdStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    this.updateStmt = this.db.prepare(
      `UPDATE tasks SET
         title = COALESCE(@title, title),
         description = COALESCE(@description, description),
         status = COALESCE(@status, status),
         position = COALESCE(@position, position),
         updated_at = @updated_at
       WHERE id = @id`
    );
  }

  async create(input: CreateTaskInput, initialPosition: number): Promise<Task> {
    const now = new Date().toISOString();
    const record: TaskRow = {
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

  async listByEpic(epicId: string): Promise<Task[]> {
    const rows = this.listByEpicStmt.all(epicId) as TaskRow[];
    return rows.map(mapRowToTask);
  }

  async getMaxPosition(epicId: string, status: Task['status']): Promise<number> {
    const row = this.getMaxPosStmt.get(epicId, status) as { maxPos: number | null } | undefined;
    return row?.maxPos ?? 0;
  }

  async update(input: UpdateTaskInput): Promise<Task | null> {
    const existing = this.getByIdStmt.get(input.id) as TaskRow | undefined;
    if (!existing) return null;

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
    const after = this.getByIdStmt.get(input.id) as TaskRow | undefined;
    return after ? mapRowToTask(after) : null;
  }
}


