import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Drawer, Grid, Input, InputNumber, Popconfirm, Select, Tooltip } from 'antd';
import { DeleteOutlined, DownOutlined, LockOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import { claimLibraryLinkMismatch } from '@mbc360/shared/config/referenceData';
import type { RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { NUMERIC_CELL } from '../utils/numeric';
import { createEmptyRegisterRow } from '../store/factory';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import MarketSelect from './MarketSelect';
import ClaimSelect from './ClaimSelect';
import { findClaim, useClaimRows } from '../hooks/claimRows';
import NextActionSelect from './NextActionSelect';
import ClaimsLibrarySelect from './ClaimsLibrarySelect';
import RowRefSelect from './RowRefSelect';
import RegisterSignatureCell from './RegisterSignatureCell';
import { derivedColumnGate, spansSeveralGates } from '@mbc360/shared/utils/registerColumnGates';
import '../styles/concept.css';
import './DynamicTable.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

// Generic register table, redesigned 2026-10-02 to the concept approved on the
// Prohibited Ingredient Watch-list (WatchlistRegister.tsx): a compact table that
// keeps only the columns a decision is made with, and a drawer holding every
// field. The old version laid all of a register's columns side by side — half
// the registers have more than 8, the widest 37 — so the columns people work in
// sat behind a horizontal scroll.
//
// Which columns make the table is DERIVED from config, not listed per register:
// the first column is the row's identity, and the "decision" columns are the
// short controls (select, checkbox, person, date, market, claim, signature) in
// config order, as many as fit the measured width. Free-text columns are never
// in the table — they are edited in the drawer. Nothing about saving changed:
// one local draft, one Save, the same `onSave(rows)` contract as before.

const DECISION_TYPES: ReadonlySet<RegisterColumn['type']> = new Set([
  'select',
  'multiSelect',
  'checkbox',
  'user',
  'date',
  'market',
  'markets',
  'claimRef',
  'signature',
  'nextActionRef',
  'claimsLibraryRef',
  'rowRef',
]);
const IDENTITY_MIN = 240; // the first column never gets narrower than this
const DECISION_WIDTH = 184; // one control column
const CHEVRON = 36;
const TABLE_MIN = 720; // below this the rows render as a list

const text = (value: unknown): string => (value == null ? '' : String(value).trim());

// What a register-specific cell renderer may do to the draft.
export interface CellApi {
  patch: (key: string, value: string | number | boolean | undefined) => void;
  patchRow: (values: Partial<RegisterRow>) => void;
  readOnly: boolean;
  /** The whole current draft, for rules that compare rows (duplicates). */
  draft: RegisterRow[];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export default function DynamicTable({
  config,
  rows,
  onSave,
  // Already-composed "Review owner · Co-sign: …" caption for this project, for
  // pages that stack several registers (FormulationSafety). The single-register
  // page shows it in its own header and passes nothing.
  reviewOwnerText,
  // Gate-level edit lock: read-only once every gate this register is tied to has
  // passed, or the register has been closed. Editing requires Backtrack.
  readOnly,
  readOnlyReason,
  // True when the page around the table already shows the register's title,
  // gate and lock banner (RegisterHubPage's single-register view).
  embedded,
  // Register-specific extras, so a register with its own consistency rules does
  // not have to fork the whole table:
  //   extraActions — a control beside "Add row" (e.g. a preset quick-add);
  //   saveBlockers — reasons Save must stay disabled, on top of the blank-row
  //     guard every register already has;
  //   warnings     — inconsistencies worth flagging that must NOT block.
  extraActions,
  saveBlockers,
  warnings,
  // Hooks for the registers whose cells carry their own rules (Supplier & RM
  // Evidence, Published Information Approval) — so they keep this one layout
  // instead of forking it:
  //   renderCell     — draw one cell; return undefined to use the default editor;
  //   tableColumns   — the decision columns to show in the table, by key,
  //                    instead of the derived ones;
  //   identityText / subtitleText — what names a row, when the first column's
  //                    raw value is not readable (an internal code);
  //   removeBlockedReason — why a row may not be removed, or undefined;
  //   rowHasError    — highlight a row the save guard is rejecting;
  //   notices        — alerts shown above the rows, computed from the draft.
  renderCell,
  tableColumns,
  identityText,
  subtitleText,
  removeBlockedReason,
  rowHasError,
  notices,
  warningsTitle,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
  reviewOwnerText?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
  embedded?: boolean;
  extraActions?: (draft: RegisterRow[], update: (fn: (prev: RegisterRow[]) => RegisterRow[]) => void) => React.ReactNode;
  saveBlockers?: (draft: RegisterRow[]) => string[];
  warnings?: (draft: RegisterRow[]) => string[];
  // Heading of the warnings box; the default is neutral because two different
  // sources feed it (a caller's `warnings` and the Claims Library link check).
  warningsTitle?: string;
  renderCell?: (column: RegisterColumn, row: RegisterRow, index: number, api: CellApi) => React.ReactNode | undefined;
  tableColumns?: string[];
  identityText?: (row: RegisterRow) => string;
  subtitleText?: (row: RegisterRow) => string;
  removeBlockedReason?: (row: RegisterRow) => string | undefined;
  rowHasError?: (row: RegisterRow, draft: RegisterRow[]) => boolean;
  notices?: (draft: RegisterRow[]) => React.ReactNode;
}) {
  const isRegister = config.mode === 'register' && !readOnly;
  const claimRows = useClaimRows();
  // Only needed by `signature` columns, which address a row by its index in this
  // project — the same index the bulk save writes as `rowOrder`.
  const { projectId } = useParams();
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const screens = Grid.useBreakpoint();

  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  const addRow = () => {
    update((prev) => [...prev, createEmptyRegisterRow(config.key)]);
    setOpenIndex(draft.length);
  };
  const removeRow = (index: number) => {
    // Defence in depth — the button is disabled for this case too.
    if (removeBlockedReason?.(draft[index])) return;
    update((prev) => prev.filter((_, i) => i !== index));
    setOpenIndex(null);
  };
  const isBlank = (row: RegisterRow) => isRegister && isRegisterRowBlank(config, row);
  const hasBlankRows = isRegister && draft.some((r) => isRegisterRowBlank(config, r));
  const blockers = readOnly ? [] : (saveBlockers?.(draft) ?? []);
  // A register with a Claims Library link also reports rows whose link and
  // "Linked / New claim" declaration disagree — a warning, never a save block.
  const hasLibraryLink = config.columns.some((c) => c.type === 'claimsLibraryRef');
  const libraryWarnings = hasLibraryLink
    ? draft.flatMap((row, i) => {
        const problem = claimLibraryLinkMismatch(row);
        return problem ? [`${text(row[config.columns[0].key]) || `Row ${i + 1}`}: ${problem}`] : [];
      })
    : [];
  const softWarnings = readOnly ? [] : [...(warnings?.(draft) ?? []), ...libraryWarnings];
  const save = () => {
    if (hasBlankRows || blockers.length > 0) return;
    onSave(draft);
    markSaved();
  };

  const identity = config.columns[0];
  // A read-only second text column (e.g. "Function" on a fixed reference list)
  // reads as the identity's subtitle rather than as a column of its own.
  const subtitle =
    config.columns[1] && config.columns[1].editable === false && (config.columns[1].type === 'text' || config.columns[1].type === 'textarea')
      ? config.columns[1]
      : undefined;
  const candidates = useMemo(
    () =>
      tableColumns
        ? tableColumns.map((key) => config.columns.find((c) => c.key === key)).filter((c): c is RegisterColumn => !!c)
        : config.columns.slice(1).filter((c) => c !== subtitle && DECISION_TYPES.has(c.type)),
    [config.columns, subtitle, tableColumns],
  );
  const tableMode = width >= TABLE_MIN;
  const fit = Math.max(0, Math.floor((width - IDENTITY_MIN - CHEVRON) / DECISION_WIDTH));
  const shown = candidates.slice(0, Math.min(fit, 4));
  // A register made only of free text still needs something beside the identity:
  // preview the next text column, read-only, so rows can be told apart.
  const preview =
    shown.length === 0
      ? config.columns.slice(1).find((c) => c !== subtitle && (c.type === 'text' || c.type === 'textarea'))
      : undefined;

  const columnGate = (col: RegisterColumn) =>
    spansSeveralGates(config.gate) ? (col.gate ?? derivedColumnGate(config.key, col.key)) : undefined;

  // One editor per column type, used by the table cells and the drawer alike.
  const renderEditor = (column: RegisterColumn, row: RegisterRow, index: number) => {
    const custom = renderCell?.(column, row, index, {
      patch: (key, v) => patch(index, key, v),
      patchRow: (values) => update((prev) => patchArray(prev, index, values)),
      readOnly: !!readOnly,
      draft,
    });
    if (custom !== undefined) return custom;

    const editable = column.editable !== false && !readOnly;
    const value = row[column.key];

    // A column marked `inheritFromClaim` is not entered here at all: it shows
    // what the linked claim says, so a claim carries one classification wherever
    // it is used. With no claim linked it is disabled rather than free — an
    // unlinked row classifying itself is how two copies drift apart.
    if (column.inheritFromClaim) {
      const claim = findClaim(claimRows, row.claimId);
      if (claim) {
        return (
          <Tooltip title={`From claim ${String(row.claimId)} — change it on Claim -> Evidence Traceability`}>
            <span className="rt-static">{text(claim[column.key]) || '—'}</span>
          </Tooltip>
        );
      }
      return <span className="rt-muted">Link a Claim ID first</span>;
    }

    // Before the !editable branch on purpose: a signature column is never
    // "editable" in the ordinary sense — it is written by the sign endpoint.
    if (column.type === 'signature') {
      if (!projectId) return <span className="rt-muted">—</span>;
      return (
        <RegisterSignatureCell
          projectId={projectId}
          registerKey={config.key}
          column={column}
          row={row}
          rowIndex={index}
          readOnly={readOnly}
        />
      );
    }

    if (!editable) {
      if (column.type === 'checkbox') return <Checkbox checked={!!value} disabled />;
      // Read-only, a library link shows the entry's wording rather than its id.
      if (column.type === 'claimsLibraryRef') return <ClaimsLibrarySelect value={value as string | undefined} disabled onChange={() => {}} />;
      return (
        <span className="rt-static" style={column.type === 'number' ? NUMERIC_CELL : undefined}>
          {text(value) || '—'}
        </span>
      );
    }

    switch (column.type) {
      case 'checkbox':
        return <Checkbox checked={!!value} onChange={(e) => patch(index, column.key, e.target.checked)} />;
      case 'claimRef':
        return <ClaimSelect value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
      // D3: a flagged watch-list row must link a REAL controlled Next Action.
      case 'nextActionRef':
        return <NextActionSelect value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
      case 'rowRef':
        return <RowRefSelect column={column} value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
      case 'claimsLibraryRef':
        return (
          <ClaimsLibrarySelect
            value={value as string | undefined}
            status={claimLibraryLinkMismatch(row) ? 'warning' : undefined}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      // Several values from the column's own list, stored comma-joined (same
      // storage shape as `markets`).
      case 'multiSelect':
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            allowClear
            value={(value as string | undefined)?.split(',').map((v) => v.trim()).filter(Boolean) ?? []}
            options={(column.options ?? []).map((o) => ({ value: o, label: o }))}
            onChange={(v: string[]) => patch(index, column.key, v.join(', '))}
          />
        );
      case 'market':
      case 'markets':
        return (
          <MarketSelect
            value={value as string | undefined}
            multiple={column.type === 'markets'}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'user':
        return <UserSelect value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
      case 'select':
        return (
          <Select
            allowClear
            style={{ width: '100%' }}
            popupMatchSelectWidth={false}
            placeholder="Select…"
            value={(value as string | undefined) || undefined}
            options={(column.options ?? []).map((o) => ({ value: o, label: o }))}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'date':
        return (
          <DatePicker
            style={{ width: '100%' }}
            value={value ? dayjs(String(value)) : null}
            onChange={(d) => patch(index, column.key, d ? d.format('YYYY-MM-DD') : undefined)}
          />
        );
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%', ...NUMERIC_CELL }}
            value={value as number | undefined}
            onChange={(v) => patch(index, column.key, v ?? 0)}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 8 }}
            value={value as string | undefined}
            onChange={(e) => patch(index, column.key, e.target.value)}
          />
        );
      case 'text':
      default:
        return <Input value={value as string | undefined} onChange={(e) => patch(index, column.key, e.target.value)} />;
    }
  };

  const rowName = (row: RegisterRow) => (identityText ? identityText(row) : text(row[identity.key]));
  const rowSubtitle = (row: RegisterRow) => (subtitleText ? subtitleText(row) : subtitle ? text(row[subtitle.key]) : '');
  const rowClass = (row: RegisterRow) =>
    `rt-row${isBlank(row) || rowHasError?.(row, draft) ? ' rt-row-blank' : ''}`;
  const identityCell = (row: RegisterRow, index: number) => {
    const name = rowName(row);
    return (
      <>
        <div className="rt-name" title={name}>
          {name || <span className="rt-muted">{isBlank(row) ? 'Empty row' : `Row ${index + 1}`}</span>}
          {isBlank(row) && <span className="c-tag c-tag-bad rt-empty-tag">No data</span>}
        </div>
        {rowSubtitle(row) && <div className="rt-sub">{rowSubtitle(row)}</div>}
      </>
    );
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const editable = config.columns.filter((c) => c.editable !== false || c.type === 'signature');
  // The identity and its subtitle already head the drawer, so they are not
  // repeated under Reference.
  const reference = config.columns.filter(
    (c) => c.editable === false && c.type !== 'signature' && c !== identity && c !== subtitle,
  );
  const openRow = openIndex === null ? undefined : draft[openIndex];
  const step = (delta: number) => {
    if (openIndex === null || draft.length === 0) return;
    setOpenIndex((openIndex + delta + draft.length) % draft.length);
  };

  return (
    <div className={embedded ? 'rt' : 'concept-tokens rt c-card rt-standalone'}>
      {!embedded && (
        <div className="rt-head">
          <div className="rt-head-title">
            <span>{config.title}</span>
            {config.gate && <span className="c-tag">Gate {config.gate}</span>}
            {readOnly && <span className="c-tag c-tag-ok"><LockOutlined />Read-only</span>}
          </div>
          {config.description && <p className="rt-head-desc">{config.description}</p>}
          {reviewOwnerText && <p className="rt-head-desc">Review owner: {reviewOwnerText}</p>}
        </div>
      )}
      {!embedded && readOnly && (
        <div className="rt-lock">
          <LockOutlined />
          <span>{readOnlyReason ?? 'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}</span>
        </div>
      )}
      {softWarnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="rt-alert"
          title={warningsTitle ?? 'Check before saving'}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {softWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          }
        />
      )}

      {notices?.(draft)}
      <div ref={wrapRef} className={embedded ? 'c-card rt-body' : 'rt-body'}>
        <div className="rt-count">
          {draft.length} {config.mode === 'register' ? (draft.length === 1 ? 'row' : 'rows') : 'items'}
        </div>
        {tableMode ? (
          <table className="rt-table">
            <thead>
              <tr>
                <th>{identity.label}</th>
                {shown.map((col) => (
                  <th key={col.key} style={{ width: DECISION_WIDTH }}>
                    <span className="rt-th">{col.label}</span>
                    {columnGate(col) && <span className="c-tag rt-gate">G{columnGate(col)}</span>}
                  </th>
                ))}
                {preview && <th>{preview.label}</th>}
                <th style={{ width: CHEVRON }} aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {draft.map((row, index) => (
                <tr
                  key={index}
                  className={rowClass(row)}
                  aria-selected={openIndex === index}
                  onClick={() => setOpenIndex(index)}
                >
                  <td>{identityCell(row, index)}</td>
                  {shown.map((col) => (
                    <td key={col.key} onClick={stop}>
                      {renderEditor(col, row, index)}
                    </td>
                  ))}
                  {preview && (
                    <td>
                      <div className="rt-preview">{text(row[preview.key]) || <span className="rt-muted">—</span>}</div>
                    </td>
                  )}
                  <td className="rt-chev"><RightOutlined /></td>
                </tr>
              ))}
              {draft.length === 0 && (
                <tr>
                  <td colSpan={shown.length + (preview ? 3 : 2)} className="rt-empty">
                    No rows yet.{isRegister ? ' Add the first one below.' : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <ul className="rt-list">
            {draft.map((row, index) => (
              <li
                key={index}
                className={rowClass(row)}
                aria-selected={openIndex === index}
                onClick={() => setOpenIndex(index)}
              >
                <div className="rt-list-head">
                  <div style={{ minWidth: 0 }}>{identityCell(row, index)}</div>
                  <RightOutlined className="rt-chev" />
                </div>
                {candidates.length > 0 && (
                  <div className="rt-list-controls" onClick={stop}>
                    {candidates.slice(0, 2).map((col) => (
                      <label key={col.key}>
                        <span className="rt-label">{col.label}</span>
                        {renderEditor(col, row, index)}
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {draft.length === 0 && <li className="rt-empty">No rows yet.{isRegister ? ' Add the first one below.' : ''}</li>}
          </ul>
        )}
        {isRegister && (
          <div className="rt-add">
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addRow}>
              Add row
            </Button>
            {extraActions?.(draft, update)}
          </div>
        )}
      </div>

      {dirty && (
        <div className="rt-savebar">
          <div>
            <SaveBar
              dirty={dirty}
              onSave={save}
              onDiscard={discard}
              disabled={hasBlankRows || blockers.length > 0}
              disabledReason={
                hasBlankRows
                  ? 'One or more rows have no data entered — fill in at least one field or remove the row before saving.'
                  : blockers.join(' · ')
              }
            />
          </div>
        </div>
      )}

      <Drawer
        open={openRow !== undefined}
        onClose={() => setOpenIndex(null)}
        size={screens.md ? 560 : '100%'}
        mask={!screens.xxl}
        closable={false}
        rootClassName="concept-tokens"
        title={
          openRow &&
          openIndex !== null && (
            <div className="rt-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="rt-drawer-count">
                  {config.title} · {openIndex + 1} of {draft.length}
                </div>
                <div className="rt-drawer-name">{rowName(openRow) || `Row ${openIndex + 1}`}</div>
                {rowSubtitle(openRow) && <div className="rt-sub">{rowSubtitle(openRow)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button type="text" icon={<UpOutlined />} aria-label="Previous row" onClick={() => step(-1)} />
                <Button type="text" icon={<DownOutlined />} aria-label="Next row" onClick={() => step(1)} />
                <Button type="text" aria-label="Close" onClick={() => setOpenIndex(null)}>
                  ✕
                </Button>
              </div>
            </div>
          )
        }
        footer={
          !readOnly && openIndex !== null ? (
            <div className="rt-drawer-foot">
              {/* No "Done" button: it only closed the drawer (the ✕ does that)
                  while reading as if the row were finished or saved. */}
              <span className="rt-drawer-hint">Changes stay in this section's draft until you Save it.</span>
              {isRegister && (
              <Tooltip title={removeBlockedReason?.(draft[openIndex])}>
                <span>
                  {/* A row nobody has typed into has nothing to lose, so it goes
                      without the "Remove this row?" step (user-requested,
                      2026-10-02); a row with data still asks. */}
                  {isRegisterRowBlank(config, draft[openIndex]) ? (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!!removeBlockedReason?.(draft[openIndex])}
                      onClick={() => removeRow(openIndex)}
                    >
                      Remove row
                    </Button>
                  ) : (
                    <Popconfirm
                      title="Remove this row?"
                      okButtonProps={{ danger: true }}
                      okText="Remove"
                      disabled={!!removeBlockedReason?.(draft[openIndex])}
                      onConfirm={() => removeRow(openIndex)}
                    >
                      <Button danger icon={<DeleteOutlined />} disabled={!!removeBlockedReason?.(draft[openIndex])}>
                        Remove row
                      </Button>
                    </Popconfirm>
                  )}
                </span>
              </Tooltip>
              )}
            </div>
          ) : undefined
        }
      >
        {openRow && openIndex !== null && (
          <div className="rt-sections">
            {editable.length > 0 && (
              <section>
                <div className="rt-sec-title">{readOnly ? 'Details' : 'Edit'}</div>
                <div className="rt-grid">
                  {editable.map((col) => (
                    <label
                      key={col.key}
                      className={col.type === 'textarea' || col.type === 'multiSelect' || col.type === 'signature' ? 'rt-span-2' : undefined}
                    >
                      <span className="rt-label">
                        {col.label}
                        {columnGate(col) && <span className="c-tag rt-gate">G{columnGate(col)}</span>}
                      </span>
                      {renderEditor(col, openRow, openIndex)}
                    </label>
                  ))}
                </div>
              </section>
            )}
            {reference.length > 0 && (
              <section>
                <div className="rt-sec-title">Reference</div>
                <dl className="rt-dl">
                  {reference.map((col) => (
                    <div key={col.key} className="rt-dl-row">
                      <dt>{col.label}</dt>
                      <dd>
                        {renderCell?.(col, openRow, openIndex, { patch: () => {}, patchRow: () => {}, readOnly: true, draft }) ??
                          (col.type === 'checkbox' ? (openRow[col.key] ? 'Yes' : 'No') : text(openRow[col.key]) || '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
