import { SpendingRepository } from './ports.js';
import { SpendingEntry } from './types.js';

export interface SpendingService {
  list(projectId: number): Promise<{ visible: boolean; entries: SpendingEntry[]; totalAmount: number }>;
  setVisible(projectId: number, visible: boolean): Promise<boolean>;
  createEntry(projectId: number, description: string, amount: number): Promise<SpendingEntry>;
  updateEntry(id: number, description?: string, amount?: number): Promise<SpendingEntry | null>;
  deleteEntry(id: number): Promise<boolean>;
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

  async createEntry(projectId: number, description: string, amount: number): Promise<SpendingEntry> {
    const maxPos = await this.deps.spending.getMaxPosition(projectId);
    return this.deps.spending.create({
      projectId,
      description: description.trim(),
      amount,
      position: maxPos + 1
    });
  }

  async updateEntry(id: number, description?: string, amount?: number): Promise<SpendingEntry | null> {
    return this.deps.spending.update({ id, description, amount });
  }

  async deleteEntry(id: number): Promise<boolean> {
    return this.deps.spending.delete(id);
  }
}

export function createSpendingService(deps: SpendingServiceDependencies): SpendingService {
  return new SpendingServiceImpl(deps);
}
