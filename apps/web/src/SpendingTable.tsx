import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type {
  ImportSpendingResponse,
  ListSpendingResponse,
  SpendingEntryResponse,
  SpendingLotResponse
} from '@sandrocket/contracts';
import { useIsMobile } from './hooks/useMediaQuery';
import { sortEntriesByDate } from './financeSort';
import { buildSpendingExcelRows, isSpendingExcelMetaRow } from '@sandrocket/core/spending/export-excel';
import {
  SpendingLotDraftRow,
  SpendingLotEstimateRow,
  SpendingLotMigrateBar,
  SpendingLotAssignCaret,
  SpendingLotMobileGroup,
  SpendingLotSubtotalRow,
  lotSpentTotal,
  type LotDraftRow
} from './SpendingLotGroups';
import { LocaleDateInput } from './LocaleDateInput';
import { formatLocaleDate, formatLocaleDateMedium, parseFlexibleDisplayDate } from './localeFormat';

interface SpendingTableProps {
  projectId: number;
  projectName: string;
  baseUrl: string;
}

interface DraftRow {
  entryDate: string;
  description: string;
  bank: string;
  amount: string;
}

interface ParsedSpendingRow {
  lotName: string;
  entryDate: string;
  description: string;
  bank: string;
  amount: number;
  paid: boolean;
  debtPaid: boolean;
}

const SPENDING_COL = {
  LOT: 0,
  DATE: 1,
  DESCRIPTION: 2,
  BANK: 3,
  PAID: 4,
  DEBT_PAID: 5,
  AMOUNT: 6
} as const;

function parsePaidValue(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const str = String(value).trim().toLowerCase();
  if (['yes', 'y', 'oui', 'true', '1', 'x', 'paid', 'payé', 'paye'].includes(str)) return true;
  if (['no', 'n', 'non', 'false', '0', 'unpaid'].includes(str)) return false;
  return true;
}

function debtPaidTotal(entries: SpendingEntryResponse[]): number {
  return entries.filter((e) => e.paid && e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}

function nonDebtPaidTotal(entries: SpendingEntryResponse[]): number {
  return entries.filter((e) => e.paid && !e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}

function paidTotal(entries: SpendingEntryResponse[]): number {
  return debtPaidTotal(entries) + nonDebtPaidTotal(entries);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function resolveEntryDate(value: string): string {
  const trimmed = value.trim();
  return trimmed || todayIso();
}

function newDraftRow(): DraftRow {
  return { entryDate: todayIso(), description: '', bank: '', amount: '' };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseExcelAmount(value: unknown): number | null {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return parseAmount(String(value));
}

function parseExcelDate(value: unknown): string {
  if (value == null || value === '') return todayIso();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(value).trim();
  const flexible = parseFlexibleDisplayDate(str);
  if (flexible) return flexible;
  return todayIso();
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatAmountInput(amount: number): string {
  if (amount === 0) return '';
  return formatAmount(amount);
}

function rowHasContent(description: string, amountStr: string): boolean {
  return description.trim().length > 0 || (parseAmount(amountStr) ?? 0) !== 0;
}

function isFocusMovingWithinRow(e: React.FocusEvent<HTMLElement>): boolean {
  const row = e.currentTarget.closest('tr, .finance-compact-row');
  const next = e.relatedTarget;
  if (!row || !(next instanceof Node)) return false;
  return row.contains(next);
}

function isTotalRow(description: string, bank: unknown, amountCell: unknown): boolean {
  const desc = description.trim().toLowerCase();
  const bankStr = String(bank ?? '').trim().toLowerCase();
  return /total/.test(desc) || /total/.test(bankStr) || /total/.test(String(amountCell ?? ''));
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const first = String(rows[i]?.[0] ?? '').trim().toLowerCase();
    if (first.includes('lot')) return i;
    if (first.includes('payment') || first.includes('date')) return i;
  }
  return -1;
}

function spendingHeaderHasLot(rows: unknown[][], headerIdx: number): boolean {
  if (headerIdx < 0) return false;
  const first = String(rows[headerIdx]?.[0] ?? '').trim().toLowerCase();
  return first.includes('lot');
}

function spendingHeaderHasPaid(rows: unknown[][], headerIdx: number): boolean {
  if (headerIdx < 0) return false;
  const header = rows[headerIdx] ?? [];
  return header.some((cell) => {
    const value = String(cell ?? '').trim().toLowerCase();
    return value.includes('paid') && !value.includes('debt');
  });
}

function spendingHeaderHasDebtPaid(rows: unknown[][], headerIdx: number): boolean {
  if (headerIdx < 0) return false;
  const header = rows[headerIdx] ?? [];
  return header.some((cell) => String(cell ?? '').trim().toLowerCase().includes('debt'));
}

function resolveSpendingAmountIndex(
  rows: unknown[][],
  headerIdx: number,
  hasLotColumn: boolean,
  hasPaidColumn: boolean,
  hasDebtColumn: boolean
): number {
  if (headerIdx >= 0) {
    const header = rows[headerIdx] ?? [];
    const amountIdx = header.findIndex((cell) => {
      const value = String(cell ?? '').trim().toLowerCase();
      return value.includes('amount') || value.includes('montant');
    });
    if (amountIdx >= 0) return amountIdx;
  }
  if (hasDebtColumn) return hasLotColumn ? 6 : 5;
  if (hasPaidColumn) return hasLotColumn ? 5 : 4;
  return hasLotColumn ? 4 : 3;
}

function parseSpendingExcel(buffer: ArrayBuffer): ParsedSpendingRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const headerIdx = findHeaderRowIndex(rows);
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  const hasLotColumn = spendingHeaderHasLot(rows, headerIdx);
  const hasPaidColumn = spendingHeaderHasPaid(rows, headerIdx);
  const hasDebtColumn = spendingHeaderHasDebtPaid(rows, headerIdx);
  const amountIdx = resolveSpendingAmountIndex(rows, headerIdx, hasLotColumn, hasPaidColumn, hasDebtColumn);
  const parsed: ParsedSpendingRow[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const lotName = hasLotColumn ? String(row[0] ?? '').trim() : '';
    const dateCol = hasLotColumn ? 1 : 0;
    const descCol = hasLotColumn ? 2 : 1;
    const bankCol = hasLotColumn ? 3 : 2;
    const paidCol = hasPaidColumn ? (hasLotColumn ? 4 : 3) : -1;
    const debtCol = hasDebtColumn ? (hasLotColumn ? 5 : 4) : -1;
    const dateRaw = row[dateCol];
    const description = String(row[descCol] ?? '').trim();
    const bank = String(row[bankCol] ?? '').trim();
    const paidRaw = paidCol >= 0 ? row[paidCol] : undefined;
    const debtPaidRaw = debtCol >= 0 ? row[debtCol] : undefined;
    const amountRaw = row[amountIdx];

    if (isTotalRow(description, bank, amountRaw)) continue;
    if (isSpendingExcelMetaRow(lotName, description, bank, dateRaw, amountRaw)) continue;
    if (!description && !bank && (amountRaw === '' || amountRaw == null)) continue;

    const amount = parseExcelAmount(amountRaw);
    if (amount === null) continue;
    if (!description && amount === 0) continue;
    if (dateRaw === '' || dateRaw == null) continue;

    parsed.push({
      lotName,
      entryDate: parseExcelDate(dateRaw),
      description,
      bank,
      amount,
      paid: hasPaidColumn ? parsePaidValue(paidRaw) : true,
      debtPaid: hasDebtColumn ? parsePaidValue(debtPaidRaw) : false
    });
  }

  return parsed;
}

function navigateSpendingCellVertically(
  e: React.KeyboardEvent<HTMLInputElement>,
  colIndex: number
): void {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

  const row = e.currentTarget.closest('tr');
  const tbody = row?.closest('tbody');
  if (!row || !tbody) return;

  const dataRows = Array.from(
    tbody.querySelectorAll<HTMLTableRowElement>('tr.spending-row, tr.spending-row-draft')
  );
  const rowIndex = dataRows.indexOf(row as HTMLTableRowElement);
  if (rowIndex === -1) return;

  const nextRowIndex = e.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;
  if (nextRowIndex < 0 || nextRowIndex >= dataRows.length) return;

  const nextInput = dataRows[nextRowIndex]?.cells[colIndex]?.querySelector<HTMLInputElement>(
    '.spending-input, .spending-paid-checkbox, .spending-debt-paid-checkbox'
  );
  if (!nextInput) return;

  e.preventDefault();
  nextInput.focus();
  if (nextInput.type === 'text') {
    nextInput.select();
  }
}

function onSpendingCellKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  colIndex: number
): void {
  if (e.key === 'Enter') {
    e.currentTarget.blur();
    return;
  }
  navigateSpendingCellVertically(e, colIndex);
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim() || 'project';
}

function exportSpendingToExcel(
  entries: SpendingEntryResponse[],
  lots: SpendingLotResponse[],
  projectName: string
) {
  const rows = buildSpendingExcelRows(entries, lots, {
    formatDate: formatLocaleDateMedium
  });
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spending');
  XLSX.writeFile(workbook, `${safeFilename(projectName)}-spending.xlsx`);
}

function SpendingCaret({ open }: { open: boolean }) {
  return (
    <svg
      className={`spending-caret${open ? ' spending-caret-open' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 4.5 6 7.5 9 4.5" />
    </svg>
  );
}

export function SpendingTable({ projectId, projectName, baseUrl }: SpendingTableProps) {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<SpendingEntryResponse[]>([]);
  const [lots, setLots] = useState<SpendingLotResponse[]>([]);
  const [draft, setDraft] = useState<DraftRow>(newDraftRow);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const draftBlurSkipRef = useRef(false);
  const draftPrimaryRef = useRef<HTMLInputElement>(null);
  const draftRowRef = useRef<HTMLDivElement>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const fileInputRef = useRef<HTMLInputElement>(null);
  draftRef.current = draft;
  const dateMax = todayIso();

  const fetchSpending = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as ListSpendingResponse;
      setVisible(data.visible);
      setEntries(sortEntriesByDate(data.entries));
      setLots(data.lots ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [baseUrl, projectId]);

  useEffect(() => {
    setLoading(true);
    setDraft(newDraftRow());
    fetchSpending();
  }, [fetchSpending]);

  const setVisibility = async (nextVisible: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending/visibility`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: nextVisible })
      });
      if (res.ok) {
        setVisible(nextVisible);
      }
    } finally {
      setSaving(false);
    }
  };

  const createEntry = async (
    entryDate: string,
    description: string,
    bank: string,
    amountStr: string,
    lotId: number | null = null
  ) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;
    if (!rowHasContent(description, amountStr)) return;

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount,
          bank: bank.trim(),
          lotId,
          ...(entryDate.trim() ? { entryDate: entryDate.trim() } : {})
        })
      });
      if (res.ok) {
        setDraft(newDraftRow());
        await fetchSpending();
      }
    } finally {
      setSaving(false);
    }
  };

  const createEntryFromLotDraft = (lotId: number | null, draft: LotDraftRow) => {
    void createEntry(draft.entryDate, draft.description, draft.bank, draft.amount, lotId);
  };

  const importEntries = async (parsed: ParsedSpendingRow[]) => {
    if (parsed.length === 0) {
      setImportError('No data rows found in the Excel file.');
      return;
    }

    if (entries.length > 0) {
      const ok = window.confirm(
        'Import will replace all existing spending lines with the Excel file. Continue?'
      );
      if (!ok) return;
    }

    setSaving(true);
    setImportError(null);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace: true,
          entries: parsed.map((row) => ({
            description: row.description,
            bank: row.bank,
            amount: row.amount,
            entryDate: row.entryDate,
            paid: row.paid,
            debtPaid: row.debtPaid,
            lotName: row.lotName || undefined
          }))
        })
      });
      if (!res.ok) {
        setImportError('Import failed. Check the file format.');
        return;
      }
      const data = (await res.json()) as ImportSpendingResponse;
      setEntries(sortEntriesByDate(data.entries));
      setLots(data.lots ?? []);
      setVisible(true);
      setDraft(newDraftRow());
    } catch {
      setImportError('Import failed. Check the file format.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpendingExcel(buffer);
      await importEntries(parsed);
    } catch {
      setImportError('Could not read the Excel file.');
    }
  };

  const deleteEntry = async (entryId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/spending/${entryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchSpending();
      }
    } finally {
      setSaving(false);
    }
  };

  const patchEntry = async (
    entry: SpendingEntryResponse,
    patch: {
      entryDate?: string;
      description?: string;
      bank?: string;
      amount?: number;
      paid?: boolean;
      debtPaid?: boolean;
      lotId?: number | null;
    },
    options?: { skipRefetch?: boolean }
  ) => {
    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (patch.description !== undefined) body.description = patch.description.trim();
      if (patch.amount !== undefined) body.amount = patch.amount;
      if (patch.bank !== undefined) body.bank = patch.bank.trim();
      if (patch.entryDate !== undefined) body.entryDate = resolveEntryDate(patch.entryDate);
      if (patch.paid !== undefined) body.paid = patch.paid;
      if (patch.debtPaid !== undefined) body.debtPaid = patch.debtPaid;
      if (patch.lotId !== undefined) body.lotId = patch.lotId;

      const res = await fetch(`${baseUrl}/spending/${entry.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        if (options?.skipRefetch) {
          const updated = (await res.json()) as SpendingEntryResponse;
          setEntries((prev) =>
            sortEntriesByDate(
              prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
            )
          );
        } else {
          await fetchSpending();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const setEntryPaid = async (entry: SpendingEntryResponse, paid: boolean) => {
    setEntries((prev) =>
      sortEntriesByDate(prev.map((e) => (e.id === entry.id ? { ...e, paid } : e)))
    );
    await patchEntry(entry, { paid }, { skipRefetch: true });
  };

  const setEntryDebtPaid = async (entry: SpendingEntryResponse, debtPaid: boolean) => {
    setEntries((prev) =>
      sortEntriesByDate(prev.map((e) => (e.id === entry.id ? { ...e, debtPaid } : e)))
    );
    await patchEntry(entry, { debtPaid }, { skipRefetch: true });
  };

  const assignEntriesToLot = async (targetEntries: SpendingEntryResponse[], lotId: number) => {
    if (targetEntries.length === 0) return;
    setSaving(true);
    try {
      setEntries((prev) =>
        sortEntriesByDate(
          prev.map((e) => (targetEntries.some((t) => t.id === e.id) ? { ...e, lotId } : e))
        )
      );
      const results = await Promise.all(
        targetEntries.map(async (entry) => {
          const res = await fetch(`${baseUrl}/spending/${entry.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lotId })
          });
          if (!res.ok) return null;
          return (await res.json()) as SpendingEntryResponse;
        })
      );
      const byId = new Map(
        results.filter((r): r is SpendingEntryResponse => r != null).map((r) => [r.id, r])
      );
      if (byId.size > 0) {
        setEntries((prev) =>
          sortEntriesByDate(prev.map((e) => (byId.has(e.id) ? { ...e, ...byId.get(e.id)! } : e)))
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const assignEntryToLot = (entry: SpendingEntryResponse, lotId: number) => {
    void assignEntriesToLot([entry], lotId);
  };

  const expandDraft = () => {
    setExpandedEntryId(null);
    draftBlurSkipRef.current = true;
    setDraftExpanded(true);
    requestAnimationFrame(() => draftPrimaryRef.current?.focus());
  };

  const collapseDraft = useCallback(() => {
    const { entryDate, description, bank, amount } = draftRef.current;
    if (rowHasContent(description, amount)) {
      void createEntry(entryDate, description, bank, amount);
    }
    setDraftExpanded(false);
  }, [createEntry]);

  useEffect(() => {
    if (!draftExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (draftRowRef.current?.contains(e.target as Node)) return;
      collapseDraft();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [draftExpanded, collapseDraft]);

  const handleDraftBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    if (draftBlurSkipRef.current) {
      draftBlurSkipRef.current = false;
      return;
    }
    collapseDraft();
  };

  const totalAmount = paidTotal(entries);
  const debtTotalAmount = debtPaidTotal(entries);
  const nonDebtTotalAmount = nonDebtPaidTotal(entries);
  const uncategorizedEntries = sortEntriesByDate(entries.filter((e) => e.lotId == null));

  const assignAllUncategorizedToLot = (lotId: number) => {
    void assignEntriesToLot(uncategorizedEntries, lotId);
  };

  const spendingRowProps = (entry: SpendingEntryResponse) => ({
    entry,
    dateMax,
    lots,
    showLotAssign: lots.length > 0,
    onAssignLot: (lotId: number) => assignEntryToLot(entry, lotId),
    onCommit: (patch: Parameters<typeof patchEntry>[1]) => void patchEntry(entry, patch),
    onPaidChange: (paid: boolean) => void setEntryPaid(entry, paid),
    onDebtPaidChange: (debtPaid: boolean) => void setEntryDebtPaid(entry, debtPaid),
    onDelete: () => void deleteEntry(entry.id)
  });

  const isMobile = useIsMobile();

  const renderSpendingRow = (rowProps: Parameters<typeof SpendingRow>[0]) => (
    <SpendingRow key={rowProps.entry.id} {...rowProps} />
  );

  if (loading) {
    return null;
  }

  const toggleVisibility = () => {
    void setVisibility(!visible);
  };

  return (
    <div id="board-spending" className="spending-section board-section">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
          e.target.value = '';
        }}
      />
      <div className={`spending-accordion${visible ? ' spending-accordion-open' : ''}`}>
        <div className="spending-accordion-header">
          <button
            type="button"
            className="spending-toggle"
            onClick={toggleVisibility}
            disabled={saving}
            aria-expanded={visible}
            title={visible ? 'Hide spending' : 'Show spending'}
          >
            <span className="spending-toggle-icon">€</span>
            <span className="spending-toggle-label">Spending</span>
            {!visible && entries.length > 0 && (
              <span className="spending-toggle-summary">{formatAmount(totalAmount)}</span>
            )}
          </button>
          <div className="spending-header-actions">
            {visible && (
              <>
                <button
                  type="button"
                  className="spending-import-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={saving}
                  title="Import spending from Excel"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 6v3a1 1 0 001 1h10a1 1 0 001-1V6" />
                    <path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M2 13h10" />
                  </svg>
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  className="spending-export-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSpendingToExcel(entries, lots, projectName);
                  }}
                  disabled={entries.length === 0}
                  title="Export spending to Excel"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
                    <path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M2 13h10" />
                  </svg>
                  <span>Excel</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="spending-caret-btn"
              onClick={toggleVisibility}
              disabled={saving}
              aria-expanded={visible}
              aria-label={visible ? 'Hide spending' : 'Show spending'}
              title={visible ? 'Hide spending' : 'Show spending'}
            >
              <SpendingCaret open={visible} />
            </button>
          </div>
        </div>

        {visible && (
          <div className="spending-table-wrap">
            {importError && <p className="spending-import-error">{importError}</p>}
            {isMobile ? (
              <div className="finance-compact-list spending-lot-list">
                {lots.length === 0 && (
                  <p className="spending-devis-link-hint">
                    Lots and estimates come from the Devis table — add a line there first.
                  </p>
                )}
                {lots.map((lot, index) => (
                  <SpendingLotMobileGroup
                    key={lot.id}
                    lot={lot}
                    colorIndex={index}
                    entries={entries}
                    dateMax={dateMax}
                    expandedEntryId={expandedEntryId}
                    onExpandedChange={setExpandedEntryId}
                    onEntryCommit={(entry, patch) => void patchEntry(entry, patch)}
                    onPaidChange={(entry, paid) => void setEntryPaid(entry, paid)}
                    onDebtPaidChange={(entry, debtPaid) => void setEntryDebtPaid(entry, debtPaid)}
                    onDeleteEntry={(id) => void deleteEntry(id)}
                    onCreateEntry={createEntryFromLotDraft}
                    renderRow={(rowProps) =>
                      renderSpendingRow({
                        ...spendingRowProps(rowProps.entry),
                        compact: rowProps.compact,
                        expanded: rowProps.expanded,
                        onExpandedChange: rowProps.onExpandedChange
                      })
                    }
                  />
                ))}
                {uncategorizedEntries.length > 0 && (
                  <section className="spending-lot-mobile spending-lot-uncategorized">
                    <h4 className="spending-lot-uncategorized-title">Uncategorized</h4>
                    <SpendingLotMigrateBar
                      count={uncategorizedEntries.length}
                      lots={lots}
                      disabled={saving}
                      onAssignAll={assignAllUncategorizedToLot}
                    />
                    {uncategorizedEntries.map((entry) =>
                      renderSpendingRow({
                        compact: true,
                        ...spendingRowProps(entry),
                        expanded: expandedEntryId === entry.id,
                        onExpandedChange: (open) => {
                          setExpandedEntryId(open ? entry.id : null);
                          if (open) setDraftExpanded(false);
                        }
                      })
                    )}
                  </section>
                )}
                {lots.length === 0 && (
                  <div
                    ref={draftRowRef}
                    className={`finance-compact-row finance-compact-row-draft${
                      draftExpanded ? ' finance-compact-row-expanded' : ''
                    }`}
                  >
                    {!draftExpanded ? (
                      <div className="finance-compact-draft-collapsed">
                        <input
                          type="text"
                          className="finance-compact-input finance-compact-draft-trigger"
                          placeholder="Add a line…"
                          value={draft.description}
                          onFocus={expandDraft}
                          onChange={(e) => {
                            const next = e.target.value;
                            setDraft((d) => ({ ...d, description: next }));
                            if (next.trim() && !draftExpanded) expandDraft();
                          }}
                          onBlur={handleDraftBlur}
                        />
                      </div>
                    ) : (
                      <div className="finance-compact-details finance-compact-details-open">
                        <label className="finance-compact-field">
                          <span>Description</span>
                          <input
                            ref={draftPrimaryRef}
                            type="text"
                            className="finance-compact-input"
                            placeholder="Add a line…"
                            value={draft.description}
                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                            onBlur={handleDraftBlur}
                          />
                        </label>
                        <div className="finance-compact-field-row">
                          <label className="finance-compact-field">
                            <span>Amount</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="finance-compact-input finance-compact-input-amount"
                              placeholder="0"
                              value={draft.amount}
                              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                              onBlur={handleDraftBlur}
                            />
                          </label>
                          <label className="finance-compact-field">
                            <span>Date</span>
                            <LocaleDateInput
                              displayClassName="finance-compact-input locale-date-display-field"
                              value={draft.entryDate}
                              max={dateMax}
                              onChange={(next) => setDraft((d) => ({ ...d, entryDate: next }))}
                              onBlur={handleDraftBlur}
                            />
                          </label>
                        </div>
                        <label className="finance-compact-field">
                          <span>Bank</span>
                          <input
                            type="text"
                            className="finance-compact-input"
                            placeholder="Bank…"
                            value={draft.bank}
                            onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
                            onBlur={handleDraftBlur}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                <div className="finance-compact-totals">
                  <div className="finance-compact-total finance-compact-total-debt">
                    <span>Debt spent</span>
                    <strong>{formatAmount(debtTotalAmount)}</strong>
                  </div>
                  <div className="finance-compact-total finance-compact-total-non-debt">
                    <span>Non debt spend</span>
                    <strong>{formatAmount(nonDebtTotalAmount)}</strong>
                  </div>
                  <div className="finance-compact-total finance-compact-total-spending">
                    <span>Total spent</span>
                    <strong>{formatAmount(totalAmount)}</strong>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {lots.length === 0 && (
              <p className="spending-devis-link-hint">
                Lots and estimates come from the Devis table — add a line there first.
              </p>
            )}
            <table className="spending-table">
              <thead>
                <tr>
                  <th className="spending-col-date">
                    Payment date <span className="spending-col-optional">(optional)</span>
                  </th>
                  <th>Description</th>
                  <th className="spending-col-bank">Bank</th>
                  <th className="spending-col-paid">Paid</th>
                  <th className="spending-col-debt-paid">Debt</th>
                  <th className="spending-col-amount">Amount</th>
                  <th className="spending-col-lot" aria-label="Lot" />
                  <th className="spending-col-actions" aria-label="Actions" />
                </tr>
              </thead>
              {lots.map((lot, index) => {
                const lotEntries = sortEntriesByDate(entries.filter((e) => e.lotId === lot.id));
                const spent = lotSpentTotal(entries, lot.id);
                return (
                  <tbody key={lot.id} className={`spending-lot-group spending-lot-group--${index % 6}`}>
                    <SpendingLotEstimateRow lot={lot} colorIndex={index} />
                    {lotEntries.map((entry) => renderSpendingRow(spendingRowProps(entry)))}
                    <SpendingLotDraftRow
                      lotId={lot.id}
                      dateMax={dateMax}
                      onCreate={createEntryFromLotDraft}
                      colHandlers={(col) => (e) => onSpendingCellKeyDown(e, col)}
                    />
                    <SpendingLotSubtotalRow lot={lot} spent={spent} colorIndex={index} />
                  </tbody>
                );
              })}
              {(uncategorizedEntries.length > 0 || lots.length === 0) && (
                <tbody className="spending-lot-group spending-lot-uncategorized">
                  {lots.length > 0 && (
                    <tr className="spending-lot-section-label">
                      <td colSpan={8}>Uncategorized spending</td>
                    </tr>
                  )}
                  {uncategorizedEntries.length > 0 && lots.length > 0 && (
                    <tr className="spending-lot-migrate-row">
                      <td colSpan={8}>
                        <SpendingLotMigrateBar
                          count={uncategorizedEntries.length}
                          lots={lots}
                          disabled={saving}
                          onAssignAll={assignAllUncategorizedToLot}
                        />
                      </td>
                    </tr>
                  )}
                  {uncategorizedEntries.map((entry) => renderSpendingRow(spendingRowProps(entry)))}
                  <SpendingLotDraftRow
                    lotId={null}
                    dateMax={dateMax}
                    onCreate={createEntryFromLotDraft}
                    colHandlers={(col) => (e) => onSpendingCellKeyDown(e, col)}
                  />
                </tbody>
              )}
              <tbody>
                <tr className="spending-row-total spending-row-total-debt">
                  <td colSpan={5}>Debt spent</td>
                  <td className="spending-col-amount">{formatAmount(debtTotalAmount)}</td>
                  <td className="spending-col-lot" />
                  <td className="spending-col-actions" />
                </tr>
                <tr className="spending-row-total spending-row-total-non-debt">
                  <td colSpan={5}>Non debt spend</td>
                  <td className="spending-col-amount">{formatAmount(nonDebtTotalAmount)}</td>
                  <td className="spending-col-lot" />
                  <td className="spending-col-actions" />
                </tr>
                <tr className="spending-row-total">
                  <td colSpan={5}>Total spent</td>
                  <td className="spending-col-amount">{formatAmount(totalAmount)}</td>
                  <td className="spending-col-lot" />
                  <td className="spending-col-actions" />
                </tr>
              </tbody>
            </table>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpendingRow(props: {
  compact?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  entry: SpendingEntryResponse;
  dateMax: string;
  lots?: SpendingLotResponse[];
  showLotAssign?: boolean;
  onAssignLot?: (lotId: number) => void;
  onCommit: (patch: {
    entryDate?: string;
    description?: string;
    bank?: string;
    amount?: number;
  }) => void;
  onPaidChange: (paid: boolean) => void;
  onDebtPaidChange: (debtPaid: boolean) => void;
  onDelete: () => void;
}) {
  const [entryDate, setEntryDate] = useState(props.entry.entryDate);
  const [description, setDescription] = useState(props.entry.description);
  const [bank, setBank] = useState(props.entry.bank);
  const [amount, setAmount] = useState(formatAmountInput(props.entry.amount));
  const [paid, setPaid] = useState(props.entry.paid);
  const [debtPaid, setDebtPaid] = useState(props.entry.debtPaid);
  const rowRef = useRef<HTMLDivElement>(null);
  const entryDateRef = useRef(entryDate);
  const descriptionRef = useRef(description);
  const bankRef = useRef(bank);
  const amountRef = useRef(amount);
  entryDateRef.current = entryDate;
  descriptionRef.current = description;
  bankRef.current = bank;
  amountRef.current = amount;

  useEffect(() => {
    setEntryDate(props.entry.entryDate);
    setDescription(props.entry.description);
    setBank(props.entry.bank);
    setAmount(formatAmountInput(props.entry.amount));
    setPaid(props.entry.paid);
    setDebtPaid(props.entry.debtPaid);
  }, [
    props.entry.entryDate,
    props.entry.description,
    props.entry.bank,
    props.entry.amount,
    props.entry.paid,
    props.entry.debtPaid
  ]);

  const unpaidClass = paid ? '' : ' finance-compact-unpaid';
  const tableUnpaidClass = paid ? '' : ' spending-row-unpaid';

  const commitAll = () => {
    const resolvedDate = resolveEntryDate(entryDateRef.current);
    const dateChanged = resolvedDate !== props.entry.entryDate;
    const descChanged = descriptionRef.current !== props.entry.description;
    const bankChanged = bankRef.current !== props.entry.bank;
    const parsed = parseAmount(amountRef.current);
    const prevParsed = props.entry.amount;
    const amountChanged = parsed !== null && parsed !== prevParsed;

    const patch: {
      entryDate?: string;
      description?: string;
      bank?: string;
      amount?: number;
    } = {};

    if (dateChanged) patch.entryDate = resolvedDate;
    if (descChanged) patch.description = descriptionRef.current;
    if (bankChanged) patch.bank = bankRef.current;
    if (amountChanged && parsed !== null) patch.amount = parsed;

    if (Object.keys(patch).length > 0) {
      props.onCommit(patch);
    }
  };

  const collapseCompact = useCallback(() => {
    commitAll();
    props.onExpandedChange?.(false);
  }, [props]);

  const handleCompactBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    collapseCompact();
  };

  useEffect(() => {
    if (!props.compact || !props.expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rowRef.current?.contains(e.target as Node)) return;
      collapseCompact();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [props.compact, props.expanded, collapseCompact]);

  const commitDate = (nextDate: string) => {
    setEntryDate(nextDate);
    entryDateRef.current = nextDate;
    const resolved = resolveEntryDate(nextDate);
    if (resolved !== props.entry.entryDate) {
      props.onCommit({ entryDate: resolved });
    }
  };

  const deleteButton = (
    <button
      type="button"
      className="spending-row-delete-btn"
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onDelete}
      title="Delete line"
      aria-label="Delete line"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 8a1 1 0 001 .9h4.4a1 1 0 001-.9L11 4" />
      </svg>
    </button>
  );

  const paidCheckbox = (
    <input
      type="checkbox"
      className="spending-paid-checkbox"
      checked={paid}
      aria-label="Paid"
      title={paid ? 'Mark as unpaid' : 'Mark as paid'}
      onMouseDown={(e) => e.preventDefault()}
      onChange={(e) => {
        const nextPaid = e.target.checked;
        setPaid(nextPaid);
        props.onPaidChange(nextPaid);
      }}
    />
  );

  const debtPaidCheckbox = (
    <input
      type="checkbox"
      className="spending-debt-paid-checkbox"
      checked={debtPaid}
      aria-label="Debt"
      title={debtPaid ? 'Mark as not paid via debt' : 'Mark as paid via debt'}
      onMouseDown={(e) => e.preventDefault()}
      onChange={(e) => {
        const nextDebtPaid = e.target.checked;
        setDebtPaid(nextDebtPaid);
        props.onDebtPaidChange(nextDebtPaid);
      }}
    />
  );

  if (props.compact) {
    const summaryAmount =
      amount.trim() || (props.entry.amount === 0 ? '' : formatAmount(props.entry.amount));
    const metaParts = [
      formatLocaleDateMedium(entryDate),
      bank.trim() || null
    ].filter(Boolean);

    return (
      <div
        ref={rowRef}
        className={`finance-compact-row finance-compact-spending${unpaidClass}${
          props.expanded ? ' finance-compact-row-expanded' : ''
        }`}
      >
        <div className="finance-compact-header">
          <button
            type="button"
            className="finance-compact-toggle"
            onClick={() => props.onExpandedChange?.(!props.expanded)}
            aria-expanded={props.expanded}
          >
            <span className="finance-compact-primary">
              <span className="finance-compact-title">
                {description.trim() || 'Spending line'}
              </span>
              <span className="finance-compact-amount">{summaryAmount || '—'}</span>
            </span>
            <span className="finance-compact-meta">{metaParts.join(' · ')}</span>
          </button>
        </div>
        {props.expanded && (
          <div className="finance-compact-details">
            <div className="finance-compact-check-row">
              <label className="finance-compact-check-field">
                <span>Paid</span>
                {paidCheckbox}
              </label>
              <label className="finance-compact-check-field">
                <span>Debt</span>
                {debtPaidCheckbox}
              </label>
            </div>
            <label className="finance-compact-field">
              <span>Description</span>
              <input
                type="text"
                className="finance-compact-input"
                value={description}
                onChange={(e) => {
                  const next = e.target.value;
                  setDescription(next);
                  descriptionRef.current = next;
                }}
                onBlur={handleCompactBlur}
              />
            </label>
            <div className="finance-compact-field-row">
              <label className="finance-compact-field">
                <span>Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="finance-compact-input finance-compact-input-amount"
                  value={amount}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAmount(next);
                    amountRef.current = next;
                  }}
                  onBlur={handleCompactBlur}
                />
              </label>
              <label className="finance-compact-field">
                <span>Date</span>
                <LocaleDateInput
                  displayClassName="finance-compact-input locale-date-display-field"
                  value={entryDate}
                  max={props.dateMax}
                  onChange={commitDate}
                  onBlur={handleCompactBlur}
                />
              </label>
            </div>
            <label className="finance-compact-field">
              <span>Bank</span>
              <input
                type="text"
                className="finance-compact-input"
                placeholder="Bank…"
                value={bank}
                onChange={(e) => {
                  const next = e.target.value;
                  setBank(next);
                  bankRef.current = next;
                }}
                onBlur={handleCompactBlur}
              />
            </label>
            {props.showLotAssign && props.lots && props.onAssignLot && (
              <div className="finance-compact-field finance-compact-field-inline">
                <span>Lot</span>
                <SpendingLotAssignCaret
                  lots={props.lots}
                  currentLotId={props.entry.lotId}
                  onAssign={props.onAssignLot}
                />
              </div>
            )}
            <div className="finance-compact-details-actions">{deleteButton}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <tr className={`spending-row${tableUnpaidClass}`}>
      <td className="spending-col-date" data-label="Payment date">
        <LocaleDateInput
          displayClassName="spending-input spending-input-date locale-date-display-field"
          value={entryDate}
          max={props.dateMax}
          onChange={commitDate}
          onBlur={commitAll}
          onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.DATE)}
          title="Optional — defaults to today"
        />
      </td>
      <td data-label="Description">
        <input
          type="text"
          className="spending-input"
          value={description}
          onChange={(e) => {
            const next = e.target.value;
            setDescription(next);
            descriptionRef.current = next;
          }}
          onBlur={commitAll}
          onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.DESCRIPTION)}
        />
      </td>
      <td className="spending-col-bank" data-label="Bank">
        <input
          type="text"
          className="spending-input"
          placeholder="Bank…"
          value={bank}
          onChange={(e) => {
            const next = e.target.value;
            setBank(next);
            bankRef.current = next;
          }}
          onBlur={commitAll}
          onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.BANK)}
        />
      </td>
      <td className="spending-col-paid" data-label="Paid">
        {paidCheckbox}
      </td>
      <td className="spending-col-debt-paid" data-label="Debt">
        {debtPaidCheckbox}
      </td>
      <td className="spending-col-amount" data-label="Amount">
        <input
          type="text"
          inputMode="decimal"
          className="spending-input spending-input-amount"
          value={amount}
          onChange={(e) => {
            const next = e.target.value;
            setAmount(next);
            amountRef.current = next;
          }}
          onBlur={commitAll}
          onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.AMOUNT)}
        />
      </td>
      <td className="spending-col-lot" data-label="Lot">
        {props.showLotAssign && props.lots && props.onAssignLot && (
          <SpendingLotAssignCaret
            lots={props.lots}
            currentLotId={props.entry.lotId}
            onAssign={props.onAssignLot}
          />
        )}
      </td>
      <td className="spending-col-actions">
        {deleteButton}
      </td>
    </tr>
  );
}
