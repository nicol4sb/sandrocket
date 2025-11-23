import { ProjectInvitationRepository, ProjectMemberRepository, ProjectRepository } from './ports.js';
import { CreateInvitationInput, AcceptInvitationInput, ProjectInvitation } from './invitation-types.js';
export interface InvitationService {
    createInvitation(input: CreateInvitationInput): Promise<ProjectInvitation>;
    acceptInvitation(input: AcceptInvitationInput): Promise<boolean>;
    getInvitationByToken(token: string): Promise<ProjectInvitation | null>;
}
export interface InvitationServiceDependencies {
    invitations: ProjectInvitationRepository;
    members: ProjectMemberRepository;
    projects: ProjectRepository;
}
export declare function createInvitationService(deps: InvitationServiceDependencies): InvitationService;
