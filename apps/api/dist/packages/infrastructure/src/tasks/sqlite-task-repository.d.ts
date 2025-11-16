import { Database } from 'better-sqlite3';
import { CreateTaskInput, Task, TaskRepository, UpdateTaskInput } from '@sandrocket/core';
export declare class SqliteTaskRepository implements TaskRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly listByEpicStmt;
    private readonly getMaxPosStmt;
    private readonly getByIdStmt;
    private readonly updateStmt;
    constructor(db: Database);
    create(input: CreateTaskInput, initialPosition: number): Promise<Task>;
    listByEpic(epicId: string): Promise<Task[]>;
    getMaxPosition(epicId: string, status: Task['status']): Promise<number>;
    update(input: UpdateTaskInput): Promise<Task | null>;
}
