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
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    description: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
    projectId: number;
}, {
    id: number;
    description: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
    projectId: number;
}>;
export type EpicResponse = z.infer<typeof epicSchema>;
export interface ListEpicsResponse {
    epics: EpicResponse[];
}
export declare const updateEpicRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    name?: string | undefined;
}, {
    description?: string | null | undefined;
    name?: string | undefined;
}>;
export type UpdateEpicRequest = z.infer<typeof updateEpicRequestSchema>;
