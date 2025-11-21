import { ProjectRepository } from './ports.js';
import { CreateProjectInput, PublicProject, Project, UpdateProjectInput } from './types.js';

export interface ProjectService {
  createProject(input: CreateProjectInput): Promise<PublicProject>;
  listProjects(ownerUserId: number): Promise<PublicProject[]>;
  updateProject(input: UpdateProjectInput): Promise<PublicProject | null>;
  deleteProject(id: number): Promise<boolean>;
}

export interface ProjectServiceDependencies {
  projects: ProjectRepository;
}

function toPublicProject(project: Project): PublicProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
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
    return toPublicProject(created);
    }

  async listProjects(ownerUserId: number): Promise<PublicProject[]> {
    const projects = await this.deps.projects.listByOwner(ownerUserId);
    return projects.map(toPublicProject);
  }

  async updateProject(input: UpdateProjectInput): Promise<PublicProject | null> {
    const updated = await this.deps.projects.update(input);
    return updated ? toPublicProject(updated) : null;
  }

  async deleteProject(id: number): Promise<boolean> {
    return await this.deps.projects.delete(id);
  }
}

export function createProjectService(deps: ProjectServiceDependencies): ProjectService {
  return new ProjectServiceImpl(deps);
}


