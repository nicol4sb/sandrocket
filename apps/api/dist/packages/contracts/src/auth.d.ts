import { z } from 'zod';
export declare const registerRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
}, {
    email: string;
    password: string;
    displayName: string;
}>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export declare const loginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export interface UserResponse {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
    updatedAt: string;
}
export interface AuthSuccessResponse {
    token: string;
    user: UserResponse;
}
export interface ErrorResponse {
    error: string;
    message: string;
    details?: Record<string, unknown>;
}
