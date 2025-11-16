import { ProjectRepository } from './ports';
import { CreateProjectInput, PublicProject, Project } from './types';

export interface ProjectService {
  createProject(input: CreateProjectInput): Promise<PublicProject>;
  listProjects(ownerUserId: string): Promise<PublicProject[]>;
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

  async listProjects(ownerUserId: string): Promise<PublicProject[]> {
    const projects = await this.deps.projects.listByOwner(ownerUserId);
    return projects.map(toPublicProject);
  }
}

export function createProjectService(deps: ProjectServiceDependencies): ProjectService {
  return new ProjectServiceImpl(deps);
}


