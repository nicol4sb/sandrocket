import { DocumentActivityRepository, DocumentRepository } from './ports.js';
import { DocumentActivity, ProjectDocument } from './types.js';
export interface DocumentServiceConfig {
    uploadDir: string;
    maxFileSizeBytes: number;
    maxProjectStorageBytes: number;
}
export interface DocumentService {
    upload(projectId: number, userId: number, file: {
        originalname: string;
        mimetype: string;
        buffer: Buffer;
        size: number;
    }): Promise<ProjectDocument>;
    list(projectId: number): Promise<{
        documents: ProjectDocument[];
        totalSizeBytes: number;
    }>;
    getFile(documentId: number): Promise<{
        document: ProjectDocument;
        filePath: string;
    } | null>;
    deleteDocument(documentId: number, userId: number): Promise<boolean>;
    getActivity(projectId: number, limit?: number): Promise<DocumentActivity[]>;
    cleanupProjectFiles(projectId: number): Promise<void>;
}
export interface DocumentServiceDependencies {
    documents: DocumentRepository;
    activity: DocumentActivityRepository;
    config: DocumentServiceConfig;
}
export declare function createDocumentService(deps: DocumentServiceDependencies): DocumentService;
