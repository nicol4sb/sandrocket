import { TaskRepository } from './ports';
import { CreateTaskInput, PublicTask, TaskStatus, UpdateTaskInput, Task } from './types';

export interface TaskService {
  createTask(input: CreateTaskInput): Promise<PublicTask>;
  listTasks(epicId: string): Promise<PublicTask[]>;
  updateTask(input: UpdateTaskInput): Promise<PublicTask | null>;
  moveTask(id: string, status: TaskStatus, position?: number): Promise<PublicTask | null>;
}

export interface TaskServiceDependencies {
  tasks: TaskRepository;
}

function toPublicTask(task: Task): PublicTask {
  return {
    id: task.id,
    epicId: task.epicId,
    title: task.title,
    description: task.description,
    status: task.status,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

class TaskServiceImpl implements TaskService {
  constructor(private readonly deps: TaskServiceDependencies) {}

  async createTask(input: CreateTaskInput): Promise<PublicTask> {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Task title is required');
    }
    const maxPos = await this.deps.tasks.getMaxPosition(input.epicId, 'backlog');
    const created = await this.deps.tasks.create(
      { epicId: input.epicId, title, description: input.description ?? null },
      maxPos + 1
    );
    return toPublicTask(created);
  }

  async listTasks(epicId: string): Promise<PublicTask[]> {
    const tasks = await this.deps.tasks.listByEpic(epicId);
    return tasks.map(toPublicTask);
  }

  async updateTask(input: UpdateTaskInput): Promise<PublicTask | null> {
    const updated = await this.deps.tasks.update(input);
    return updated ? toPublicTask(updated) : null;
  }

  async moveTask(id: string, status: TaskStatus, position?: number): Promise<PublicTask | null> {
    // Fetch current tasks to compute target position if needed
    // For now, if position not provided, append to end of target column
    // We'll rely on repository update to set provided position as-is
    let desiredPosition = position;
    if (desiredPosition === undefined) {
      // We don't know epicId here, so repository update should accept status only?
      // Workaround: repository.getMaxPosition requires epicId; so we expect caller to send position or
      // repository will not change position. We'll default to 999999 as append.
      desiredPosition = 999999;
    }
    const updated = await this.deps.tasks.update({ id, status, position: desiredPosition });
    return updated ? toPublicTask(updated) : null;
  }
}

export function createTaskService(deps: TaskServiceDependencies): TaskService {
  return new TaskServiceImpl(deps);
}


