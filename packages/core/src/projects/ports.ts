import { CreateProjectInput, Project, UpdateProjectInput } from './types';

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findById(id: number): Promise<Project | null>;
  listByOwner(userId: number): Promise<Project[]>;
  update(input: UpdateProjectInput): Promise<Project | null>;
  delete(id: number): Promise<boolean>;
}


