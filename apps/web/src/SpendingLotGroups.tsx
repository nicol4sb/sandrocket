import React, { useEffect, useRef, useState } from 'react';
import type {
  DocumentResponse,
  SpendingEntryResponse,
  SpendingLotResponse
} from '@sandrocket/contracts';
import { sortEntriesByDate } from './financeSort';
import { LocaleDateInput } from './LocaleDateInput';
import { documentPreviewKind, findDocumentByFilename } from './documentLinks';

export function lotSpentTotal(entries: SpendingEntryResponse[], lotId: number): number {
  return entries.filter((e) => e.lotId === lotId && e.paid).reduce((sum, e) => sum + e.amount, 0);
}

export function formatLotAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export interface LotDraftRow {
  entryDate: string;
  description: string;
  bank: string;
  amount: string;
}

export function newLotDraftRow(entryDate: string): LotDraftRow {
  return { entryDate, description: '', bank: '', amount: '' };
}

function formatAmountInput(amount: number): string {
  if (amount === 0) return '';
  return formatLotAmount(amount);
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function rowHasContent(description: string, amountStr: string): boolean {
  return description.trim().length > 0 || (parseAmount(amountStr) ?? 0) !== 0;
}

export function SpendingLotAssignSelect(props: {
  lots: SpendingLotResponse[];
  onAssign: (lotId: number) => void;
  compact?: boolean;
}) {
  if (props.lots.length === 0) return null;

  return (
    <select
      className={`spending-lot-assign-select${props.compact ? ' spending-lot-assign-select-compact' : ''}`}
      defaultValue=""
      onChange={(e) => {
        const lotId = Number(e.target.value);
        if (lotId) {
          props.onAssign(lotId);
          e.target.value = '';
        }
      }}
      title="Assign to lot"
      aria-label="Assign to lot"
    >
      <option value="" disabled>
        → Lot…
      </option>
      {props.lots.map((lot) => (
        <option key={lot.id} value={lot.id}>
          {lot.name.trim() || 'Unnamed lot'}
        </option>
      ))}
    </select>
  );
}

function LotCaretIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 3.5 5 6.5 8 3.5" />
    </svg>
  );
}

export function SpendingLotAssignCaret(props: {
  lots: SpendingLotResponse[];
  currentLotId?: number | null;
  onAssign: (lotId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [open]);

  if (props.lots.length === 0) return null;

  const currentName =
    props.currentLotId != null
      ? props.lots.find((lot) => lot.id === props.currentLotId)?.name.trim()
      : '';

  return (
    <div className="spending-lot-assign-caret-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`spending-lot-assign-caret${open ? ' spending-lot-assign-caret-open' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        title={currentName ? `Lot: ${currentName}. Change lot` : 'Change lot'}
        aria-label="Change lot"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <LotCaretIcon />
      </button>
      {open && (
        <div className="spending-lot-assign-menu" role="menu">
          {props.lots.map((lot) => (
            <button
              key={lot.id}
              type="button"
              role="menuitem"
              className={`spending-lot-assign-menu-item${
                lot.id === props.currentLotId ? ' spending-lot-assign-menu-item-active' : ''
              }`}
              onClick={() => {
                props.onAssign(lot.id);
                setOpen(false);
              }}
            >
              {lot.name.trim() || 'Unnamed lot'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpendingLotMigrateBar(props: {
  count: number;
  lots: SpendingLotResponse[];
  disabled?: boolean;
  onAssignAll: (lotId: number) => void;
}) {
  const [lotId, setLotId] = useState('');

  if (props.count === 0) return null;

  return (
    <div className="spending-lot-migrate-bar">
      <span className="spending-lot-migrate-label">
        {props.count} uncategorized {props.count === 1 ? 'line' : 'lines'}
      </span>
      <select
        className="spending-lot-assign-select spending-lot-migrate-select"
        value={lotId}
        disabled={props.disabled || props.lots.length === 0}
        onChange={(e) => setLotId(e.target.value)}
        aria-label="Choose lot for bulk assign"
      >
        <option value="">Choose lot…</option>
        {props.lots.map((lot) => (
          <option key={lot.id} value={String(lot.id)}>
            {lot.name.trim() || 'Unnamed lot'}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="spending-lot-migrate-btn"
        disabled={props.disabled || !lotId}
        onClick={() => {
          if (!lotId) return;
          props.onAssignAll(Number(lotId));
          setLotId('');
        }}
      >
        Assign all
      </button>
    </div>
  );
}

interface SpendingLotEstimateRowProps {
  lot: SpendingLotResponse;
  colorIndex: number;
  spent: number;
  documents?: DocumentResponse[];
  onPreviewDocument?: (doc: DocumentResponse) => void;
}

function DocumentKindIcon({ kind }: { kind: 'pdf' | 'word' | 'image' | 'other' }) {
  if (kind === 'pdf') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path
          fill="#e57373"
          d="M3 1.5A1.5 1.5 0 014.5 0h5.086a1.5 1.5 0 011.06.44l2.914 2.914A1.5 1.5 0 0114 4.414V14.5A1.5 1.5 0 0112.5 16h-8A1.5 1.5 0 013 14.5v-13z"
        />
        <path fill="#fff" d="M9 0v3a1 1 0 001 1h3" opacity="0.35" />
        <text x="8" y="12" textAnchor="middle" fill="#fff" fontSize="4.5" fontWeight="700" fontFamily="system-ui,sans-serif">
          PDF
        </text>
      </svg>
    );
  }
  if (kind === 'word') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path
          fill="#42a5f5"
          d="M3 1.5A1.5 1.5 0 014.5 0h5.086a1.5 1.5 0 011.06.44l2.914 2.914A1.5 1.5 0 0114 4.414V14.5A1.5 1.5 0 0112.5 16h-8A1.5 1.5 0 013 14.5v-13z"
        />
        <path fill="#fff" d="M9 0v3a1 1 0 001 1h3" opacity="0.35" />
        <text x="8" y="12" textAnchor="middle" fill="#fff" fontSize="4.2" fontWeight="700" fontFamily="system-ui,sans-serif">
          W
        </text>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M4 1.5h5l3 3V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
      <path d="M9 1.5V5h3.5" />
    </svg>
  );
}

export function SpendingLotEstimateRow(props: SpendingLotEstimateRowProps) {
  const title = props.lot.name.trim() || 'Unnamed lot';
  const fichierRetenu = props.lot.description.trim();
  const diff = props.lot.estimateAmount - props.spent;
  const over = diff < 0;
  const matchedDoc = props.documents
    ? findDocumentByFilename(props.documents, fichierRetenu)
    : null;
  const kind = matchedDoc ? documentPreviewKind(matchedDoc) : null;

  return (
    <tr className={`spending-lot-estimate spending-lot-group--${props.colorIndex % 6}`}>
      <td className="spending-col-date spending-lot-estimate-date" data-label="Payment date" />
      <td data-label="Description">
        <span className="spending-lot-desc-with-doc">
          <span className="spending-lot-devis-title">{title}</span>
          {matchedDoc && kind && props.onPreviewDocument && (
            <button
              type="button"
              className={`spending-lot-doc-btn spending-lot-doc-btn-${kind}`}
              title={`Preview ${matchedDoc.originalFilename}`}
              aria-label={`Preview ${matchedDoc.originalFilename}`}
              onClick={() => props.onPreviewDocument?.(matchedDoc)}
            >
              <DocumentKindIcon kind={kind} />
            </button>
          )}
        </span>
      </td>
      <td className="spending-col-bank" colSpan={3} data-label="Progress">
        <span className="spending-lot-progress">
          <span className="spending-lot-progress-spent">{formatLotAmount(props.spent)} spent</span>
          <span className={`spending-lot-progress-diff${over ? ' spending-lot-progress-over' : ''}`}>
            {over
              ? `Over ${formatLotAmount(Math.abs(diff))}`
              : `${formatLotAmount(diff)} left`}
          </span>
        </span>
      </td>
      <td className="spending-col-amount" data-label="Amount">
        <span className="spending-lot-estimate-readonly">{formatLotAmount(props.lot.estimateAmount)}</span>
      </td>
      <td className="spending-col-lot" />
      <td className="spending-col-actions" />
    </tr>
  );
}

interface SpendingLotDraftRowProps {
  lotId: number | null;
  dateMax: string;
  onCreate: (lotId: number | null, draft: LotDraftRow) => void;
  colHandlers: (col: number) => (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SpendingLotDraftRow(props: SpendingLotDraftRowProps) {
  const [draft, setDraft] = useState<LotDraftRow>(() => newLotDraftRow(props.dateMax));

  const commit = () => {
    if (!rowHasContent(draft.description, draft.amount)) return;
    props.onCreate(props.lotId, draft);
    setDraft(newLotDraftRow(props.dateMax));
  };

  return (
    <tr className="spending-row-draft spending-lot-expense-draft">
      <td className="spending-col-date" data-label="Payment date">
        <LocaleDateInput
          displayClassName="spending-input spending-input-date locale-date-display-field"
          value={draft.entryDate}
          max={props.dateMax}
          onChange={(next) => setDraft((d) => ({ ...d, entryDate: next }))}
          onBlur={commit}
          onKeyDown={props.colHandlers(0)}
        />
      </td>
      <td data-label="Description">
        <input
          type="text"
          className="spending-input"
          placeholder="Add spending line…"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          onBlur={commit}
          onKeyDown={props.colHandlers(1)}
        />
      </td>
      <td className="spending-col-bank" data-label="Bank">
        <input
          type="text"
          className="spending-input"
          placeholder="Bank…"
          value={draft.bank}
          onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
          onBlur={commit}
          onKeyDown={props.colHandlers(2)}
        />
      </td>
      <td className="spending-col-paid" data-label="Paid" />
      <td className="spending-col-debt-paid" data-label="Debt" />
      <td className="spending-col-amount" data-label="Amount">
        <input
          type="text"
          inputMode="decimal"
          className="spending-input spending-input-amount"
          placeholder="0"
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          onBlur={commit}
          onKeyDown={props.colHandlers(5)}
        />
      </td>
      <td className="spending-col-lot" />
      <td className="spending-col-actions" />
    </tr>
  );
}

export interface SpendingRowRendererProps {
  compact?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  entry: SpendingEntryResponse;
  dateMax: string;
  onCommit: (patch: {
    entryDate?: string;
    description?: string;
    bank?: string;
    amount?: number;
  }) => void;
  onPaidChange: (paid: boolean) => void;
  onDebtPaidChange: (debtPaid: boolean) => void;
  onDelete: () => void;
}

interface SpendingLotMobileGroupProps {
  lot: SpendingLotResponse;
  colorIndex: number;
  entries: SpendingEntryResponse[];
  documents?: DocumentResponse[];
  onPreviewDocument?: (doc: DocumentResponse) => void;
  dateMax: string;
  expandedEntryId: number | null;
  onExpandedChange: (entryId: number | null) => void;
  onEntryCommit: (
    entry: SpendingEntryResponse,
    patch: {
      entryDate?: string;
      description?: string;
      bank?: string;
      amount?: number;
    }
  ) => void;
  onPaidChange: (entry: SpendingEntryResponse, paid: boolean) => void;
  onDebtPaidChange: (entry: SpendingEntryResponse, debtPaid: boolean) => void;
  onDeleteEntry: (id: number) => void;
  onCreateEntry: (lotId: number | null, draft: LotDraftRow) => void;
  renderRow: (props: SpendingRowRendererProps) => React.ReactNode;
}

export function SpendingLotMobileGroup(props: SpendingLotMobileGroupProps) {
  const spent = lotSpentTotal(props.entries, props.lot.id);
  const diff = props.lot.estimateAmount - spent;
  const over = diff < 0;
  const [draft, setDraft] = useState<LotDraftRow>(() => newLotDraftRow(props.dateMax));
  const [draftExpanded, setDraftExpanded] = useState(false);

  const lotEntries = sortEntriesByDate(props.entries.filter((e) => e.lotId === props.lot.id));
  const title = props.lot.name.trim() || 'Unnamed lot';
  const fichierRetenu = props.lot.description.trim();
  const matchedDoc = props.documents
    ? findDocumentByFilename(props.documents, fichierRetenu)
    : null;
  const kind = matchedDoc ? documentPreviewKind(matchedDoc) : null;

  return (
    <section className={`spending-lot-mobile spending-lot-group--${props.colorIndex % 6}`}>
      <div className="spending-lot-mobile-estimate">
        <div className="spending-lot-mobile-estimate-head">
          <span className="spending-lot-desc-with-doc">
            <strong className="spending-lot-devis-title">{title}</strong>
            {matchedDoc && kind && props.onPreviewDocument && (
              <button
                type="button"
                className={`spending-lot-doc-btn spending-lot-doc-btn-${kind}`}
                title={`Preview ${matchedDoc.originalFilename}`}
                aria-label={`Preview ${matchedDoc.originalFilename}`}
                onClick={() => props.onPreviewDocument?.(matchedDoc)}
              >
                <DocumentKindIcon kind={kind} />
              </button>
            )}
          </span>
        </div>
        <div className="spending-lot-mobile-estimate-amount">
          <span>Estimate</span>
          <strong className="spending-lot-estimate-readonly">{formatLotAmount(props.lot.estimateAmount)}</strong>
        </div>
        <div className="spending-lot-mobile-progress">
          <span>{formatLotAmount(spent)} spent</span>
          <span className={over ? 'spending-lot-progress-over' : ''}>
            {over ? `Over ${formatLotAmount(Math.abs(diff))}` : `${formatLotAmount(diff)} left`}
          </span>
        </div>
      </div>
      {lotEntries.map((entry) =>
        props.renderRow({
          compact: true,
          entry,
          dateMax: props.dateMax,
          expanded: props.expandedEntryId === entry.id,
          onExpandedChange: (open) => props.onExpandedChange(open ? entry.id : null),
          onCommit: (patch) => props.onEntryCommit(entry, patch),
          onPaidChange: (paid) => props.onPaidChange(entry, paid),
          onDebtPaidChange: (debtPaid) => props.onDebtPaidChange(entry, debtPaid),
          onDelete: () => props.onDeleteEntry(entry.id)
        })
      )}
      <div
        className={`finance-compact-row finance-compact-row-draft${
          draftExpanded ? ' finance-compact-row-expanded' : ''
        }`}
      >
        {!draftExpanded ? (
          <div className="finance-compact-draft-collapsed">
            <input
              type="text"
              className="finance-compact-input finance-compact-draft-trigger"
              placeholder="Add spending to this lot…"
              value={draft.description}
              onFocus={() => setDraftExpanded(true)}
              onChange={(e) => {
                const next = e.target.value;
                setDraft((d) => ({ ...d, description: next }));
                if (next.trim()) setDraftExpanded(true);
              }}
              onBlur={() => {
                if (rowHasContent(draft.description, draft.amount)) {
                  props.onCreateEntry(props.lot.id, draft);
                  setDraft(newLotDraftRow(props.dateMax));
                }
                setDraftExpanded(false);
              }}
            />
          </div>
        ) : (
          <div className="finance-compact-details finance-compact-details-open">
            <label className="finance-compact-field">
              <span>Description</span>
              <input
                type="text"
                className="finance-compact-input"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </label>
            <div className="finance-compact-field-row">
              <label className="finance-compact-field">
                <span>Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="finance-compact-input finance-compact-input-amount"
                  value={draft.amount}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                />
              </label>
              <label className="finance-compact-field">
                <span>Date</span>
                <LocaleDateInput
                  displayClassName="finance-compact-input locale-date-display-field"
                  value={draft.entryDate}
                  max={props.dateMax}
                  onChange={(next) => setDraft((d) => ({ ...d, entryDate: next }))}
                />
              </label>
            </div>
            <label className="finance-compact-field">
              <span>Bank</span>
              <input
                type="text"
                className="finance-compact-input"
                value={draft.bank}
                onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
