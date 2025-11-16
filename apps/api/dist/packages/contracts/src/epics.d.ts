import { z } from 'zod';
export declare const createEpicRequestSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
}>;
export type CreateEpicRequest = z.infer<typeof createEpicRequestSchema>;
export declare const epicSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    projectId: string;
}, {
    name: string;
    description: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    projectId: string;
}>;
export type EpicResponse = z.infer<typeof epicSchema>;
export interface ListEpicsResponse {
    epics: EpicResponse[];
}
