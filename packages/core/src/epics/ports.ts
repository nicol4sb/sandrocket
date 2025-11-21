import { CreateEpicInput, Epic, UpdateEpicInput } from './types';

export interface EpicRepository {
  create(input: CreateEpicInput): Promise<Epic>;
  listByProject(projectId: number): Promise<Epic[]>;
  update(input: UpdateEpicInput): Promise<Epic | null>;
  delete(id: number): Promise<boolean>;
}


