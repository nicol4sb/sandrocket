import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { ListSummaryResponse, SummaryEntryResponse } from '@sandrocket/contracts';

interface SummaryTableProps {
  projectId: number;
  projectName: string;
  baseUrl: string;
}

interface DraftRow {
  entryDate: string;
  description: string;
  accomptePayeDate: string;
  paiementCompletDate: string;
  amount: string;
}

function todayIso(): string {
  const d = new Date();
  return toIsoDate(d);
}

function resolveEntryDate(value: string): string {
  const trimmed = value.trim();
  return trimmed || todayIso();
}

function normalizeOptionalDate(value: string): string {
  return value.trim();
}

function newDraftRow(): DraftRow {
  return {
    entryDate: todayIso(),
    description: '',
    accomptePayeDate: '',
    paiementCompletDate: '',
    amount: ''
  };
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
  const row = e.currentTarget.closest('tr');
  const next = e.relatedTarget;
  if (!row || !(next instanceof Node)) return false;
  return row.contains(next);
}

const SUMMARY_COL = {
  DATE: 0,
  DESCRIPTION: 1,
  ACCOMPTE: 2,
  PAIEMENT: 3,
  AMOUNT: 4
} as const;

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
    ['Date', 'Description', 'Accompte payé', 'Paiement complet', 'Amount'],
    ...entries.map((e) => [
      e.entryDate,
      e.description,
      e.accomptePayeDate,
      e.paiementCompletDate,
      e.amount
    ]),
    ['', '', '', 'Total', totalAmount]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
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
  const draftRef = useRef(draft);
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
        [...data.entries].sort(
          (a, b) => a.entryDate.localeCompare(b.entryDate) || a.id - b.id
        )
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
    entryDate: string,
    description: string,
    accomptePayeDate: string,
    paiementCompletDate: string,
    amountStr: string
  ) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;
    if (!rowHasContent(description, amountStr)) return;

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount,
          accomptePayeDate: normalizeOptionalDate(accomptePayeDate),
          paiementCompletDate: normalizeOptionalDate(paiementCompletDate),
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
    entryDate: string,
    description: string,
    accomptePayeDate: string,
    paiementCompletDate: string,
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
          description: description.trim(),
          amount,
          entryDate: resolveEntryDate(entryDate),
          accomptePayeDate: normalizeOptionalDate(accomptePayeDate),
          paiementCompletDate: normalizeOptionalDate(paiementCompletDate)
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
    const { entryDate, description, accomptePayeDate, paiementCompletDate, amount } =
      draftRef.current;
    if (rowHasContent(description, amount)) {
      void createEntry(entryDate, description, accomptePayeDate, paiementCompletDate, amount);
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return null;
  }

  const toggleVisibility = () => {
    void setVisibility(!visible);
  };

  return (
    <div className="summary-section">
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
            <table className="summary-table">
              <thead>
                <tr>
                  <th className="summary-col-date">
                    Date <span className="summary-col-optional">(optional)</span>
                  </th>
                  <th>Description</th>
                  <th className="summary-col-pay-date">Accompte payé</th>
                  <th className="summary-col-pay-date">Paiement complet</th>
                  <th className="summary-col-amount">Amount</th>
                  <th className="summary-col-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <SummaryRow
                    key={entry.id}
                    entry={entry}
                    dateMax={dateMax}
                    onCommit={(entryDate, description, accomptePayeDate, paiementCompletDate, amount) =>
                      void updateEntry(
                        entry,
                        entryDate,
                        description,
                        accomptePayeDate,
                        paiementCompletDate,
                        amount
                      )
                    }
                    onDelete={() => void deleteEntry(entry.id)}
                  />
                ))}
                <tr className="summary-row-draft">
                  <td className="summary-col-date">
                    <input
                      type="date"
                      className="summary-input summary-input-date"
                      value={draft.entryDate}
                      max={dateMax}
                      onChange={(e) => setDraft((d) => ({ ...d, entryDate: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DATE)}
                      title={`Optional — defaults to today (up to ${formatDisplayDate(dateMax)})`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="summary-input"
                      placeholder="Add a line…"
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DESCRIPTION)}
                    />
                  </td>
                  <td className="summary-col-pay-date">
                    <input
                      type="date"
                      className="summary-input summary-input-date"
                      value={draft.accomptePayeDate}
                      max={dateMax}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, accomptePayeDate: e.target.value }))
                      }
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.ACCOMPTE)}
                    />
                  </td>
                  <td className="summary-col-pay-date">
                    <input
                      type="date"
                      className="summary-input summary-input-date"
                      value={draft.paiementCompletDate}
                      max={dateMax}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, paiementCompletDate: e.target.value }))
                      }
                      onBlur={handleDraftBlur}
                      onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.PAIEMENT)}
                    />
                  </td>
                  <td className="summary-col-amount">
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
                  <td colSpan={4}>Total</td>
                  <td className="summary-col-amount">{formatAmount(totalAmount)}</td>
                  <td className="summary-col-actions" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow(props: {
  entry: SummaryEntryResponse;
  dateMax: string;
  onCommit: (
    entryDate: string,
    description: string,
    accomptePayeDate: string,
    paiementCompletDate: string,
    amount: string
  ) => void;
  onDelete: () => void;
}) {
  const [entryDate, setEntryDate] = useState(props.entry.entryDate);
  const [description, setDescription] = useState(props.entry.description);
  const [accomptePayeDate, setAccomptePayeDate] = useState(props.entry.accomptePayeDate);
  const [paiementCompletDate, setPaiementCompletDate] = useState(props.entry.paiementCompletDate);
  const [amount, setAmount] = useState(formatAmountInput(props.entry.amount));
  const entryDateRef = useRef(entryDate);
  const descriptionRef = useRef(description);
  const accomptePayeDateRef = useRef(accomptePayeDate);
  const paiementCompletDateRef = useRef(paiementCompletDate);
  const amountRef = useRef(amount);
  entryDateRef.current = entryDate;
  descriptionRef.current = description;
  accomptePayeDateRef.current = accomptePayeDate;
  paiementCompletDateRef.current = paiementCompletDate;
  amountRef.current = amount;

  useEffect(() => {
    setEntryDate(props.entry.entryDate);
    setDescription(props.entry.description);
    setAccomptePayeDate(props.entry.accomptePayeDate);
    setPaiementCompletDate(props.entry.paiementCompletDate);
    setAmount(formatAmountInput(props.entry.amount));
  }, [
    props.entry.entryDate,
    props.entry.description,
    props.entry.accomptePayeDate,
    props.entry.paiementCompletDate,
    props.entry.amount
  ]);

  const commitAll = (e: React.FocusEvent<HTMLElement>) => {
    if (isFocusMovingWithinRow(e)) return;
    const resolvedDate = resolveEntryDate(entryDateRef.current);
    const normalizedAccompte = normalizeOptionalDate(accomptePayeDateRef.current);
    const normalizedPaiement = normalizeOptionalDate(paiementCompletDateRef.current);
    const dateChanged = resolvedDate !== props.entry.entryDate;
    const descChanged = descriptionRef.current !== props.entry.description;
    const accompteChanged = normalizedAccompte !== props.entry.accomptePayeDate;
    const paiementChanged = normalizedPaiement !== props.entry.paiementCompletDate;
    const parsed = parseAmount(amountRef.current);
    const prevParsed = props.entry.amount;
    const amountChanged = parsed !== null && parsed !== prevParsed;
    if (dateChanged || descChanged || accompteChanged || paiementChanged || amountChanged) {
      props.onCommit(
        resolvedDate,
        descriptionRef.current,
        normalizedAccompte,
        normalizedPaiement,
        amountRef.current
      );
    }
  };

  const commitDate = (nextDate: string) => {
    setEntryDate(nextDate);
    entryDateRef.current = nextDate;
    const resolved = resolveEntryDate(nextDate);
    if (resolved !== props.entry.entryDate) {
      props.onCommit(
        resolved,
        descriptionRef.current,
        normalizeOptionalDate(accomptePayeDateRef.current),
        normalizeOptionalDate(paiementCompletDateRef.current),
        amountRef.current
      );
    }
  };

  return (
    <tr className="summary-row">
      <td className="summary-col-date">
        <input
          type="date"
          className="summary-input summary-input-date"
          value={entryDate}
          max={props.dateMax}
          onChange={(e) => commitDate(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DATE)}
          title="Optional — defaults to today"
        />
      </td>
      <td>
        <input
          type="text"
          className="summary-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.DESCRIPTION)}
        />
      </td>
      <td className="summary-col-pay-date">
        <input
          type="date"
          className="summary-input summary-input-date"
          value={accomptePayeDate}
          max={props.dateMax}
          onChange={(e) => setAccomptePayeDate(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.ACCOMPTE)}
        />
      </td>
      <td className="summary-col-pay-date">
        <input
          type="date"
          className="summary-input summary-input-date"
          value={paiementCompletDate}
          max={props.dateMax}
          onChange={(e) => setPaiementCompletDate(e.target.value)}
          onBlur={commitAll}
          onKeyDown={(e) => onSummaryCellKeyDown(e, SUMMARY_COL.PAIEMENT)}
        />
      </td>
      <td className="summary-col-amount">
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
        <button
          type="button"
          className="summary-row-delete-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={props.onDelete}
          title="Delete line"
          aria-label="Delete line"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 8a1 1 0 001 .9h4.4a1 1 0 001-.9L11 4" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
