import { CreateEpicInput, Epic, UpdateEpicInput } from './types';

export interface EpicRepository {
  create(input: CreateEpicInput): Promise<Epic>;
  getById(id: number): Promise<Epic | null>;
  listByProject(projectId: number): Promise<Epic[]>;
  update(input: UpdateEpicInput): Promise<Epic | null>;
  delete(id: number): Promise<boolean>;
}


