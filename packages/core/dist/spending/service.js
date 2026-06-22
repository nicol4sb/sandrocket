function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function resolveEntryDate(entryDate) {
    const trimmed = entryDate?.trim();
    return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}
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
    async createEntry(projectId, description, amount, entryDate, bank) {
        const maxPos = await this.deps.spending.getMaxPosition(projectId);
        return this.deps.spending.create({
            projectId,
            description: description.trim(),
            amount,
            entryDate: resolveEntryDate(entryDate),
            bank: (bank ?? '').trim(),
            position: maxPos + 1
        });
    }
    async updateEntry(id, description, amount, entryDate, bank) {
        return this.deps.spending.update({
            id,
            description,
            amount,
            entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
            bank: bank === undefined ? undefined : bank.trim()
        });
    }
    async deleteEntry(id) {
        return this.deps.spending.delete(id);
    }
    async importEntries(projectId, entries, replace = true) {
        const normalized = entries.map((entry, index) => ({
            description: entry.description.trim(),
            bank: (entry.bank ?? '').trim(),
            amount: entry.amount,
            entryDate: resolveEntryDate(entry.entryDate),
            position: index + 1
        }));
        let created;
        if (replace) {
            created = await this.deps.spending.replaceAll(projectId, normalized);
        }
        else {
            const maxPos = await this.deps.spending.getMaxPosition(projectId);
            created = [];
            for (let i = 0; i < normalized.length; i++) {
                created.push(await this.deps.spending.create({
                    projectId,
                    ...normalized[i],
                    position: maxPos + i + 1
                }));
            }
        }
        const totalAmount = created.reduce((sum, e) => sum + e.amount, 0);
        return { entries: created, totalAmount };
    }
}
export function createSpendingService(deps) {
    return new SpendingServiceImpl(deps);
}
