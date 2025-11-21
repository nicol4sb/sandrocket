export type TaskStatus = 'backlog' | 'in_progress' | 'done';

export interface Task {
  id: number;
  epicId: number;
  creatorUserId: number;
  description: string;
  status: TaskStatus;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  lastEditedByUserId: number | null;
}

export interface CreateTaskInput {
  epicId: number;
  creatorUserId: number;
  description: string;
}

export interface UpdateTaskInput {
  id: number;
  description?: string;
  status?: TaskStatus;
  position?: number;
  lastEditedByUserId?: number;
}

export interface PublicTask {
  id: number;
  epicId: number;
  creatorUserId: number;
  description: string;
  status: TaskStatus;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  lastEditedByUserId: number | null;
}


