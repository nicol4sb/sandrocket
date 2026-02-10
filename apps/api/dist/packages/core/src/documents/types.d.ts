export interface ProjectDocument {
    id: number;
    projectId: number;
    uploaderUserId: number;
    originalFilename: string;
    storedFilename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
}
export interface CreateDocumentInput {
    projectId: number;
    uploaderUserId: number;
    originalFilename: string;
    storedFilename: string;
    mimeType: string;
    sizeBytes: number;
}
export interface DocumentActivity {
    id: number;
    documentId: number | null;
    projectId: number;
    userId: number;
    action: 'uploaded' | 'downloaded' | 'deleted' | 'viewed';
    filename: string;
    createdAt: Date;
}
export type DocumentAction = DocumentActivity['action'];
