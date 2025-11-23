import { z } from 'zod';
export const createProjectRequestSchema = z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().max(1000).optional().nullable()
});
export const updateProjectRequestSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().max(1000).optional().nullable()
});
export const projectSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    role: z.enum(['owner', 'contributor']).optional()
});
export const createInvitationRequestSchema = z.object({
    projectId: z.number().int()
});
export const acceptInvitationRequestSchema = z.object({
    token: z.string()
});
export const invitationResponseSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    token: z.string(),
    createdAt: z.string(),
    expiresAt: z.string().nullable()
});
