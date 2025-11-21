export interface Epic {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEpicInput {
  projectId: number;
  name: string;
  description?: string | null;
}

export interface PublicEpic {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEpicInput {
  id: number;
  name?: string;
  description?: string | null;
}


