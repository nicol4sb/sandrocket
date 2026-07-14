import * as XLSX from 'xlsx';
import type { Epic, SpendingEntry, SummaryEntry, Task } from '@sandrocket/core';
import { sortByEntryDate, spendingPaidTotal } from '@sandrocket/core';

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function workbookToBuffer(
  rows: (string | number)[][],
  sheetName: string,
  colWidths?: { wch: number }[]
): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) {
    worksheet['!cols'] = colWidths;
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/** Matches SpendingTable export / import format */
export function buildSpendingExcelBuffer(entries: SpendingEntry[]): Buffer {
  const sorted = sortByEntryDate(entries);
  const totalAmount = spendingPaidTotal(sorted);
  const rows: (string | number)[][] = [
    ['Payment date', 'Description', 'Bank', 'Paid', 'Amount'],
    ...sorted.map((e) => [e.entryDate, e.description, e.bank, e.paid ? 'Yes' : 'No', e.amount]),
    ['', '', '', 'Total', totalAmount]
  ];
  return workbookToBuffer(rows, 'Spending', [{ wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 8 }, { wch: 14 }]);
}

/** Matches SummaryTable (Devis) export / import format */
export function buildDevisExcelBuffer(entries: SummaryEntry[]): Buffer {
  const sorted = sortByEntryDate(entries);
  const totalAmount = sorted.reduce((sum, e) => sum + e.amount, 0);
  const rows: (string | number)[][] = [
    ['Lot', 'Fichier retenu', 'Date du devis', 'TTC (€)'],
    ...sorted.map((e) => [
      e.lot,
      e.fichierRetenu,
      formatDisplayDate(e.entryDate),
      e.amount
    ]),
    ['', '', 'Total TTC', totalAmount]
  ];
  return workbookToBuffer(rows, 'Devis', [{ wch: 42 }, { wch: 28 }, { wch: 14 }, { wch: 14 }]);
}

/** Task list + epic backlog notes (matches board layout: tasks by position, then backlog) */
export function buildTasksExcelBuffer(
  epicTasks: Array<{ epic: Epic; tasks: Task[] }>
): Buffer {
  const rows: (string | number)[][] = [['Epic', 'Type', 'Description', 'Position']];

  for (const { epic, tasks } of epicTasks) {
    const sorted = [...tasks].sort((a, b) => a.position - b.position);

    for (const task of sorted) {
      rows.push([epic.name, 'task', task.description, task.position]);
    }

    rows.push([epic.name, 'backlog', epic.description ?? '', '']);
  }

  return workbookToBuffer(rows, 'Tasks', [{ wch: 24 }, { wch: 12 }, { wch: 48 }, { wch: 10 }]);
}
