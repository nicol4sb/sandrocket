import { z } from 'zod';
export declare const taskStatusSchema: z.ZodEnum<["backlog", "in_progress", "done"]>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export declare const createTaskRequestSchema: z.ZodObject<{
    epicId: z.ZodOptional<z.ZodNumber>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    epicId?: number | undefined;
}, {
    description: string;
    epicId?: number | undefined;
}>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export declare const updateTaskRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["backlog", "in_progress", "done"]>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "backlog" | "in_progress" | "done" | undefined;
    description?: string | undefined;
    position?: number | undefined;
}, {
    status?: "backlog" | "in_progress" | "done" | undefined;
    description?: string | undefined;
    position?: number | undefined;
}>;
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
export declare const taskSchema: z.ZodObject<{
    id: z.ZodNumber;
    epicId: z.ZodNumber;
    creatorUserId: z.ZodNumber;
    description: z.ZodString;
    status: z.ZodEnum<["backlog", "in_progress", "done"]>;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastEditedByUserId: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "backlog" | "in_progress" | "done";
    id: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    epicId: number;
    position: number;
    creatorUserId: number;
    lastEditedByUserId: number | null;
}, {
    status: "backlog" | "in_progress" | "done";
    id: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    epicId: number;
    position: number;
    creatorUserId: number;
    lastEditedByUserId: number | null;
}>;
export type TaskResponse = z.infer<typeof taskSchema>;
export interface ListTasksResponse {
    tasks: TaskResponse[];
}
export declare const reorderTaskRequestSchema: z.ZodObject<{
    epicId: z.ZodNumber;
    status: z.ZodEnum<["backlog", "in_progress", "done"]>;
    position: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "backlog" | "in_progress" | "done";
    epicId: number;
    position: number;
}, {
    status: "backlog" | "in_progress" | "done";
    epicId: number;
    position: number;
}>;
export type ReorderTaskRequest = z.infer<typeof reorderTaskRequestSchema>;
