import { CreateProjectInput, Project } from './types';
export interface ProjectRepository {
    create(input: CreateProjectInput): Promise<Project>;
    findById(id: string): Promise<Project | null>;
    listByOwner(userId: string): Promise<Project[]>;
}
