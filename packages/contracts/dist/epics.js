import { z } from 'zod';
export const createEpicRequestSchema = z.object({
    name: z.string().min(1, 'Epic name is required'),
    description: z.string().max(10000).optional().nullable() // Allow 2-3 pages of text (~3000-4500 chars per page)
});
export const epicSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const updateEpicRequestSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().max(10000).nullable().optional() // Allow 2-3 pages of text (~3000-4500 chars per page)
});
