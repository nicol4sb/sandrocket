import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type {
  ImportSpendingResponse,
  ListSpendingResponse,
  SpendingEntryResponse
} from '@sandrocket/contracts';
import { useIsMobile } from './hooks/useMediaQuery';
import { sortEntriesByDate } from './financeSort';

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
  entryDate: string;
  description: string;
  bank: string;
  amount: number;
  paid: boolean;
}

const SPENDING_HEADERS = ['Payment date', 'Description', 'Bank', 'Paid', 'Amount'] as const;

const SPENDING_COL = {
  DATE: 0,
  DESCRIPTION: 1,
  BANK: 2,
  PAID: 3,
  AMOUNT: 4
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

function paidTotal(entries: SpendingEntryResponse[]): number {
  return entries.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);
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
  const frMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
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

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function rowHasContent(description: string, amountStr: string): boolean {
  return description.trim().length > 0 || (parseAmount(amountStr) ?? 0) !== 0;
}

function isFocusMovingWithinRow(e: React.FocusEvent<HTMLElement>): boolean {
  const row = e.currentTarget.closest('tr, .finance-mobile-card');
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
    if (first.includes('payment') || first.includes('date')) return i;
  }
  return -1;
}

function spendingHeaderHasPaid(rows: unknown[][], headerIdx: number): boolean {
  if (headerIdx < 0) return false;
  const header = rows[headerIdx] ?? [];
  return header.some((cell) => String(cell ?? '').trim().toLowerCase().includes('paid'));
}

function parseSpendingExcel(buffer: ArrayBuffer): ParsedSpendingRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const headerIdx = findHeaderRowIndex(rows);
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  const hasPaidColumn = spendingHeaderHasPaid(rows, headerIdx);
  const parsed: ParsedSpendingRow[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const dateRaw = row[0];
    const description = String(row[1] ?? '').trim();
    const bank = String(row[2] ?? '').trim();
    const paidRaw = hasPaidColumn ? row[3] : undefined;
    const amountRaw = hasPaidColumn ? row[4] : row[3];

    if (isTotalRow(description, bank, amountRaw)) continue;
    if (!description && !bank && (amountRaw === '' || amountRaw == null)) continue;

    const amount = parseExcelAmount(amountRaw);
    if (amount === null) continue;
    if (!description && amount === 0) continue;

    parsed.push({
      entryDate: parseExcelDate(dateRaw),
      description,
      bank,
      amount,
      paid: hasPaidColumn ? parsePaidValue(paidRaw) : true
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
  const rowIndex = dataRows.indexOf(row);
  if (rowIndex === -1) return;

  const nextRowIndex = e.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;
  if (nextRowIndex < 0 || nextRowIndex >= dataRows.length) return;

  const nextInput = dataRows[nextRowIndex]?.cells[colIndex]?.querySelector<HTMLInputElement>(
    '.spending-input, .spending-paid-checkbox'
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
  totalAmount: number,
  projectName: string
) {
  const sortedEntries = sortEntriesByDate(entries);
  const total = paidTotal(sortedEntries);
  const rows: (string | number)[][] = [
    [...SPENDING_HEADERS],
    ...sortedEntries.map((e) => [e.entryDate, e.description, e.bank, e.paid ? 'Yes' : 'No', e.amount]),
    ['', '', '', 'Total', total]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 8 }, { wch: 14 }];
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
  const [draft, setDraft] = useState<DraftRow>(newDraftRow);
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
    amountStr: string
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
            paid: row.paid
          }))
        })
      });
      if (!res.ok) {
        setImportError('Import failed. Check the file format.');
        return;
      }
      const data = (await res.json()) as ImportSpendingResponse;
      setEntries(sortEntriesByDate(data.entries));
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

  const handleDraftBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    const { entryDate, description, bank, amount } = draftRef.current;
    if (rowHasContent(description, amount)) {
      void createEntry(entryDate, description, bank, amount);
    }
  };

  const totalAmount = paidTotal(entries);
  const isMobile = useIsMobile();

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
                    exportSpendingToExcel(entries, totalAmount, projectName);
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
              <div className="finance-mobile-list">
                {entries.map((entry) => (
                  <SpendingRow
                    key={entry.id}
                    mobile
                    entry={entry}
                    dateMax={dateMax}
                    onCommit={(patch) => void patchEntry(entry, patch)}
                    onPaidChange={(paid) => void setEntryPaid(entry, paid)}
                    onDelete={() => void deleteEntry(entry.id)}
                  />
                ))}
                <div className="finance-mobile-card finance-mobile-card-draft">
                  <p className="finance-mobile-draft-hint">New spending line</p>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Payment date</span>
                    <input
                      type="date"
                      className="finance-mobile-input finance-mobile-input-date"
                      value={draft.entryDate}
                      max={dateMax}
                      onChange={(e) => setDraft((d) => ({ ...d, entryDate: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Description</span>
                    <input
                      type="text"
                      className="finance-mobile-input"
                      placeholder="Add a line…"
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Bank</span>
                    <input
                      type="text"
                      className="finance-mobile-input"
                      placeholder="Bank…"
                      value={draft.bank}
                      onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Amount</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="finance-mobile-input finance-mobile-input-amount"
                      placeholder="0"
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                </div>
                <div className="finance-mobile-total finance-mobile-total-spending">
                  <span>Total (paid)</span>
                  <strong>{formatAmount(totalAmount)}</strong>
                </div>
              </div>
            ) : (
            <table className="spending-table">
              <thead>
                <tr>
                  <th className="spending-col-date">
                    Payment date <span className="spending-col-optional">(optional)</span>
                  </th>
                  <th>Description</th>
                  <th className="spending-col-bank">Bank</th>
                  <th className="spending-col-paid">Paid</th>
                  <th className="spending-col-amount">Amount</th>
                  <th className="spending-col-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <SpendingRow
                    key={entry.id}
                    entry={entry}
                    dateMax={dateMax}
                    onCommit={(patch) => void patchEntry(entry, patch)}
                    onPaidChange={(paid) => void setEntryPaid(entry, paid)}
                    onDelete={() => void deleteEntry(entry.id)}
                  />
                ))}
                <tr className="spending-row-draft">
                  <td className="spending-col-date" data-label="Payment date">
                    <input
                      type="date"
                      className="spending-input spending-input-date"
                      value={draft.entryDate}
                      max={dateMax}
                      onChange={(e) => setDraft((d) => ({ ...d, entryDate: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.DATE)}
                      title={`Optional — defaults to today (up to ${formatDisplayDate(dateMax)})`}
                    />
                  </td>
                  <td data-label="Description">
                    <input
                      type="text"
                      className="spending-input"
                      placeholder="Add a line…"
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.DESCRIPTION)}
                    />
                  </td>
                  <td className="spending-col-bank" data-label="Bank">
                    <input
                      type="text"
                      className="spending-input"
                      placeholder="Bank…"
                      value={draft.bank}
                      onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.BANK)}
                    />
                  </td>
                  <td className="spending-col-paid" data-label="Paid" />
                  <td className="spending-col-amount" data-label="Amount">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="spending-input spending-input-amount"
                      placeholder="0"
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSpendingCellKeyDown(e, SPENDING_COL.AMOUNT)}
                    />
                  </td>
                  <td className="spending-col-actions" />
                </tr>
                <tr className="spending-row-total">
                  <td colSpan={4}>Total (paid)</td>
                  <td className="spending-col-amount">{formatAmount(totalAmount)}</td>
                  <td className="spending-col-actions" />
                </tr>
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpendingRow(props: {
  mobile?: boolean;
  entry: SpendingEntryResponse;
  dateMax: string;
  onCommit: (patch: {
    entryDate?: string;
    description?: string;
    bank?: string;
    amount?: number;
  }) => void;
  onPaidChange: (paid: boolean) => void;
  onDelete: () => void;
}) {
  const [entryDate, setEntryDate] = useState(props.entry.entryDate);
  const [description, setDescription] = useState(props.entry.description);
  const [bank, setBank] = useState(props.entry.bank);
  const [amount, setAmount] = useState(formatAmountInput(props.entry.amount));
  const [paid, setPaid] = useState(props.entry.paid);
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
  }, [props.entry.entryDate, props.entry.description, props.entry.bank, props.entry.amount, props.entry.paid]);

  const unpaidClass = paid ? '' : ' spending-row-unpaid';

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
      className="finance-mobile-delete-btn spending-row-delete-btn"
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

  if (props.mobile) {
    return (
      <div className={`finance-mobile-card${unpaidClass ? ' finance-mobile-card-unpaid' : ''}`}>
        <div className="finance-mobile-card-top">
          <span className="finance-mobile-card-title">
            {description.trim() || 'Spending line'}
          </span>
          {deleteButton}
        </div>
        <label className="finance-mobile-field finance-mobile-field-inline">
          <span className="finance-mobile-label">Paid</span>
          {paidCheckbox}
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Payment date</span>
          <input
            type="date"
            className="finance-mobile-input finance-mobile-input-date"
            value={entryDate}
            max={props.dateMax}
            onChange={(e) => commitDate(e.target.value)}
            onBlur={commitAll}
          />
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Description</span>
          <input
            type="text"
            className="finance-mobile-input"
            value={description}
            onChange={(e) => {
              const next = e.target.value;
              setDescription(next);
              descriptionRef.current = next;
            }}
            onBlur={commitAll}
          />
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Bank</span>
          <input
            type="text"
            className="finance-mobile-input"
            placeholder="Bank…"
            value={bank}
            onChange={(e) => {
              const next = e.target.value;
              setBank(next);
              bankRef.current = next;
            }}
            onBlur={commitAll}
          />
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Amount</span>
          <input
            type="text"
            inputMode="decimal"
            className="finance-mobile-input finance-mobile-input-amount"
            value={amount}
            onChange={(e) => {
              const next = e.target.value;
              setAmount(next);
              amountRef.current = next;
            }}
            onBlur={commitAll}
          />
        </label>
      </div>
    );
  }

  return (
    <tr className={`spending-row${unpaidClass}`}>
      <td className="spending-col-date" data-label="Payment date">
        <input
          type="date"
          className="spending-input spending-input-date"
          value={entryDate}
          max={props.dateMax}
          onChange={(e) => commitDate(e.target.value)}
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
      <td className="spending-col-actions">
        {deleteButton}
      </td>
    </tr>
  );
}
