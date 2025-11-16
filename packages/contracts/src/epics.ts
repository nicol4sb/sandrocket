import { z } from 'zod';

export const createEpicRequestSchema = z.object({
  name: z.string().min(1, 'Epic name is required'),
  description: z.string().max(1000).optional().nullable()
});
export type CreateEpicRequest = z.infer<typeof createEpicRequestSchema>;

export const epicSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type EpicResponse = z.infer<typeof epicSchema>;

export interface ListEpicsResponse {
  epics: EpicResponse[];
}


