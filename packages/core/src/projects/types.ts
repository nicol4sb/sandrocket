export interface Project {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  ownerUserId: string;
  name: string;
  description?: string | null;
}

export interface PublicProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}


