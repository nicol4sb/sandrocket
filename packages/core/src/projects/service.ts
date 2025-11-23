import { ProjectRepository, ProjectMemberRepository } from './ports.js';
import { CreateProjectInput, PublicProject, Project, UpdateProjectInput } from './types.js';

export interface ProjectService {
  createProject(input: CreateProjectInput): Promise<PublicProject>;
  listProjects(userId: number): Promise<PublicProject[]>;
  updateProject(input: UpdateProjectInput): Promise<PublicProject | null>;
  deleteProject(id: number, userId: number): Promise<boolean>;
  getUserRole(projectId: number, userId: number): Promise<'owner' | 'contributor' | null>;
}

export interface ProjectServiceDependencies {
  projects: ProjectRepository;
  members: ProjectMemberRepository;
}

function toPublicProject(project: Project, role?: 'owner' | 'contributor'): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    role
  };
}

class ProjectServiceImpl implements ProjectService {
  constructor(private readonly deps: ProjectServiceDependencies) {}

  async createProject(input: CreateProjectInput): Promise<PublicProject> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Project name is required');
    }
    const created = await this.deps.projects.create({
      ownerUserId: input.ownerUserId,
      name,
      description: input.description ?? null
    });
    // Add owner as project member
    await this.deps.members.create(created.id, input.ownerUserId, 'owner');
    return toPublicProject(created, 'owner');
  }

  async listProjects(userId: number): Promise<PublicProject[]> {
    const projects = await this.deps.projects.listByUser(userId);
    // Get roles for each project
    const projectsWithRoles = await Promise.all(
      projects.map(async (project) => {
        const member = await this.deps.members.findByProjectAndUser(project.id, userId);
        return toPublicProject(project, member?.role ?? null);
      })
    );
    return projectsWithRoles;
  }

  async updateProject(input: UpdateProjectInput): Promise<PublicProject | null> {
    const updated = await this.deps.projects.update(input);
    return updated ? toPublicProject(updated) : null;
  }

  async deleteProject(id: number, userId: number): Promise<boolean> {
    // Check if user is owner
    const member = await this.deps.members.findByProjectAndUser(id, userId);
    if (!member || member.role !== 'owner') {
      throw new Error('Only project owners can delete projects');
    }
    return await this.deps.projects.delete(id);
  }

  async getUserRole(projectId: number, userId: number): Promise<'owner' | 'contributor' | null> {
    const member = await this.deps.members.findByProjectAndUser(projectId, userId);
    return member?.role ?? null;
  }
}

export function createProjectService(deps: ProjectServiceDependencies): ProjectService {
  return new ProjectServiceImpl(deps);
}


