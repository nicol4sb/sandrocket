import { z } from 'zod';
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const optionalIsoDateSchema = z.union([isoDateSchema, z.literal('')]);
export const summaryEntryResponseSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    description: z.string(),
    amount: z.number(),
    entryDate: isoDateSchema,
    accomptePayeDate: z.string(),
    paiementCompletDate: z.string(),
    position: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const updateSummaryVisibilityRequestSchema = z.object({
    visible: z.boolean()
});
export const createSummaryEntryRequestSchema = z.object({
    description: z.string().max(500).default(''),
    amount: z.number().finite(),
    entryDate: isoDateSchema.optional(),
    accomptePayeDate: optionalIsoDateSchema.optional(),
    paiementCompletDate: optionalIsoDateSchema.optional()
});
export const updateSummaryEntryRequestSchema = z.object({
    description: z.string().max(500).optional(),
    amount: z.number().finite().optional(),
    entryDate: isoDateSchema.optional(),
    accomptePayeDate: optionalIsoDateSchema.optional(),
    paiementCompletDate: optionalIsoDateSchema.optional()
});
