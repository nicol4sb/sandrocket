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
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
}>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export declare const projectSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["owner", "contributor"]>>;
}, "strip", z.ZodTypeAny, {
    id: number;
    createdAt: string;
    name: string;
    description: string | null;
    updatedAt: string;
    role?: "owner" | "contributor" | undefined;
}, {
    id: number;
    createdAt: string;
    name: string;
    description: string | null;
    updatedAt: string;
    role?: "owner" | "contributor" | undefined;
}>;
export type ProjectResponse = z.infer<typeof projectSchema>;
export interface ListProjectsResponse {
    projects: ProjectResponse[];
}
export declare const createInvitationRequestSchema: z.ZodObject<{
    projectId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    projectId: number;
}, {
    projectId: number;
}>;
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export declare const acceptInvitationRequestSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;
export declare const invitationResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    token: z.ZodString;
    createdAt: z.ZodString;
    expiresAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    projectId: number;
    createdAt: string;
    token: string;
    expiresAt: string | null;
}, {
    id: number;
    projectId: number;
    createdAt: string;
    token: string;
    expiresAt: string | null;
}>;
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
