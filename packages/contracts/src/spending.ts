import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const spendingEntryResponseSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int(),
  description: z.string(),
  amount: z.number(),
  entryDate: isoDateSchema,
  bank: z.string(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SpendingEntryResponse = z.infer<typeof spendingEntryResponseSchema>;

export interface ListSpendingResponse {
  visible: boolean;
  entries: SpendingEntryResponse[];
  totalAmount: number;
}

export const updateSpendingVisibilityRequestSchema = z.object({
  visible: z.boolean()
});
export type UpdateSpendingVisibilityRequest = z.infer<typeof updateSpendingVisibilityRequestSchema>;

export const createSpendingEntryRequestSchema = z.object({
  description: z.string().max(500).default(''),
  amount: z.number().finite(),
  entryDate: isoDateSchema.optional(),
  bank: z.string().max(100).optional().default('')
});
export type CreateSpendingEntryRequest = z.infer<typeof createSpendingEntryRequestSchema>;

export const updateSpendingEntryRequestSchema = z.object({
  description: z.string().max(500).optional(),
  amount: z.number().finite().optional(),
  entryDate: isoDateSchema.optional(),
  bank: z.string().max(100).optional()
});
export type UpdateSpendingEntryRequest = z.infer<typeof updateSpendingEntryRequestSchema>;
