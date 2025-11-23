import { ProjectRepository, ProjectMemberRepository } from './ports.js';
import { CreateProjectInput, PublicProject, UpdateProjectInput } from './types.js';
export interface ProjectService {
    createProject(input: CreateProjectInput): Promise<PublicProject>;
    listProjects(userId: number): Promise<PublicProject[]>;
    updateProject(input: UpdateProjectInput, userId?: number): Promise<PublicProject | null>;
    deleteProject(id: number, userId: number): Promise<boolean>;
    getUserRole(projectId: number, userId: number): Promise<'owner' | 'contributor' | null>;
}
export interface ProjectServiceDependencies {
    projects: ProjectRepository;
    members: ProjectMemberRepository;
}
export declare function createProjectService(deps: ProjectServiceDependencies): ProjectService;
