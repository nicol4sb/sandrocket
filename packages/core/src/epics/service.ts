import { EpicRepository } from './ports.js';
import { CreateEpicInput, PublicEpic, Epic, UpdateEpicInput } from './types.js';

export interface EpicService {
  createEpic(input: CreateEpicInput): Promise<PublicEpic>;
  listEpics(projectId: number): Promise<PublicEpic[]>;
  updateEpic(input: UpdateEpicInput): Promise<PublicEpic | null>;
  deleteEpic(id: number): Promise<boolean>;
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

  async listEpics(projectId: number): Promise<PublicEpic[]> {
    const epics = await this.deps.epics.listByProject(projectId);
    return epics.map(toPublicEpic);
  }

  async updateEpic(input: UpdateEpicInput): Promise<PublicEpic | null> {
    const updated = await this.deps.epics.update(input);
    return updated ? toPublicEpic(updated) : null;
  }

  async deleteEpic(id: number): Promise<boolean> {
    return await this.deps.epics.delete(id);
  }
}

export function createEpicService(deps: EpicServiceDependencies): EpicService {
  return new EpicServiceImpl(deps);
}


