import { CreateSpendingEntryInput, SpendingEntry, UpdateSpendingEntryInput } from './types.js';

export interface SpendingRepository {
  listByProject(projectId: number): Promise<SpendingEntry[]>;
  findById(id: number): Promise<SpendingEntry | null>;
  create(input: CreateSpendingEntryInput): Promise<SpendingEntry>;
  update(input: UpdateSpendingEntryInput): Promise<SpendingEntry | null>;
  delete(id: number): Promise<boolean>;
  getMaxPosition(projectId: number): Promise<number>;
  isVisible(projectId: number): Promise<boolean>;
  setVisible(projectId: number, visible: boolean): Promise<void>;
}
