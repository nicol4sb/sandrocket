import { z } from 'zod';
export declare const taskStatusSchema: z.ZodEnum<["backlog", "in_progress", "done"]>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export declare const createTaskRequestSchema: z.ZodObject<{
    epicId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    epicId: string;
    title: string;
    description?: string | null | undefined;
}, {
    epicId: string;
    title: string;
    description?: string | null | undefined;
}>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export declare const updateTaskRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["backlog", "in_progress", "done"]>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "backlog" | "in_progress" | "done" | undefined;
    description?: string | null | undefined;
    title?: string | undefined;
    position?: number | undefined;
}, {
    status?: "backlog" | "in_progress" | "done" | undefined;
    description?: string | null | undefined;
    title?: string | undefined;
    position?: number | undefined;
}>;
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
export declare const taskSchema: z.ZodObject<{
    id: z.ZodString;
    epicId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["backlog", "in_progress", "done"]>;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "backlog" | "in_progress" | "done";
    description: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    epicId: string;
    title: string;
    position: number;
}, {
    status: "backlog" | "in_progress" | "done";
    description: string | null;
    id: string;
    createdAt: string;
    updatedAt: string;
    epicId: string;
    title: string;
    position: number;
}>;
export type TaskResponse = z.infer<typeof taskSchema>;
export interface ListTasksResponse {
    tasks: TaskResponse[];
}
