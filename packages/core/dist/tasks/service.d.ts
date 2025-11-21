import { TaskRepository } from './ports.js';
import { CreateTaskInput, PublicTask, TaskStatus, UpdateTaskInput } from './types.js';
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
export declare function createTaskService(deps: TaskServiceDependencies): TaskService;
