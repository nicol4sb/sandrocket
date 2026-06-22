import { SpendingRepository } from './ports.js';
import { SpendingEntry } from './types.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveEntryDate(entryDate?: string): string {
  const trimmed = entryDate?.trim();
  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}

export interface SpendingImportEntryInput {
  description: string;
  amount: number;
  entryDate?: string;
  bank?: string;
}

export interface SpendingService {
  list(projectId: number): Promise<{ visible: boolean; entries: SpendingEntry[]; totalAmount: number }>;
  setVisible(projectId: number, visible: boolean): Promise<boolean>;
  createEntry(
    projectId: number,
    description: string,
    amount: number,
    entryDate?: string,
    bank?: string
  ): Promise<SpendingEntry>;
  updateEntry(
    id: number,
    description?: string,
    amount?: number,
    entryDate?: string,
    bank?: string
  ): Promise<SpendingEntry | null>;
  deleteEntry(id: number): Promise<boolean>;
  importEntries(
    projectId: number,
    entries: SpendingImportEntryInput[],
    replace?: boolean
  ): Promise<{ entries: SpendingEntry[]; totalAmount: number }>;
}

export interface SpendingServiceDependencies {
  spending: SpendingRepository;
}

class SpendingServiceImpl implements SpendingService {
  constructor(private readonly deps: SpendingServiceDependencies) {}

  async list(projectId: number) {
    const [visible, entries] = await Promise.all([
      this.deps.spending.isVisible(projectId),
      this.deps.spending.listByProject(projectId)
    ]);
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    return { visible, entries, totalAmount };
  }

  async setVisible(projectId: number, visible: boolean): Promise<boolean> {
    await this.deps.spending.setVisible(projectId, visible);
    return visible;
  }

  async createEntry(
    projectId: number,
    description: string,
    amount: number,
    entryDate?: string,
    bank?: string
  ): Promise<SpendingEntry> {
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

  async updateEntry(
    id: number,
    description?: string,
    amount?: number,
    entryDate?: string,
    bank?: string
  ): Promise<SpendingEntry | null> {
    return this.deps.spending.update({
      id,
      description,
      amount,
      entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
      bank: bank === undefined ? undefined : bank.trim()
    });
  }

  async deleteEntry(id: number): Promise<boolean> {
    return this.deps.spending.delete(id);
  }

  async importEntries(
    projectId: number,
    entries: SpendingImportEntryInput[],
    replace = true
  ): Promise<{ entries: SpendingEntry[]; totalAmount: number }> {
    const normalized = entries.map((entry, index) => ({
      description: entry.description.trim(),
      bank: (entry.bank ?? '').trim(),
      amount: entry.amount,
      entryDate: resolveEntryDate(entry.entryDate),
      position: index + 1
    }));

    let created: SpendingEntry[];
    if (replace) {
      created = await this.deps.spending.replaceAll(projectId, normalized);
    } else {
      const maxPos = await this.deps.spending.getMaxPosition(projectId);
      created = [];
      for (let i = 0; i < normalized.length; i++) {
        created.push(
          await this.deps.spending.create({
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

export function createSpendingService(deps: SpendingServiceDependencies): SpendingService {
  return new SpendingServiceImpl(deps);
}
