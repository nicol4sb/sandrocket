import { CreateTaskInput, Task, UpdateTaskInput } from './types';

export interface TaskRepository {
  create(input: CreateTaskInput, initialPosition: number): Promise<Task>;
  listByEpic(epicId: number): Promise<Task[]>;
  getMaxPosition(epicId: number, status: Task['status']): Promise<number>;
  update(input: UpdateTaskInput): Promise<Task | null>;
  delete(id: number): Promise<boolean>;
}


