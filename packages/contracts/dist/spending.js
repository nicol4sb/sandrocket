import { z } from 'zod';
export const spendingEntryResponseSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    description: z.string(),
    amount: z.number(),
    position: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const updateSpendingVisibilityRequestSchema = z.object({
    visible: z.boolean()
});
export const createSpendingEntryRequestSchema = z.object({
    description: z.string().max(500).default(''),
    amount: z.number().finite()
});
export const updateSpendingEntryRequestSchema = z.object({
    description: z.string().max(500).optional(),
    amount: z.number().finite().optional()
});
