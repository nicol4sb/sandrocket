import { z } from 'zod';
export const taskStatusSchema = z.enum(['backlog', 'in_progress', 'done']);
export const createTaskRequestSchema = z.object({
    epicId: z.string().min(1, 'epicId is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().max(2000).optional().nullable()
});
export const updateTaskRequestSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().max(2000).optional().nullable(),
    status: taskStatusSchema.optional(),
    position: z.number().int().min(0).optional()
});
export const taskSchema = z.object({
    id: z.string(),
    epicId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: taskStatusSchema,
    position: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string()
});
