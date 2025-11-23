import { CreateProjectInput, Project, UpdateProjectInput } from './types';
import { ProjectMember, ProjectInvitation, CreateInvitationInput, ProjectRole } from './invitation-types';
export interface ProjectRepository {
    create(input: CreateProjectInput): Promise<Project>;
    findById(id: number): Promise<Project | null>;
    listByOwner(userId: number): Promise<Project[]>;
    listByUser(userId: number): Promise<Project[]>;
    update(input: UpdateProjectInput): Promise<Project | null>;
    delete(id: number): Promise<boolean>;
}
export interface ProjectMemberRepository {
    create(projectId: number, userId: number, role: ProjectRole): Promise<ProjectMember>;
    findByProjectAndUser(projectId: number, userId: number): Promise<ProjectMember | null>;
    listByUser(userId: number): Promise<ProjectMember[]>;
    listByProject(projectId: number): Promise<ProjectMember[]>;
    delete(projectId: number, userId: number): Promise<boolean>;
}
export interface ProjectInvitationRepository {
    create(input: CreateInvitationInput): Promise<ProjectInvitation>;
    findByToken(token: string): Promise<ProjectInvitation | null>;
    markAsUsed(token: string, userId: number): Promise<boolean>;
    delete(id: number): Promise<boolean>;
    deleteByToken(token: string): Promise<boolean>;
}
