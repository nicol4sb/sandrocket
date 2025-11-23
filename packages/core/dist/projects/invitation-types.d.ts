export type ProjectRole = 'owner' | 'contributor';
export interface ProjectMember {
    id: number;
    projectId: number;
    userId: number;
    role: ProjectRole;
    createdAt: Date;
}
export interface ProjectInvitation {
    id: number;
    projectId: number;
    token: string;
    createdByUserId: number;
    usedByUserId: number | null;
    usedAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
}
export interface CreateInvitationInput {
    projectId: number;
    createdByUserId: number;
    expiresAt?: Date | null;
}
export interface AcceptInvitationInput {
    token: string;
    userId: number;
}
