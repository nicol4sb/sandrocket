import { spendingPaidTotal } from './types.js';
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
        const totalAmount = spendingPaidTotal(entries);
        return { visible, entries, totalAmount };
    }
    async setVisible(projectId, visible) {
        await this.deps.spending.setVisible(projectId, visible);
        return visible;
    }
    async createEntry(projectId, description, amount, entryDate, bank, paid = false) {
        const maxPos = await this.deps.spending.getMaxPosition(projectId);
        const created = await this.deps.spending.create({
            projectId,
            description: description.trim(),
            amount,
            entryDate: resolveEntryDate(entryDate),
            bank: (bank ?? '').trim(),
            paid,
            position: maxPos + 1
        });
        await this.deps.spending.reorderPositionsByDate(projectId);
        return (await this.deps.spending.findById(created.id)) ?? created;
    }
    async updateEntry(id, description, amount, entryDate, bank, paid) {
        const updated = await this.deps.spending.update({
            id,
            description,
            amount,
            entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
            bank: bank === undefined ? undefined : bank.trim(),
            paid
        });
        if (!updated)
            return null;
        await this.deps.spending.reorderPositionsByDate(updated.projectId);
        return this.deps.spending.findById(updated.id);
    }
    async deleteEntry(id) {
        const existing = await this.deps.spending.findById(id);
        if (!existing)
            return false;
        const deleted = await this.deps.spending.delete(id);
        if (deleted) {
            await this.deps.spending.reorderPositionsByDate(existing.projectId);
        }
        return deleted;
    }
    async importEntries(projectId, entries, replace = true) {
        const normalized = entries
            .map((entry, sourceIndex) => ({
            description: entry.description.trim(),
            bank: (entry.bank ?? '').trim(),
            amount: entry.amount,
            entryDate: resolveEntryDate(entry.entryDate),
            paid: entry.paid ?? true,
            sourceIndex
        }))
            .sort((a, b) => {
            const dateCmp = a.entryDate.localeCompare(b.entryDate);
            return dateCmp !== 0 ? dateCmp : a.sourceIndex - b.sourceIndex;
        })
            .map((entry, index) => ({
            description: entry.description,
            bank: entry.bank,
            amount: entry.amount,
            entryDate: entry.entryDate,
            paid: entry.paid,
            position: index + 1
        }));
        if (replace) {
            await this.deps.spending.replaceAll(projectId, normalized);
        }
        else {
            const maxPos = await this.deps.spending.getMaxPosition(projectId);
            for (let i = 0; i < normalized.length; i++) {
                await this.deps.spending.create({
                    projectId,
                    ...normalized[i],
                    position: maxPos + i + 1
                });
            }
            await this.deps.spending.reorderPositionsByDate(projectId);
        }
        const listed = await this.deps.spending.listByProject(projectId);
        const totalAmount = spendingPaidTotal(listed);
        return { entries: listed, totalAmount };
    }
}
export function createSpendingService(deps) {
    return new SpendingServiceImpl(deps);
}
