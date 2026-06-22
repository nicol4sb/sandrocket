function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function resolveEntryDate(entryDate) {
    const trimmed = entryDate?.trim();
    return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}
function resolveOptionalDate(value) {
    const trimmed = value?.trim() ?? '';
    if (!trimmed)
        return '';
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
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
    async createEntry(projectId, description, amount, entryDate, accomptePayeDate, paiementCompletDate) {
        const maxPos = await this.deps.summary.getMaxPosition(projectId);
        return this.deps.summary.create({
            projectId,
            description: description.trim(),
            amount,
            entryDate: resolveEntryDate(entryDate),
            accomptePayeDate: resolveOptionalDate(accomptePayeDate),
            paiementCompletDate: resolveOptionalDate(paiementCompletDate),
            position: maxPos + 1
        });
    }
    async updateEntry(id, description, amount, entryDate, accomptePayeDate, paiementCompletDate) {
        return this.deps.summary.update({
            id,
            description,
            amount,
            entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
            accomptePayeDate: accomptePayeDate === undefined ? undefined : resolveOptionalDate(accomptePayeDate),
            paiementCompletDate: paiementCompletDate === undefined ? undefined : resolveOptionalDate(paiementCompletDate)
        });
    }
    async deleteEntry(id) {
        return this.deps.summary.delete(id);
    }
}
export function createSummaryService(deps) {
    return new SummaryServiceImpl(deps);
}
