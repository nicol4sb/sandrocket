function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function resolveEntryDate(entryDate) {
    const trimmed = entryDate?.trim();
    return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}
class SummaryServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    async list(projectId) {
        const [visible, entries] = await Promise.all([
            this.deps.summary.isVisible(projectId),
            this.deps.summary.listByProject(projectId)
        ]);
        const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
        return { visible, entries, totalAmount };
    }
    async setVisible(projectId, visible) {
        await this.deps.summary.setVisible(projectId, visible);
        return visible;
    }
    async createEntry(projectId, lot, amount, entryDate, fichierRetenu) {
        const maxPos = await this.deps.summary.getMaxPosition(projectId);
        return this.deps.summary.create({
            projectId,
            lot: lot.trim(),
            fichierRetenu: (fichierRetenu ?? '').trim(),
            amount,
            entryDate: resolveEntryDate(entryDate),
            position: maxPos + 1
        });
    }
    async updateEntry(id, lot, amount, entryDate, fichierRetenu) {
        return this.deps.summary.update({
            id,
            lot: lot === undefined ? undefined : lot.trim(),
            amount,
            entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
            fichierRetenu: fichierRetenu === undefined ? undefined : fichierRetenu.trim()
        });
    }
    async deleteEntry(id) {
        return this.deps.summary.delete(id);
    }
    async importEntries(projectId, entries, replace = true) {
        const normalized = entries.map((entry, index) => ({
            lot: entry.lot.trim(),
            fichierRetenu: (entry.fichierRetenu ?? '').trim(),
            amount: entry.amount,
            entryDate: resolveEntryDate(entry.entryDate),
            position: index + 1
        }));
        let created;
        if (replace) {
            created = await this.deps.summary.replaceAll(projectId, normalized);
        }
        else {
            const maxPos = await this.deps.summary.getMaxPosition(projectId);
            created = [];
            for (let i = 0; i < normalized.length; i++) {
                created.push(await this.deps.summary.create({
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
export function createSummaryService(deps) {
    return new SummaryServiceImpl(deps);
}
