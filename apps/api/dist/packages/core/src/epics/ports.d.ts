import { CreateEpicInput, Epic } from './types';
export interface EpicRepository {
    create(input: CreateEpicInput): Promise<Epic>;
    listByProject(projectId: string): Promise<Epic[]>;
}
