import { CreateTaskInput, Task, UpdateTaskInput } from './types';

export interface TaskRepository {
  create(input: CreateTaskInput, initialPosition: number): Promise<Task>;
  listByEpic(epicId: number): Promise<Task[]>;
  listOrphanedDoneByProject(projectId: number): Promise<Task[]>;
  getMaxPosition(epicId: number, status: Task['status']): Promise<number>;
  detachDoneTasks(epicId: number, epicName: string, projectId: number): Promise<void>;
  deleteActiveByEpic(epicId: number): Promise<void>;
  update(input: UpdateTaskInput): Promise<Task | null>;
  delete(id: number): Promise<boolean>;
}


