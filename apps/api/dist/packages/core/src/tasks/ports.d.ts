import { CreateTaskInput, Task, UpdateTaskInput } from './types';
export interface TaskRepository {
    create(input: CreateTaskInput, initialPosition: number): Promise<Task>;
    listByEpic(epicId: string): Promise<Task[]>;
    getMaxPosition(epicId: string, status: Task['status']): Promise<number>;
    update(input: UpdateTaskInput): Promise<Task | null>;
}
