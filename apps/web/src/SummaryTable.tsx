import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type {
  ImportSummaryResponse,
  ListSummaryResponse,
  SummaryEntryResponse
} from '@sandrocket/contracts';
import { useIsMobile } from './hooks/useMediaQuery';

interface SummaryTableProps {
  projectId: number;
  projectName: string;
  baseUrl: string;
}

interface DraftRow {
  lot: string;
  fichierRetenu: string;
  entryDate: string;
  amount: string;
}

interface ParsedDevisRow {
  lot: string;
  fichierRetenu: string;
  entryDate: string;
  amount: number;
}

const DEVIS_HEADERS = ['Lot', 'Fichier retenu', 'Date du devis', 'TTC (€)'] as const;

const SUMMARY_COL = {
  LOT: 0,
  FICHIER: 1,
  DATE: 2,
  AMOUNT: 3
} as const;

function todayIso(): string {
  return toIsoDate(new Date());
}

function resolveEntryDate(value: string): string {
  const trimmed = value.trim();
  return trimmed || todayIso();
}

function newDraftRow(): DraftRow {
  return { lot: '', fichierRetenu: '', entryDate: todayIso(), amount: '' };
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

function rowHasContent(lot: string, amountStr: string): boolean {
  return lot.trim().length > 0 || (parseAmount(amountStr) ?? 0) !== 0;
}

function isFocusMovingWithinRow(e: React.FocusEvent<HTMLElement>): boolean {
  const row = e.currentTarget.closest('tr, .finance-mobile-card');
  const next = e.relatedTarget;
  if (!row || !(next instanceof Node)) return false;
  return row.contains(next);
}

function isTotalRow(lot: string, dateCell: unknown, amountCell: unknown): boolean {
  const dateStr = String(dateCell ?? '').trim().toLowerCase();
  const lotStr = lot.trim().toLowerCase();
  return /total/.test(lotStr) || /total/.test(dateStr) || /total/.test(String(amountCell ?? ''));
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const first = String(rows[i]?.[0] ?? '').trim().toLowerCase();
    if (first === 'lot' || first.includes('lot')) return i;
  }
  return -1;
}

function parseDevisExcel(buffer: ArrayBuffer): ParsedDevisRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const headerIdx = findHeaderRowIndex(rows);
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  const parsed: ParsedDevisRow[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const lot = String(row[0] ?? '').trim();
    const fichierRetenu = String(row[1] ?? '').trim();
    const dateRaw = row[2];
    const amountRaw = row[3];

    if (isTotalRow(lot, dateRaw, amountRaw)) continue;
    if (!lot && !fichierRetenu && (amountRaw === '' || amountRaw == null)) continue;

    const amount = parseExcelAmount(amountRaw);
    if (amount === null) continue;
    if (!lot && amount === 0) continue;

    parsed.push({
      lot,
      fichierRetenu,
      entryDate: parseExcelDate(dateRaw),
      amount
    });
  }

  return parsed;
}

function navigateSummaryCellVertically(
  e: React.KeyboardEvent<HTMLInputElement>,
  colIndex: number
): void {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

  const row = e.currentTarget.closest('tr');
  const tbody = row?.closest('tbody');
  if (!row || !tbody) return;

  const dataRows = Array.from(
    tbody.querySelectorAll<HTMLTableRowElement>('tr.summary-row, tr.summary-row-draft')
  );
  const rowIndex = dataRows.indexOf(row);
  if (rowIndex === -1) return;

  const nextRowIndex = e.key === 'ArrowUp' ? rowIndex - 1 : rowIndex + 1;
  if (nextRowIndex < 0 || nextRowIndex >= dataRows.length) return;

  const nextInput = dataRows[nextRowIndex]?.cells[colIndex]?.querySelector<HTMLInputElement>(
    '.summary-input'
  );
  if (!nextInput) return;

  e.preventDefault();
  nextInput.focus();
  if (nextInput.type === 'text') {
    nextInput.select();
  }
}

function onSummaryCellKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  colIndex: number
): void {
  if (e.key === 'Enter') {
    e.currentTarget.blur();
    return;
  }
  navigateSummaryCellVertically(e, colIndex);
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim() || 'project';
}

function exportSummaryToExcel(
  entries: SummaryEntryResponse[],
  totalAmount: number,
  projectName: string
) {
  const rows: (string | number)[][] = [
    [...DEVIS_HEADERS],
    ...entries.map((e) => [
      e.lot,
      e.fichierRetenu,
      formatDisplayDate(e.entryDate),
      e.amount
    ]),
    ['', '', 'Total TTC', totalAmount]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 42 }, { wch: 28 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Devis');
  XLSX.writeFile(workbook, `${safeFilename(projectName)}-devis.xlsx`);
}

function SummaryCaret({ open }: { open: boolean }) {
  return (
    <svg
      className={`summary-caret${open ? ' summary-caret-open' : ''}`}
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

export function SummaryTable({ projectId, projectName, baseUrl }: SummaryTableProps) {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<SummaryEntryResponse[]>([]);
  const [draft, setDraft] = useState<DraftRow>(newDraftRow);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const fileInputRef = useRef<HTMLInputElement>(null);
  draftRef.current = draft;
  const dateMax = todayIso();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/summary`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as ListSummaryResponse;
      setVisible(data.visible);
      setEntries(
        [...data.entries].sort((a, b) => a.position - b.position || a.id - b.id)
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [baseUrl, projectId]);

  useEffect(() => {
    setLoading(true);
    setDraft(newDraftRow());
    fetchSummary();
  }, [fetchSummary]);

  const setVisibility = async (nextVisible: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/summary/visibility`, {
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
    lot: string,
    fichierRetenu: string,
    entryDate: string,
    amountStr: string
  ) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;
    if (!rowHasContent(lot, amountStr)) return;

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot: lot.trim(),
          fichierRetenu: fichierRetenu.trim(),
          amount,
          ...(entryDate.trim() ? { entryDate: entryDate.trim() } : {})
        })
      });
      if (res.ok) {
        setDraft(newDraftRow());
        await fetchSummary();
      }
    } finally {
      setSaving(false);
    }
  };

  const importEntries = async (parsed: ParsedDevisRow[]) => {
    if (parsed.length === 0) {
      setImportError('No data rows found in the Excel file.');
      return;
    }

    if (entries.length > 0) {
      const ok = window.confirm(
        'Import will replace all existing devis lines with the Excel file. Continue?'
      );
      if (!ok) return;
    }

    setSaving(true);
    setImportError(null);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/summary/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace: true,
          entries: parsed.map((row) => ({
            lot: row.lot,
            fichierRetenu: row.fichierRetenu,
            amount: row.amount,
            entryDate: row.entryDate
          }))
        })
      });
      if (!res.ok) {
        setImportError('Import failed. Check the file format.');
        return;
      }
      const data = (await res.json()) as ImportSummaryResponse;
      setEntries([...data.entries].sort((a, b) => a.position - b.position || a.id - b.id));
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
      const parsed = parseDevisExcel(buffer);
      await importEntries(parsed);
    } catch {
      setImportError('Could not read the Excel file.');
    }
  };

  const deleteEntry = async (entryId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/summary/${entryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchSummary();
      }
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (
    entry: SummaryEntryResponse,
    lot: string,
    fichierRetenu: string,
    entryDate: string,
    amountStr: string
  ) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/summary/${entry.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot: lot.trim(),
          fichierRetenu: fichierRetenu.trim(),
          amount,
          entryDate: resolveEntryDate(entryDate)
        })
      });
      if (res.ok) {
        await fetchSummary();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDraftBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    const { lot, fichierRetenu, entryDate, amount } = draftRef.current;
    if (rowHasContent(lot, amount)) {
      void createEntry(lot, fichierRetenu, entryDate, amount);
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  const isMobile = useIsMobile();

  if (loading) {
    return null;
  }

  const toggleVisibility = () => {
    void setVisibility(!visible);
  };

  return (
    <div id="board-devis" className="summary-section board-section">
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
      <div className={`summary-accordion${visible ? ' summary-accordion-open' : ''}`}>
        <div className="summary-accordion-header">
          <button
            type="button"
            className="summary-toggle"
            onClick={toggleVisibility}
            disabled={saving}
            aria-expanded={visible}
            title={visible ? 'Hide devis' : 'Show devis'}
          >
            <span className="summary-toggle-icon">D</span>
            <span className="summary-toggle-label">Devis</span>
            {!visible && entries.length > 0 && (
              <span className="summary-toggle-summary">{formatAmount(totalAmount)}</span>
            )}
          </button>
          <div className="summary-header-actions">
            {visible && (
              <>
                <button
                  type="button"
                  className="summary-import-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={saving}
                  title="Import devis from Excel"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 6v3a1 1 0 001 1h10a1 1 0 001-1V6" />
                    <path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M2 13h10" />
                  </svg>
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  className="summary-export-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSummaryToExcel(entries, totalAmount, projectName);
                  }}
                  disabled={entries.length === 0}
                  title="Export devis to Excel"
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
              className="summary-caret-btn"
              onClick={toggleVisibility}
              disabled={saving}
              aria-expanded={visible}
              aria-label={visible ? 'Hide devis' : 'Show devis'}
              title={visible ? 'Hide devis' : 'Show devis'}
            >
              <SummaryCaret open={visible} />
            </button>
          </div>
        </div>

        {visible && (
          <div className="summary-table-wrap">
            {importError && <p className="summary-import-error">{importError}</p>}
            {isMobile ? (
              <div className="finance-mobile-list">
                {entries.map((entry) => (
                  <SummaryRow
                    key={entry.id}
                    mobile
                    entry={entry}
                    dateMax={dateMax}
                    onCommit={(lot, fichierRetenu, entryDate, amount) =>
                      void updateEntry(entry, lot, fichierRetenu, entryDate, amount)
                    }
                    onDelete={() => void deleteEntry(entry.id)}
                  />
                ))}
                <div className="finance-mobile-card finance-mobile-card-draft">
                  <p className="finance-mobile-draft-hint">New devis line</p>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Lot</span>
                    <input
                      type="text"
                      className="finance-mobile-input"
                      placeholder="Add a line…"
                      value={draft.lot}
                      onChange={(e) => setDraft((d) => ({ ...d, lot: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Fichier retenu</span>
                    <input
                      type="text"
                      className="finance-mobile-input"
                      placeholder="Fichier…"
                      value={draft.fichierRetenu}
                      onChange={(e) => setDraft((d) => ({ ...d, fichierRetenu: e.target.value }))}
                      onBlur={handleDraftBlur}
                    />
                  </label>
                  <label className="finance-mobile-field">
                    <span className="finance-mobile-label">Date du devis</span>
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
                    <span className="finance-mobile-label">TTC (€)</span>
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
                <div className="finance-mobile-total finance-mobile-total-devis">
                  <span>Total TTC</span>
                  <strong>{formatAmount(totalAmount)}</strong>
                </div>
              </div>
            ) : (
            <table className="summary-table">
              <thead>
                <tr>
                  <th className="summary-col-lot">Lot</th>
                  <th className="summary-col-fichier">Fichier retenu</th>
                  <th className="summary-col-date">Date du devis</th>
                  <th className="summary-col-amount">TTC (€)</th>
                  <th className="summary-col-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <SummaryRow
                    key={entry.id}
                    entry={entry}
                    dateMax={dateMax}
                    onCommit={(lot, fichierRetenu, entryDate, amount) =>
                      void updateEntry(entry, lot, fichierRetenu, entryDate, amount)
                    }
                    onDelete={() => void deleteEntry(entry.id)}
                  />
                ))}
                <tr className="summary-row-draft">
                  <td className="summary-col-lot" data-label="Lot">
                    <input
                      type="text"
                      className="summary-input"
                      placeholder="Add a line…"
                      value={draft.lot}
                      onChange={(e) => setDraft((d) => ({ ...d, lot: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.LOT)}
                    />
                  </td>
                  <td className="summary-col-fichier" data-label="Fichier retenu">
                    <input
                      type="text"
                      className="summary-input"
                      placeholder="Fichier…"
                      value={draft.fichierRetenu}
                      onChange={(e) => setDraft((d) => ({ ...d, fichierRetenu: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.FICHIER)}
                    />
                  </td>
                  <td className="summary-col-date" data-label="Date du devis">
                    <input
                      type="date"
                      className="summary-input summary-input-date"
                      value={draft.entryDate}
                      max={dateMax}
                      onChange={(e) => setDraft((d) => ({ ...d, entryDate: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DATE)}
                      title={`Defaults to today (up to ${formatDisplayDate(dateMax)})`}
                    />
                  </td>
                  <td className="summary-col-amount" data-label="TTC (€)">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="summary-input summary-input-amount"
                      placeholder="0"
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.AMOUNT)}
                    />
                  </td>
                  <td className="summary-col-actions" />
                </tr>
                <tr className="summary-row-total">
                  <td colSpan={3}>Total TTC</td>
                  <td className="summary-col-amount">{formatAmount(totalAmount)}</td>
                  <td className="summary-col-actions" />
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

function SummaryRow(props: {
  mobile?: boolean;
  entry: SummaryEntryResponse;
  dateMax: string;
  onCommit: (lot: string, fichierRetenu: string, entryDate: string, amount: string) => void;
  onDelete: () => void;
}) {
  const [lot, setLot] = useState(props.entry.lot);
  const [fichierRetenu, setFichierRetenu] = useState(props.entry.fichierRetenu);
  const [entryDate, setEntryDate] = useState(props.entry.entryDate);
  const [amount, setAmount] = useState(formatAmountInput(props.entry.amount));
  const lotRef = useRef(lot);
  const fichierRetenuRef = useRef(fichierRetenu);
  const entryDateRef = useRef(entryDate);
  const amountRef = useRef(amount);
  lotRef.current = lot;
  fichierRetenuRef.current = fichierRetenu;
  entryDateRef.current = entryDate;
  amountRef.current = amount;

  useEffect(() => {
    setLot(props.entry.lot);
    setFichierRetenu(props.entry.fichierRetenu);
    setEntryDate(props.entry.entryDate);
    setAmount(formatAmountInput(props.entry.amount));
  }, [props.entry.lot, props.entry.fichierRetenu, props.entry.entryDate, props.entry.amount]);

  const commitAll = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    const resolvedDate = resolveEntryDate(entryDateRef.current);
    const lotChanged = lotRef.current !== props.entry.lot;
    const fichierChanged = fichierRetenuRef.current !== props.entry.fichierRetenu;
    const dateChanged = resolvedDate !== props.entry.entryDate;
    const parsed = parseAmount(amountRef.current);
    const prevParsed = props.entry.amount;
    const amountChanged = parsed !== null && parsed !== prevParsed;
    if (lotChanged || fichierChanged || dateChanged || amountChanged) {
      props.onCommit(
        lotRef.current,
        fichierRetenuRef.current,
        resolvedDate,
        amountRef.current
      );
    }
  };

  const commitDate = (nextDate: string) => {
    setEntryDate(nextDate);
    entryDateRef.current = nextDate;
    const resolved = resolveEntryDate(nextDate);
    if (resolved !== props.entry.entryDate) {
      props.onCommit(lotRef.current, fichierRetenuRef.current, resolved, amountRef.current);
    }
  };

  const deleteButton = (
    <button
      type="button"
      className="finance-mobile-delete-btn summary-row-delete-btn"
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

  if (props.mobile) {
    return (
      <div className="finance-mobile-card">
        <div className="finance-mobile-card-top">
          <span className="finance-mobile-card-title">{lot.trim() || 'Devis line'}</span>
          {deleteButton}
        </div>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Lot</span>
          <input
            type="text"
            className="finance-mobile-input"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            onBlur={commitAll}
          />
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Fichier retenu</span>
          <input
            type="text"
            className="finance-mobile-input"
            value={fichierRetenu}
            onChange={(e) => setFichierRetenu(e.target.value)}
            onBlur={commitAll}
          />
        </label>
        <label className="finance-mobile-field">
          <span className="finance-mobile-label">Date du devis</span>
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
          <span className="finance-mobile-label">TTC (€)</span>
          <input
            type="text"
            inputMode="decimal"
            className="finance-mobile-input finance-mobile-input-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={commitAll}
          />
        </label>
      </div>
    );
  }

  return (
    <tr className="summary-row">
      <td className="summary-col-lot" data-label="Lot">
        <input
          type="text"
          className="summary-input"
          value={lot}
          onChange={(e) => setLot(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.LOT)}
        />
      </td>
      <td className="summary-col-fichier" data-label="Fichier retenu">
        <input
          type="text"
          className="summary-input"
          value={fichierRetenu}
          onChange={(e) => setFichierRetenu(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.FICHIER)}
        />
      </td>
      <td className="summary-col-date" data-label="Date du devis">
        <input
          type="date"
          className="summary-input summary-input-date"
          value={entryDate}
          max={props.dateMax}
          onChange={(e) => commitDate(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DATE)}
        />
      </td>
      <td className="summary-col-amount" data-label="TTC (€)">
        <input
          type="text"
          inputMode="decimal"
          className="summary-input summary-input-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.AMOUNT)}
        />
      </td>
      <td className="summary-col-actions">
        {deleteButton}
      </td>
    </tr>
  );
}
