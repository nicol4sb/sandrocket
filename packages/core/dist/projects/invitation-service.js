class InvitationServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async createInvitation(input) {
        // Verify project exists
        const project = await this.deps.projects.findById(input.projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        // Verify creator is owner
        const member = await this.deps.members.findByProjectAndUser(input.projectId, input.createdByUserId);
        if (!member || member.role !== 'owner') {
            throw new Error('Only project owners can create invitations');
        }
        return await this.deps.invitations.create(input);
    }
    async acceptInvitation(input) {
        const invitation = await this.deps.invitations.findByToken(input.token);
        if (!invitation) {
            throw new Error('Invalid or expired invitation token');
        }
        // Check if user is already a member
        const existingMember = await this.deps.members.findByProjectAndUser(invitation.projectId, input.userId);
        if (existingMember) {
            // Already a member, mark invitation as used but don't throw error
            await this.deps.invitations.markAsUsed(input.token, input.userId);
            return true;
        }
        // Mark invitation as used
        const marked = await this.deps.invitations.markAsUsed(input.token, input.userId);
        if (!marked) {
            throw new Error('Failed to accept invitation');
        }
        // Add user as contributor
        await this.deps.members.create(invitation.projectId, input.userId, 'contributor');
        return true;
    }
    async getInvitationByToken(token) {
        return await this.deps.invitations.findByToken(token);
    }
}
export function createInvitationService(deps) {
    return new InvitationServiceImpl(deps);
}
