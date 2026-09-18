import { spendingLotPaidTotal } from './lot-types.js';
import { spendingDebtPaidTotal, spendingNonDebtPaidTotal, spendingPaidTotal } from './types.js';

export const SPENDING_EXCEL_HEADERS = [
  'Lot',
  'Payment date',
  'Description',
  'Bank',
  'Paid',
  'Debt',
  'Amount'
] as const;

export interface SpendingExcelExportLot {
  id: number;
  name: string;
  description: string;
  estimateAmount: number;
  position: number;
}

export interface SpendingExcelExportEntry {
  lotId: number | null;
  entryDate: string;
  description: string;
  bank: string;
  paid: boolean;
  debtPaid: boolean;
  amount: number;
}

export interface BuildSpendingExcelRowsOptions {
  formatDate?: (iso: string) => string;
}

function formatSubtotalDiff(diff: number): string {
  return diff >= 0 ? `${diff} remaining` : `Over by ${Math.abs(diff)}`;
}

function sortExportEntries(entries: SpendingExcelExportEntry[]): SpendingExcelExportEntry[] {
  return [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
}

export function buildSpendingExcelRows(
  entries: SpendingExcelExportEntry[],
  lots: SpendingExcelExportLot[],
  options?: BuildSpendingExcelRowsOptions
): (string | number)[][] {
  const formatDate = options?.formatDate ?? ((iso: string) => iso);
  const rows: (string | number)[][] = [[...SPENDING_EXCEL_HEADERS]];

  const sortedLots = [...lots].sort((a, b) => a.position - b.position || a.id - b.id);

  for (const lot of sortedLots) {
    const lotName = lot.name.trim() || 'Unnamed lot';
    const lotEntries = sortExportEntries(entries.filter((entry) => entry.lotId === lot.id));
    const spent = spendingLotPaidTotal(lotEntries, lot.id);
    const diff = lot.estimateAmount - spent;
    const estimateDescription = lot.description.trim() || 'Estimate';

    rows.push([lotName, '', estimateDescription, '', '', '', lot.estimateAmount]);

    for (const entry of lotEntries) {
      rows.push([
        lotName,
        formatDate(entry.entryDate),
        entry.description,
        entry.bank,
        entry.paid ? 'Yes' : 'No',
        entry.debtPaid ? 'Yes' : 'No',
        entry.amount
      ]);
    }

    rows.push([
      '',
      '',
      'Subtotal — spent vs estimate',
      '',
      `${spent} spent`,
      '',
      formatSubtotalDiff(diff)
    ]);
  }

  const uncategorized = sortExportEntries(entries.filter((entry) => entry.lotId == null));
  if (uncategorized.length > 0) {
    rows.push(['Uncategorized', '', '', '', '', '', '']);
    for (const entry of uncategorized) {
      rows.push([
        '',
        formatDate(entry.entryDate),
        entry.description,
        entry.bank,
        entry.paid ? 'Yes' : 'No',
        entry.debtPaid ? 'Yes' : 'No',
        entry.amount
      ]);
    }
  }

  const total = spendingPaidTotal(entries);
  const debtTotal = spendingDebtPaidTotal(entries);
  const nonDebtTotal = spendingNonDebtPaidTotal(entries);
  const remainingTotal = lots.reduce(
    (sum, lot) => sum + (lot.estimateAmount - spendingLotPaidTotal(entries, lot.id)),
    0
  );
  rows.push(['', '', '', '', 'Debt spent', '', debtTotal]);
  rows.push(['', '', '', '', '', 'Equity', nonDebtTotal]);
  rows.push(['', '', '', 'Total spent', '', '', total]);
  if (lots.length > 0) {
    rows.push([
      '',
      '',
      '',
      remainingTotal < 0 ? 'Total remaining (over)' : 'Total remaining',
      '',
      '',
      remainingTotal
    ]);
  }

  return rows;
}

export function isSpendingExcelMetaRow(
  lotName: string,
  description: string,
  bank: string,
  dateRaw: unknown,
  amountRaw: unknown
): boolean {
  const lot = lotName.trim().toLowerCase();
  const desc = description.trim().toLowerCase();
  const dateEmpty = dateRaw === '' || dateRaw == null;
  const amountEmpty = amountRaw === '' || amountRaw == null;

  if (lot === 'uncategorized' && dateEmpty && amountEmpty) return true;
  if (desc.startsWith('subtotal')) return true;
  if (dateEmpty && desc === 'estimate') return true;
  if (/^(debt spent|non debt spend|equity)$/i.test(desc)) return true;
  if (/^total remaining/i.test(desc)) return true;
  if (dateEmpty && amountEmpty && !bank.trim()) return true;

  return false;
}
