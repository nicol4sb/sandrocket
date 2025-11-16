import { EpicRepository } from './ports';
import { CreateEpicInput, PublicEpic } from './types';
export interface EpicService {
    createEpic(input: CreateEpicInput): Promise<PublicEpic>;
    listEpics(projectId: string): Promise<PublicEpic[]>;
}
export interface EpicServiceDependencies {
    epics: EpicRepository;
}
export declare function createEpicService(deps: EpicServiceDependencies): EpicService;
