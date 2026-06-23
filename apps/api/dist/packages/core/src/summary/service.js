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
        const created = await this.deps.summary.create({
            projectId,
            lot: lot.trim(),
            fichierRetenu: (fichierRetenu ?? '').trim(),
            amount,
            entryDate: resolveEntryDate(entryDate),
            position: maxPos + 1
        });
        await this.deps.summary.reorderPositionsByDate(projectId);
        return (await this.deps.summary.findById(created.id)) ?? created;
    }
    async updateEntry(id, lot, amount, entryDate, fichierRetenu) {
        const updated = await this.deps.summary.update({
            id,
            lot: lot === undefined ? undefined : lot.trim(),
            amount,
            entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
            fichierRetenu: fichierRetenu === undefined ? undefined : fichierRetenu.trim()
        });
        if (!updated)
            return null;
        await this.deps.summary.reorderPositionsByDate(updated.projectId);
        return this.deps.summary.findById(updated.id);
    }
    async deleteEntry(id) {
        const existing = await this.deps.summary.findById(id);
        if (!existing)
            return false;
        const deleted = await this.deps.summary.delete(id);
        if (deleted) {
            await this.deps.summary.reorderPositionsByDate(existing.projectId);
        }
        return deleted;
    }
    async importEntries(projectId, entries, replace = true) {
        const normalized = entries
            .map((entry, sourceIndex) => ({
            lot: entry.lot.trim(),
            fichierRetenu: (entry.fichierRetenu ?? '').trim(),
            amount: entry.amount,
            entryDate: resolveEntryDate(entry.entryDate),
            sourceIndex
        }))
            .sort((a, b) => {
            const dateCmp = a.entryDate.localeCompare(b.entryDate);
            return dateCmp !== 0 ? dateCmp : a.sourceIndex - b.sourceIndex;
        })
            .map((entry, index) => ({
            lot: entry.lot,
            fichierRetenu: entry.fichierRetenu,
            amount: entry.amount,
            entryDate: entry.entryDate,
            position: index + 1
        }));
        if (replace) {
            await this.deps.summary.replaceAll(projectId, normalized);
        }
        else {
            const maxPos = await this.deps.summary.getMaxPosition(projectId);
            for (let i = 0; i < normalized.length; i++) {
                await this.deps.summary.create({
                    projectId,
                    ...normalized[i],
                    position: maxPos + i + 1
                });
            }
            await this.deps.summary.reorderPositionsByDate(projectId);
        }
        const listed = await this.deps.summary.listByProject(projectId);
        const totalAmount = listed.reduce((sum, e) => sum + e.amount, 0);
        return { entries: listed, totalAmount };
    }
}
export function createSummaryService(deps) {
    return new SummaryServiceImpl(deps);
}
