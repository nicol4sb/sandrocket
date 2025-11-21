function toPublicProject(project) {
    return {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
    };
}
class ProjectServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async createProject(input) {
        const name = input.name.trim();
        if (!name) {
            throw new Error('Project name is required');
        }
        const created = await this.deps.projects.create({
            ownerUserId: input.ownerUserId,
            name,
            description: input.description ?? null
        });
        return toPublicProject(created);
    }
    async listProjects(ownerUserId) {
        const projects = await this.deps.projects.listByOwner(ownerUserId);
        return projects.map(toPublicProject);
    }
    async updateProject(input) {
        const updated = await this.deps.projects.update(input);
        return updated ? toPublicProject(updated) : null;
    }
    async deleteProject(id) {
        return await this.deps.projects.delete(id);
    }
}
export function createProjectService(deps) {
    return new ProjectServiceImpl(deps);
}
