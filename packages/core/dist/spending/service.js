class SpendingServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async list(projectId) {
        const [visible, entries] = await Promise.all([
            this.deps.spending.isVisible(projectId),
            this.deps.spending.listByProject(projectId)
        ]);
        const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
        return { visible, entries, totalAmount };
    }
    async setVisible(projectId, visible) {
        await this.deps.spending.setVisible(projectId, visible);
        return visible;
    }
    async createEntry(projectId, description, amount) {
        const maxPos = await this.deps.spending.getMaxPosition(projectId);
        return this.deps.spending.create({
            projectId,
            description: description.trim(),
            amount,
            position: maxPos + 1
        });
    }
    async updateEntry(id, description, amount) {
        return this.deps.spending.update({ id, description, amount });
    }
    async deleteEntry(id) {
        return this.deps.spending.delete(id);
    }
}
export function createSpendingService(deps) {
    return new SpendingServiceImpl(deps);
}
