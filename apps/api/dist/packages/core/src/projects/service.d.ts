import { ProjectRepository } from './ports';
import { CreateProjectInput, PublicProject } from './types';
export interface ProjectService {
    createProject(input: CreateProjectInput): Promise<PublicProject>;
    listProjects(ownerUserId: string): Promise<PublicProject[]>;
}
export interface ProjectServiceDependencies {
    projects: ProjectRepository;
}
export declare function createProjectService(deps: ProjectServiceDependencies): ProjectService;
