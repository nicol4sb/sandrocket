import { z } from 'zod';

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().max(1000).optional().nullable()
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ProjectResponse = z.infer<typeof projectSchema>;

export interface ListProjectsResponse {
  projects: ProjectResponse[];
}


