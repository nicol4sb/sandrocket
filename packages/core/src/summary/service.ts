import { SummaryRepository } from './ports.js';
import { SummaryEntry } from './types.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveEntryDate(entryDate?: string): string {
  const trimmed = entryDate?.trim();
  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}

export interface SummaryImportEntryInput {
  lot: string;
  fichierRetenu?: string;
  amount: number;
  entryDate?: string;
}

export interface SummaryService {
  list(projectId: number): Promise<{ visible: boolean; entries: SummaryEntry[]; totalAmount: number }>;
  setVisible(projectId: number, visible: boolean): Promise<boolean>;
  createEntry(
    projectId: number,
    lot: string,
    amount: number,
    entryDate?: string,
    fichierRetenu?: string
  ): Promise<SummaryEntry>;
  updateEntry(
    id: number,
    lot?: string,
    amount?: number,
    entryDate?: string,
    fichierRetenu?: string
  ): Promise<SummaryEntry | null>;
  deleteEntry(id: number): Promise<boolean>;
  importEntries(
    projectId: number,
    entries: SummaryImportEntryInput[],
    replace?: boolean
  ): Promise<{ entries: SummaryEntry[]; totalAmount: number }>;
}

export interface SummaryServiceDependencies {
  summary: SummaryRepository;
}

class SummaryServiceImpl implements SummaryService {
  constructor(private readonly deps: SummaryServiceDependencies) {}

  async list(projectId: number) {
    const [visible, entries] = await Promise.all([
      this.deps.summary.isVisible(projectId),
      this.deps.summary.listByProject(projectId)
    ]);
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    return { visible, entries, totalAmount };
  }

  async setVisible(projectId: number, visible: boolean): Promise<boolean> {
    await this.deps.summary.setVisible(projectId, visible);
    return visible;
  }

  async createEntry(
    projectId: number,
    lot: string,
    amount: number,
    entryDate?: string,
    fichierRetenu?: string
  ): Promise<SummaryEntry> {
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

  async updateEntry(
    id: number,
    lot?: string,
    amount?: number,
    entryDate?: string,
    fichierRetenu?: string
  ): Promise<SummaryEntry | null> {
    const updated = await this.deps.summary.update({
      id,
      lot: lot === undefined ? undefined : lot.trim(),
      amount,
      entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
      fichierRetenu: fichierRetenu === undefined ? undefined : fichierRetenu.trim()
    });
    if (!updated) return null;
    await this.deps.summary.reorderPositionsByDate(updated.projectId);
    return this.deps.summary.findById(updated.id);
  }

  async deleteEntry(id: number): Promise<boolean> {
    const existing = await this.deps.summary.findById(id);
    if (!existing) return false;
    const deleted = await this.deps.summary.delete(id);
    if (deleted) {
      await this.deps.summary.reorderPositionsByDate(existing.projectId);
    }
    return deleted;
  }

  async importEntries(
    projectId: number,
    entries: SummaryImportEntryInput[],
    replace = true
  ): Promise<{ entries: SummaryEntry[]; totalAmount: number }> {
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
    } else {
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

export function createSummaryService(deps: SummaryServiceDependencies): SummaryService {
  return new SummaryServiceImpl(deps);
}
