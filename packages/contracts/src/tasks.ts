import { z } from 'zod';

export const taskStatusSchema = z.enum(['backlog', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskRequestSchema = z.object({
  // epicId is taken from URL params; keep optional for flexibility
  epicId: z.number().int().optional(),
  description: z.string().min(1, 'Description is required').max(150, 'Description must be 150 characters or less')
});
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

export const updateTaskRequestSchema = z.object({
  description: z.string().min(1).max(150, 'Description must be 150 characters or less').optional(),
  status: taskStatusSchema.optional(),
  position: z.number().int().min(0).optional()
});
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

export const taskSchema = z.object({
  id: z.number().int(),
  epicId: z.number().int(),
  creatorUserId: z.number().int(),
  description: z.string(),
  status: taskStatusSchema,
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastEditedByUserId: z.number().int().nullable()
});
export type TaskResponse = z.infer<typeof taskSchema>;

export interface ListTasksResponse {
  tasks: TaskResponse[];
}

export const reorderTaskRequestSchema = z.object({
  epicId: z.number().int(),
  status: taskStatusSchema,
  position: z.number().int().min(0)
});
export type ReorderTaskRequest = z.infer<typeof reorderTaskRequestSchema>;


