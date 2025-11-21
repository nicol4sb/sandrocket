function toPublicEpic(epic) {
    return {
        id: epic.id,
        projectId: epic.projectId,
        name: epic.name,
        description: epic.description,
        createdAt: epic.createdAt,
        updatedAt: epic.updatedAt
    };
}
class EpicServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async createEpic(input) {
        const name = input.name.trim();
        if (!name) {
            throw new Error('Epic name is required');
        }
        const created = await this.deps.epics.create({
            projectId: input.projectId,
            name,
            description: input.description ?? null
        });
        return toPublicEpic(created);
    }
    async listEpics(projectId) {
        const epics = await this.deps.epics.listByProject(projectId);
        return epics.map(toPublicEpic);
    }
    async updateEpic(input) {
        const updated = await this.deps.epics.update(input);
        return updated ? toPublicEpic(updated) : null;
    }
    async deleteEpic(id) {
        return await this.deps.epics.delete(id);
    }
}
export function createEpicService(deps) {
    return new EpicServiceImpl(deps);
}
