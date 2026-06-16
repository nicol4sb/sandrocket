import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { ListSpendingResponse, SpendingEntryResponse } from '@sandrocket/contracts';

interface SpendingTableProps {
  projectId: number;
  projectName: string;
  baseUrl: string;
}

interface DraftRow {
  description: string;
  amount: string;
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

function rowHasContent(description: string, amountStr: string): boolean {
  return description.trim().length > 0 || (parseAmount(amountStr) ?? 0) !== 0;
}

function focusAmountOnTab(e: React.KeyboardEvent<HTMLInputElement>, amountRef: React.RefObject<HTMLInputElement | null>) {
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    amountRef.current?.focus();
    amountRef.current?.select();
  }
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '').trim() || 'project';
}

function exportSpendingToExcel(
  entries: SpendingEntryResponse[],
  totalAmount: number,
  projectName: string
) {
  const rows: (string | number)[][] = [
    ['Description', 'Amount'],
    ...entries.map((e) => [e.description, e.amount]),
    ['Total', totalAmount]
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 40 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spending');
  XLSX.writeFile(workbook, `${safeFilename(projectName)}-spending.xlsx`);
}

export function SpendingTable({ projectId, projectName, baseUrl }: SpendingTableProps) {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<SpendingEntryResponse[]>([]);
  const [draft, setDraft] = useState<DraftRow>({ description: '', amount: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);
  const draftAmountRef = useRef<HTMLInputElement>(null);
  draftRef.current = draft;

  const fetchSpending = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as ListSpendingResponse;
      setVisible(data.visible);
      setEntries(data.entries);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [baseUrl, projectId]);

  useEffect(() => {
    setLoading(true);
    setDraft({ description: '', amount: '' });
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

  const createEntry = async (description: string, amountStr: string) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;
    if (!rowHasContent(description, amountStr)) return;

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/spending`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), amount })
      });
      if (res.ok) {
        setDraft({ description: '', amount: '' });
        await fetchSpending();
      }
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (entry: SpendingEntryResponse, description: string, amountStr: string) => {
    const amount = parseAmount(amountStr);
    if (amount === null) return;

    if (!description.trim() && amount === 0) {
      setSaving(true);
      try {
        await fetch(`${baseUrl}/spending/${entry.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        await fetchSpending();
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/spending/${entry.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), amount })
      });
      if (res.ok) {
        await fetchSpending();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDraftBlur = () => {
    const { description, amount } = draftRef.current;
    if (rowHasContent(description, amount)) {
      void createEntry(description, amount);
    }
  };

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return null;
  }

  if (!visible) {
    return (
      <div className="spending-section">
        <div className="spending-collapsed">
          <div className="spending-collapsed-text">
            <span className="spending-collapsed-icon">€</span>
            <span>Track project spending</span>
          </div>
          <button
            type="button"
            className="spending-show-btn"
            onClick={() => void setVisibility(true)}
            disabled={saving}
          >
            Show
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spending-section">
      <div className="spending-panel">
        <div className="spending-header">
          <h3 className="spending-title">Spending</h3>
          <div className="spending-header-actions">
            <button
              type="button"
              className="spending-export-btn"
              onClick={() => exportSpendingToExcel(entries, totalAmount, projectName)}
              disabled={entries.length === 0}
              title="Export spending to Excel"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
                <path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M2 13h10" />
              </svg>
              <span>Excel</span>
            </button>
            <button
              type="button"
              className="spending-hide-btn"
              onClick={() => void setVisibility(false)}
              disabled={saving}
              title="Hide spending table"
            >
              Hide
            </button>
          </div>
        </div>

        <div className="spending-table-wrap">
          <table className="spending-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="spending-col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <SpendingRow
                  key={entry.id}
                  entry={entry}
                  onCommit={(description, amount) => void updateEntry(entry, description, amount)}
                />
              ))}
              <tr className="spending-row-draft">
                <td>
                  <input
                    type="text"
                    className="spending-input"
                    placeholder="Add a line…"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    onBlur={handleDraftBlur}
                    onKeyDown={(e) => {
                      focusAmountOnTab(e, draftAmountRef);
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </td>
                <td className="spending-col-amount">
                  <input
                    ref={draftAmountRef}
                    type="text"
                    inputMode="decimal"
                    className="spending-input spending-input-amount"
                    placeholder="0"
                    value={draft.amount}
                    onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                    onBlur={handleDraftBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </td>
              </tr>
              <tr className="spending-row-total">
                <td>Total</td>
                <td className="spending-col-amount">{formatAmount(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SpendingRow(props: {
  entry: SpendingEntryResponse;
  onCommit: (description: string, amount: string) => void;
}) {
  const [description, setDescription] = useState(props.entry.description);
  const [amount, setAmount] = useState(formatAmountInput(props.entry.amount));
  const descriptionRef = useRef(description);
  const amountRef = useRef(amount);
  const amountInputRef = useRef<HTMLInputElement>(null);
  descriptionRef.current = description;
  amountRef.current = amount;

  useEffect(() => {
    setDescription(props.entry.description);
    setAmount(formatAmountInput(props.entry.amount));
  }, [props.entry.description, props.entry.amount]);

  const commit = () => {
    const descChanged = descriptionRef.current !== props.entry.description;
    const parsed = parseAmount(amountRef.current);
    const prevParsed = props.entry.amount;
    const amountChanged = parsed !== null && parsed !== prevParsed;
    if (descChanged || amountChanged) {
      props.onCommit(descriptionRef.current, amountRef.current);
    }
  };

  return (
    <tr>
      <td>
        <input
          type="text"
          className="spending-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            focusAmountOnTab(e, amountInputRef);
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </td>
      <td className="spending-col-amount">
        <input
          ref={amountInputRef}
          type="text"
          inputMode="decimal"
          className="spending-input spending-input-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </td>
    </tr>
  );
}
