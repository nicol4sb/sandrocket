import { ProjectRepository } from './ports.js';
import { CreateProjectInput, PublicProject, UpdateProjectInput } from './types.js';
export interface ProjectService {
    createProject(input: CreateProjectInput): Promise<PublicProject>;
    listProjects(ownerUserId: number): Promise<PublicProject[]>;
    updateProject(input: UpdateProjectInput): Promise<PublicProject | null>;
    deleteProject(id: number): Promise<boolean>;
}
export interface ProjectServiceDependencies {
    projects: ProjectRepository;
}
export declare function createProjectService(deps: ProjectServiceDependencies): ProjectService;
