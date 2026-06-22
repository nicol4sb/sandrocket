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
    return this.deps.summary.create({
      projectId,
      lot: lot.trim(),
      fichierRetenu: (fichierRetenu ?? '').trim(),
      amount,
      entryDate: resolveEntryDate(entryDate),
      position: maxPos + 1
    });
  }

  async updateEntry(
    id: number,
    lot?: string,
    amount?: number,
    entryDate?: string,
    fichierRetenu?: string
  ): Promise<SummaryEntry | null> {
    return this.deps.summary.update({
      id,
      lot: lot === undefined ? undefined : lot.trim(),
      amount,
      entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
      fichierRetenu: fichierRetenu === undefined ? undefined : fichierRetenu.trim()
    });
  }

  async deleteEntry(id: number): Promise<boolean> {
    return this.deps.summary.delete(id);
  }

  async importEntries(
    projectId: number,
    entries: SummaryImportEntryInput[],
    replace = true
  ): Promise<{ entries: SummaryEntry[]; totalAmount: number }> {
    const normalized = entries.map((entry, index) => ({
      lot: entry.lot.trim(),
      fichierRetenu: (entry.fichierRetenu ?? '').trim(),
      amount: entry.amount,
      entryDate: resolveEntryDate(entry.entryDate),
      position: index + 1
    }));

    let created: SummaryEntry[];
    if (replace) {
      created = await this.deps.summary.replaceAll(projectId, normalized);
    } else {
      const maxPos = await this.deps.summary.getMaxPosition(projectId);
      created = [];
      for (let i = 0; i < normalized.length; i++) {
        created.push(
          await this.deps.summary.create({
            projectId,
            ...normalized[i],
            position: maxPos + i + 1
          })
        );
      }
    }

    const totalAmount = created.reduce((sum, e) => sum + e.amount, 0);
    return { entries: created, totalAmount };
  }
}

export function createSummaryService(deps: SummaryServiceDependencies): SummaryService {
  return new SummaryServiceImpl(deps);
}
