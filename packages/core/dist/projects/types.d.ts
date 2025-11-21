export interface Project {
    id: number;
    ownerUserId: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateProjectInput {
    ownerUserId: number;
    name: string;
    description?: string | null;
}
export interface UpdateProjectInput {
    id: number;
    name?: string;
    description?: string | null;
}
export interface PublicProject {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
