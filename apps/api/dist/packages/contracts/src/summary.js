import { z } from 'zod';
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
export const summaryEntryResponseSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    lot: z.string(),
    fichierRetenu: z.string(),
    amount: z.number(),
    entryDate: isoDateSchema,
    position: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const updateSummaryVisibilityRequestSchema = z.object({
    visible: z.boolean()
});
export const createSummaryEntryRequestSchema = z.object({
    lot: z.string().max(500).default(''),
    fichierRetenu: z.string().max(500).optional().default(''),
    amount: z.number().finite(),
    entryDate: isoDateSchema.optional()
});
export const updateSummaryEntryRequestSchema = z.object({
    lot: z.string().max(500).optional(),
    fichierRetenu: z.string().max(500).optional(),
    amount: z.number().finite().optional(),
    entryDate: isoDateSchema.optional()
});
export const importSummaryEntriesRequestSchema = z.object({
    replace: z.boolean().default(true),
    entries: z.array(createSummaryEntryRequestSchema).min(1).max(500)
});
