import { EpicRepository } from './ports';
import { CreateEpicInput, PublicEpic, Epic } from './types';

export interface EpicService {
  createEpic(input: CreateEpicInput): Promise<PublicEpic>;
  listEpics(projectId: string): Promise<PublicEpic[]>;
}

export interface EpicServiceDependencies {
  epics: EpicRepository;
}

function toPublicEpic(epic: Epic): PublicEpic {
  return {
    id: epic.id,
    projectId: epic.projectId,
    name: epic.name,
    description: epic.description,
    createdAt: epic.createdAt,
    updatedAt: epic.updatedAt
  };
}

class EpicServiceImpl implements EpicService {
  constructor(private readonly deps: EpicServiceDependencies) {}

  async createEpic(input: CreateEpicInput): Promise<PublicEpic> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Epic name is required');
    }
    const created = await this.deps.epics.create({
      projectId: input.projectId,
      name,
      description: input.description ?? null
    });
    return toPublicEpic(created);
  }

  async listEpics(projectId: string): Promise<PublicEpic[]> {
    const epics = await this.deps.epics.listByProject(projectId);
    return epics.map(toPublicEpic);
  }
}

export function createEpicService(deps: EpicServiceDependencies): EpicService {
  return new EpicServiceImpl(deps);
}


