import { TaskRepository } from './ports';
import { CreateTaskInput, PublicTask, TaskStatus, UpdateTaskInput } from './types';
export interface TaskService {
    createTask(input: CreateTaskInput): Promise<PublicTask>;
    listTasks(epicId: string): Promise<PublicTask[]>;
    updateTask(input: UpdateTaskInput): Promise<PublicTask | null>;
    moveTask(id: string, status: TaskStatus, position?: number): Promise<PublicTask | null>;
}
export interface TaskServiceDependencies {
    tasks: TaskRepository;
}
export declare function createTaskService(deps: TaskServiceDependencies): TaskService;
