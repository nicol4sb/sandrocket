export interface Epic {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateEpicInput {
    projectId: string;
    name: string;
    description?: string | null;
}
export interface PublicEpic {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
