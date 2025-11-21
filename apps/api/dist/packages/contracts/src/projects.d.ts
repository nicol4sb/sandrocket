import { z } from 'zod';
export declare const createProjectRequestSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
}>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export declare const updateProjectRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    name?: string | undefined;
}, {
    description?: string | null | undefined;
    name?: string | undefined;
}>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export declare const projectSchema: z.ZodObject<{
    id: z.ZodNumber;
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
}, {
    id: number;
    description: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
}>;
export type ProjectResponse = z.infer<typeof projectSchema>;
export interface ListProjectsResponse {
    projects: ProjectResponse[];
}
