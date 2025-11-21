import { TaskRepository } from './ports.js';
import { CreateTaskInput, PublicTask, TaskStatus, UpdateTaskInput, Task } from './types.js';

export interface TaskService {
  createTask(input: CreateTaskInput): Promise<PublicTask>;
  listTasks(epicId: number): Promise<PublicTask[]>;
  updateTask(input: UpdateTaskInput): Promise<PublicTask | null>;
  moveTask(id: number, status: TaskStatus, position?: number): Promise<PublicTask | null>;
  deleteTask(id: number): Promise<boolean>;
}

export interface TaskServiceDependencies {
  tasks: TaskRepository;
}

function toPublicTask(task: Task): PublicTask {
  return {
    id: task.id,
    epicId: task.epicId,
    creatorUserId: task.creatorUserId,
    description: task.description,
    status: task.status,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    lastEditedByUserId: task.lastEditedByUserId
  };
}

class TaskServiceImpl implements TaskService {
  constructor(private readonly deps: TaskServiceDependencies) {}

  async createTask(input: CreateTaskInput): Promise<PublicTask> {
    const description = input.description.trim();
    if (!description) {
      throw new Error('Task description is required');
    }
    if (description.length > 150) {
      throw new Error('Task description must be 150 characters or less');
    }
    const maxPos = await this.deps.tasks.getMaxPosition(input.epicId, 'backlog');
    const created = await this.deps.tasks.create(
      { epicId: input.epicId, creatorUserId: input.creatorUserId, description },
      maxPos + 1
    );
    return toPublicTask(created);
  }

  async listTasks(epicId: number): Promise<PublicTask[]> {
    const tasks = await this.deps.tasks.listByEpic(epicId);
    return tasks.map(toPublicTask);
  }

  async updateTask(input: UpdateTaskInput): Promise<PublicTask | null> {
    const updated = await this.deps.tasks.update(input);
    return updated ? toPublicTask(updated) : null;
  }

  async moveTask(id: number, status: TaskStatus, position?: number): Promise<PublicTask | null> {
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

  async deleteTask(id: number): Promise<boolean> {
    return await this.deps.tasks.delete(id);
  }
}

export function createTaskService(deps: TaskServiceDependencies): TaskService {
  return new TaskServiceImpl(deps);
}


