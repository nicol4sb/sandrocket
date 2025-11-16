export type TaskStatus = 'backlog' | 'in_progress' | 'done';

export interface Task {
  id: string;
  epicId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  epicId: string;
  title: string;
  description?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  position?: number;
}

export interface PublicTask {
  id: string;
  epicId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}


