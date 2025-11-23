import { ProjectRepository, ProjectMemberRepository } from './ports.js';
import { CreateProjectInput, PublicProject, Project, UpdateProjectInput } from './types.js';

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

function toPublicProject(project: Project, role: 'owner' | 'contributor'): PublicProject {
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
    // Get all projects where user is a member and all member records in parallel
    const [projects, members] = await Promise.all([
      this.deps.projects.listByUser(userId),
      this.deps.members.listByUser(userId)
    ]);
    
    // Create a map of projectId -> role for fast lookup
    const roleMap = new Map<number, 'owner' | 'contributor'>();
    for (const member of members) {
      if (member.role) {
        roleMap.set(member.projectId, member.role);
      }
    }
    
    // Map projects to PublicProject with roles
    return projects.map((project) => {
      const role = roleMap.get(project.id);
      if (!role) {
        throw new Error(`User ${userId} is listed as member of project ${project.id} but member record is missing or invalid`);
      }
      return toPublicProject(project, role);
    });
  }

  async updateProject(input: UpdateProjectInput, userId?: number): Promise<PublicProject | null> {
    const updated = await this.deps.projects.update(input);
    if (!updated) return null;
    
    // If userId is provided, get the role; otherwise default to 'owner' for backward compatibility
    if (userId) {
      const member = await this.deps.members.findByProjectAndUser(updated.id, userId);
      if (member?.role) {
        return toPublicProject(updated, member.role);
      }
    }
    // Fallback: assume owner if we can't determine role (shouldn't happen in normal flow)
    return toPublicProject(updated, 'owner');
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


