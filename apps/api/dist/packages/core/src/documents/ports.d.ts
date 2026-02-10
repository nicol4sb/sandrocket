import { CreateDocumentInput, DocumentAction, DocumentActivity, ProjectDocument } from './types.js';
export interface DocumentRepository {
    create(input: CreateDocumentInput): Promise<ProjectDocument>;
    findById(id: number): Promise<ProjectDocument | null>;
    listByProject(projectId: number): Promise<ProjectDocument[]>;
    delete(id: number): Promise<boolean>;
    getTotalSizeForProject(projectId: number): Promise<number>;
    deleteByProject(projectId: number): Promise<number>;
}
export interface DocumentActivityRepository {
    log(entry: {
        documentId: number | null;
        projectId: number;
        userId: number;
        action: DocumentAction;
        filename: string;
    }): Promise<DocumentActivity>;
    listByProject(projectId: number, limit?: number): Promise<DocumentActivity[]>;
}
