import { EpicRepository } from './ports.js';
import { CreateEpicInput, PublicEpic, UpdateEpicInput } from './types.js';
export interface EpicService {
    createEpic(input: CreateEpicInput): Promise<PublicEpic>;
    listEpics(projectId: number): Promise<PublicEpic[]>;
    updateEpic(input: UpdateEpicInput): Promise<PublicEpic | null>;
    deleteEpic(id: number): Promise<boolean>;
}
export interface EpicServiceDependencies {
    epics: EpicRepository;
}
export declare function createEpicService(deps: EpicServiceDependencies): EpicService;
