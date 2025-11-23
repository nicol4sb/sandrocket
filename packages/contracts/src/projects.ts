import { z } from 'zod';

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().max(1000).optional().nullable()
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(1000).optional().nullable()
});
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export const projectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: z.enum(['owner', 'contributor']).optional()
});
export type ProjectResponse = z.infer<typeof projectSchema>;

export interface ListProjectsResponse {
  projects: ProjectResponse[];
}

export const createInvitationRequestSchema = z.object({
  projectId: z.number().int()
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const acceptInvitationRequestSchema = z.object({
  token: z.string()
});
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;

export const invitationResponseSchema = z.object({
  id: z.number().int(),
  projectId: z.number().int(),
  token: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable()
});
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;


