import { Database } from 'better-sqlite3';
import { CreateTaskInput, Task, TaskRepository, UpdateTaskInput } from '@sandrocket/core';
export declare class SqliteTaskRepository implements TaskRepository {
    private readonly db;
    private readonly insertStmt;
    private readonly listByEpicStmt;
    private readonly listOrphanedDoneStmt;
    private readonly getMaxPosStmt;
    private readonly getByIdStmt;
    private readonly updateStmt;
    private readonly deleteStmt;
    private readonly detachDoneStmt;
    private readonly deleteActiveStmt;
    constructor(db: Database);
    create(input: CreateTaskInput, initialPosition: number): Promise<Task>;
    listByEpic(epicId: number): Promise<Task[]>;
    listOrphanedDoneByProject(projectId: number): Promise<Task[]>;
    getMaxPosition(epicId: number, status: Task['status']): Promise<number>;
    detachDoneTasks(epicId: number, epicName: string, projectId: number): Promise<void>;
    deleteActiveByEpic(epicId: number): Promise<void>;
    update(input: UpdateTaskInput): Promise<Task | null>;
    delete(id: number): Promise<boolean>;
}
