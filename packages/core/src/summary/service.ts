import { SummaryRepository } from './ports.js';
import { SummaryEntry } from './types.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveEntryDate(entryDate?: string): string {
  const trimmed = entryDate?.trim();
  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : todayIsoDate();
}

function resolveOptionalDate(value?: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
}

export interface SummaryService {
  list(projectId: number): Promise<{ visible: boolean; entries: SummaryEntry[]; totalAmount: number }>;
  setVisible(projectId: number, visible: boolean): Promise<boolean>;
  createEntry(
    projectId: number,
    description: string,
    amount: number,
    entryDate?: string,
    accomptePayeDate?: string,
    paiementCompletDate?: string
  ): Promise<SummaryEntry>;
  updateEntry(
    id: number,
    description?: string,
    amount?: number,
    entryDate?: string,
    accomptePayeDate?: string,
    paiementCompletDate?: string
  ): Promise<SummaryEntry | null>;
  deleteEntry(id: number): Promise<boolean>;
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
    description: string,
    amount: number,
    entryDate?: string,
    accomptePayeDate?: string,
    paiementCompletDate?: string
  ): Promise<SummaryEntry> {
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

  async updateEntry(
    id: number,
    description?: string,
    amount?: number,
    entryDate?: string,
    accomptePayeDate?: string,
    paiementCompletDate?: string
  ): Promise<SummaryEntry | null> {
    return this.deps.summary.update({
      id,
      description,
      amount,
      entryDate: entryDate === undefined ? undefined : resolveEntryDate(entryDate),
      accomptePayeDate:
        accomptePayeDate === undefined ? undefined : resolveOptionalDate(accomptePayeDate),
      paiementCompletDate:
        paiementCompletDate === undefined ? undefined : resolveOptionalDate(paiementCompletDate)
    });
  }

  async deleteEntry(id: number): Promise<boolean> {
    return this.deps.summary.delete(id);
  }
}

export function createSummaryService(deps: SummaryServiceDependencies): SummaryService {
  return new SummaryServiceImpl(deps);
}
