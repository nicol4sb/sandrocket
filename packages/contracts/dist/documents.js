import { z } from 'zod';
export const documentResponseSchema = z.object({
    id: z.number().int(),
    projectId: z.number().int(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int(),
    uploaderUserId: z.number().int(),
    uploaderDisplayName: z.string(),
    createdAt: z.string()
});
export const documentActivityResponseSchema = z.object({
    id: z.number().int(),
    action: z.enum(['uploaded', 'downloaded', 'deleted', 'viewed']),
    filename: z.string(),
    userDisplayName: z.string(),
    createdAt: z.string()
});
