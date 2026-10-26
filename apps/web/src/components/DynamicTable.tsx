import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SAFETY_FINDINGS_REGISTER, canChooseSuperseded } from '@mbc360/shared/utils/safetyFindings';
import { Alert, Button, Checkbox, DatePicker, Drawer, Grid, Input, InputNumber, Select, Tooltip } from 'antd';
import { DeleteOutlined, DownOutlined, LockOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import GateLink from './GateLink';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isOwnerFunctionColumn, ownerFunctionWithPeople } from '@mbc360/shared/config/reviewers';
import { duplicateValueProblems, isColumnRequiredFor, isRegisterRowBlank, missingRequiredProblems, previewAutoIds } from '@mbc360/shared/config/registers';
import RequiredMark from './RequiredMark';
import { claimLibraryLinkMismatch } from '@mbc360/shared/config/referenceData';
import type { RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { NUMERIC_CELL } from '../utils/numeric';
import { createEmptyRegisterRow } from '../store/factory';
import DrawerSaveFooter from './DrawerSaveFooter';
import { useCloseDrawerOnPageSave } from '../hooks/useCloseDrawerOnPageSave';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import SelfAttestField from './SelfAttestField';
import MarketSelect from './MarketSelect';
import ClaimSelect from './ClaimSelect';
import { findClaim, useClaimRows } from '../hooks/claimRows';
import NextActionSelect from './NextActionSelect';
import ClaimsLibrarySelect from './ClaimsLibrarySelect';
import RowRefSelect from './RowRefSelect';
import RegisterSignatureCell from './RegisterSignatureCell';
import { columnOwnerGateIds, spansSeveralGates } from '@mbc360/shared/utils/registerColumnGates';
import { registerLockReason, registerLocks } from '@mbc360/shared/utils/registerClosures';
import { useAppStore } from '../store/useAppStore';
import { useRegisterAccess } from '../hooks/useRegisterAccess';
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
const TEXT_PREVIEW_WIDTH = 240; // a free-text column named in tableColumns: a two-line preview, edited in the drawer
const isTextColumn = (col: RegisterColumn) => col.type === 'text' || col.type === 'textarea';
// The remove-row column of an inline table: a 32px icon button plus 8px either side.
const REMOVE_COLUMN = 48;

function placeholderFor(column: RegisterColumn, row: RegisterRow): string | undefined {
  const by = column.placeholderBy;
  if (!by) return column.placeholder;
  const picked = row[by.column];
  return (typeof picked === 'string' ? by.values[picked] : undefined) ?? by.fallback ?? column.placeholder;
}
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
  hideDescription,
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
  inline,
  referenceTable,
  tableColumns,
  identityText,
  subtitleText,
  removeBlockedReason,
  addBlockedReason,
  rowHasError,
  notices,
  warningsTitle,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void | boolean | Promise<unknown>;
  reviewOwnerText?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
  embedded?: boolean;
  // Leave out the register's own description under the title (a read-only copy shown on another page, where it would describe the wrong screen).
  hideDescription?: boolean;
  extraActions?: (draft: RegisterRow[], update: (fn: (prev: RegisterRow[]) => RegisterRow[]) => void) => React.ReactNode;
  saveBlockers?: (draft: RegisterRow[]) => string[];
  warnings?: (draft: RegisterRow[]) => string[];
  // Heading of the warnings box; the default is neutral because two different
  // sources feed it (a caller's `warnings` and the Claims Library link check).
  warningsTitle?: string;
  renderCell?: (column: RegisterColumn, row: RegisterRow, index: number, api: CellApi) => React.ReactNode | undefined;
  // For a register of only a few short columns (a label and its value): every column is edited in the table itself, with no
  // row drawer — opening a panel to type one value is more work than the value. Left unset, a register of fewer than four columns
  // is inline (project owner, 2026-10-19); pass false to keep the drawer.
  inline?: boolean;
  // A read-only reference table (standing rules, nothing to enter): EVERY column is shown with its full text, wrapped, and there is
  // no row drawer to open — the table is the whole content.
  referenceTable?: boolean;
  tableColumns?: string[];
  identityText?: (row: RegisterRow) => string;
  subtitleText?: (row: RegisterRow) => string;
  removeBlockedReason?: (row: RegisterRow) => string | undefined;
  // Why rows cannot be added by hand (they follow another record, e.g. the Formula BOM): disables Add row and says so.
  addBlockedReason?: string;
  rowHasError?: (row: RegisterRow, draft: RegisterRow[]) => boolean;
  notices?: (draft: RegisterRow[]) => React.ReactNode;
}) {
  const isRegister = config.mode === 'register' && !readOnly;
  const claimRows = useClaimRows();
  // Only needed by `signature` columns, which address a row by its index in this
  // project — the same index the bulk save writes as `rowOrder`.
  const { projectId } = useParams();
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  // SW-5: a gate that has passed freezes the cells it counted as evidence and the rows
  // they sit on, even while the register as a whole is still open to a later gate. The
  // server refuses the same writes with the same shared functions; this just stops the
  // table offering an edit it would reject. Only registers spanning several gates need
  // it — a single-gate register is wholly read-only via `readOnly`.
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  // SW-36: the locks are the consequence of closing signatures standing on this register — never of a gate passing by itself.
  const locks = useMemo(
    () => (project ? registerLocks(project, config) : { columns: new Map<string, string>(), rows: undefined }),
    [project, config],
  );
  const frozenBy = (columnKey: string) => locks.columns.get(columnKey);
  // Once a closure stands on a free-form register rows can be neither added nor removed.
  const rowsFrozen = locks.rows;
  const rowsFrozenReason = registerLockReason;
  // SW-34: important cells and rows are the register's assigned people's alone.
  const access = useRegisterAccess(project, config);
  const removeBlock = (row: RegisterRow) =>
    removeBlockedReason?.(row) ??
    (rowsFrozen ? rowsFrozenReason(rowsFrozen) : access.canChangeRows ? undefined : access.reason);
  const [openIndex, setOpenRaw] = useState<number | null>(null);
  // The row "Add row" just created, until the drawer moves off it. Closing the
  // drawer on it while it is still blank discards it (2026-10-03, user-reported:
  // opening a new row and pressing Close left an empty entry behind, which then
  // blocked Save as a blank row). Any way of leaving counts — the ✕, a click on
  // the mask, Esc, another drawer opening, or stepping to another row.
  const [freshIndex, setFreshIndex] = useState<number | null>(null);
  const setOpenIndex = (target: number | null) => {
    let next = target;
    if (freshIndex !== null && next !== freshIndex) {
      const row = draft[freshIndex];
      if (row && isRegisterRowBlank(config, row)) {
        update((prev) => prev.filter((_, i) => i !== freshIndex));
        if (next !== null && next > freshIndex) next -= 1;
      }
      setFreshIndex(null);
    }
    setOpenRaw(next);
  };
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  const markOwn = useCloseDrawerOnPageSave(dirty, openIndex !== null, () => setOpenIndex(null));
  // Discard (or a refused save that reloaded the data) can remove the very row the drawer shows — a row added in this draft.
  // The index is then stale: let go of it, and of the "fresh row" marker, so nothing reads or deletes a row by a dead index.
  useEffect(() => {
    if (openIndex !== null && openIndex >= draft.length) setOpenRaw(null);
    if (!dirty) setFreshIndex(null);
  }, [openIndex, draft.length, dirty]);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const screens = Grid.useBreakpoint();

  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  // Fewer than four columns: the table holds the whole row, so a drawer would only repeat it.
  const inlineAuto = inline === undefined && config.columns.length < 4;
  const inlineMode = inline ?? inlineAuto;
  // ...and when none of its columns can be edited either, it is a reference table: every column shown as text, nothing to open or fill in.
  const referenceMode = referenceTable ?? (inlineAuto && config.columns.every((c) => c.editable === false));
  const addRow = () => {
    // A generated ID (TR-001...) is shown at once, read-only; the server assigns the real one on save.
    update((prev) => previewAutoIds(config, [...prev, createEmptyRegisterRow(config.key)]));
    // Inline there is no drawer to open on the new row, and nothing to discard if it is left blank (the blank-row save guard covers it).
    if (inlineMode) return;
    setFreshIndex(draft.length);
    setOpenRaw(draft.length);
  };
  const removeRow = (index: number) => {
    // Defence in depth — the button is disabled for this case too.
    if (removeBlock(draft[index])) return;
    update((prev) => prev.filter((_, i) => i !== index));
    // Already removed — skip the blank-row discard so it is not removed twice.
    setFreshIndex(null);
    setOpenRaw(null);
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
  // Every reason Save is refused, in one list. It used to reach the user only
  // as a tooltip on a disabled button, so the screen showed a greyed-out Save
  // and nothing else — the same failure the gate decision dropdown had on
  // 2026-07-22, where hiding the option hid the reason with it. A disabled
  // control that does not say why reads as a broken button.
  // A column required because of another cell of the row (an Approved brief needs its approval date).
  const requiredProblems = readOnly ? [] : missingRequiredProblems(config, draft);
  const saveProblems = [
    ...(hasBlankRows
      ? ['One or more rows have no data entered — fill in at least one field, or remove the row.']
      : []),
    ...requiredProblems,
    ...(readOnly ? [] : duplicateValueProblems(config, draft)),
    ...blockers,
  ];
  // Resolves false when nothing was saved — a rule blocked it, or the server refused — so a drawer that closes on Save
  // stays open with what was typed, and the draft stays dirty to be corrected and tried again.
  const save = async (): Promise<boolean> => {
    if (hasBlankRows || blockers.length > 0 || requiredProblems.length > 0) return false;
    if ((await onSave(draft)) === false) return false;
    markSaved();
    return true;
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
      (tableColumns ?? config.listColumns)
        ? (tableColumns ?? config.listColumns)!.map((key) => config.columns.find((c) => c.key === key)).filter((c): c is RegisterColumn => !!c)
        : config.columns.slice(1).filter((c) => c !== subtitle && DECISION_TYPES.has(c.type)),
    [config.columns, config.listColumns, subtitle, tableColumns],
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

  // The gate that ENTERS the column — never a gate that merely reads it. Shown on EVERY column of a multi-gate register, with the
  // default applied: a column nobody declared belongs to the register's LAST gate (registerColumnGates.ts), so leaving it unlabelled
  // made Owner and Status read as belonging to no gate, or to the first one.
  const columnGate = (col: RegisterColumn) =>
    spansSeveralGates(config.gate)
      ? columnOwnerGateIds(config.key, col.key).map((id) => id.replace(/^SG/, '')).join('/') || undefined
      : undefined;

  // A fixed Owner / Person-in-charge function gets the project's person beside it ("Project owner — Chris").
  const shownText = (column: RegisterColumn, value: unknown) =>
    isOwnerFunctionColumn(column) ? ownerFunctionWithPeople(text(value), project?.identity.reviewers) : text(value);

  // One editor per column type, used by the table cells and the drawer alike.
  const renderEditor = (column: RegisterColumn, row: RegisterRow, index: number) => {
    // Before the custom renderer on purpose: a register with its own cell editors
    // (Supplier & RM Evidence, Published Info) falls back to the generic read-only cell
    // when told `readOnly`, so a frozen cell is reported to it the same way.
    const frozenGate = readOnly ? undefined : frozenBy(column.key);
    const custom = renderCell?.(column, row, index, {
      patch: (key, v) => patch(index, key, v),
      patchRow: (values) => update((prev) => patchArray(prev, index, values)),
      readOnly: !!readOnly || !!frozenGate || access.cellBlocked(column.key, row),
      draft,
    });
    if (custom !== undefined) return custom;

    // A gate reference is read-only by nature: shown as the gate it names, linking to it.
    if (column.gateLink) return <GateLink value={text(row[column.key])} />;

    const editable = column.editable !== false && !readOnly && !frozenGate && !access.cellBlocked(column.key, row);
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
            <span className="rt-static">
              {text(claim[column.inheritFromClaim === true ? column.key : column.inheritFromClaim]) || '—'}
            </span>
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
      const shown = (
        <span className="rt-static" style={column.type === 'number' ? NUMERIC_CELL : undefined}>
          {shownText(column, value) || '—'}
        </span>
      );
      return frozenGate ? (
        <Tooltip title={`Frozen — ${frozenGate} has passed or is signed. Withdraw the signature, or Backtrack, to change it.`}>{shown}</Tooltip>
      ) : (
        shown
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
        return (
          <RowRefSelect
            column={column}
            value={value as string | undefined}
            exclude={column.refRegister === config.key ? text(row[column.refColumn ?? '']) || undefined : undefined}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
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
        if (column.selfAttest) {
          return <SelfAttestField value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
        }
        return <UserSelect value={value as string | undefined} onChange={(v) => patch(index, column.key, v)} />;
      case 'select':
        return (
          <Select
            allowClear
            style={{ width: '100%' }}
            popupMatchSelectWidth={false}
            placeholder="Select…"
            value={(value as string | undefined) || undefined}
            options={(column.options ?? []).map((o) => ({
              value: o,
              label: o,
              // "Superseded" needs a finding to point at; with none, it is shown but cannot be chosen.
              ...(config.key === SAFETY_FINDINGS_REGISTER && column.key === 'findingStatus' && o === 'Superseded' && value !== 'Superseded' && !canChooseSuperseded(rows, index)
                ? { disabled: true, title: 'Needs another finding with a Finding ID to point at — save one first' }
                : {}),
            }))}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'date':
        return (
          <DatePicker
            style={{ width: '100%' }}
            status={isColumnRequiredFor(column, row) && !value ? 'error' : undefined}
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
            placeholder={placeholderFor(column, row)}
            value={value as string | undefined}
            onChange={(e) => patch(index, column.key, e.target.value)}
          />
        );
      case 'text':
      default:
        return (
          <Input
            placeholder={placeholderFor(column, row)}
            value={value as string | undefined}
            onChange={(e) => patch(index, column.key, e.target.value)}
          />
        );
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
          {name || <span className="rt-muted">{identity.autoId ? 'New — ID assigned on save' : isBlank(row) ? 'Empty row' : `Row ${index + 1}`}</span>}
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
    (c) => c.editable === false && c.type !== 'signature' && c !== identity && c !== subtitle && !c.autoId,
  );
  // The row's generated ID (TR-001...): shown first in the drawer as a read-only field, whichever column it is.
  const autoIdColumns = config.columns.filter((c) => c.autoId);
  const openRow = openIndex === null ? undefined : draft[openIndex];
  const step = (delta: number) => {
    if (openIndex === null || draft.length === 0) return;
    setOpenIndex((openIndex + delta + draft.length) % draft.length);
  };

  // Which fields of the detail drawer take a whole row. Long text always does; a short field pairs with the next short one,
  // and one left without a partner (before a long field, or last) takes the row itself — otherwise it sat alone in half a
  // row with nothing beside it, which made the form read as scattered.
  const fullWidthFields = (() => {
    const wide = (c: RegisterColumn) => c.type === 'textarea' || c.type === 'multiSelect' || c.type === 'signature';
    const full = new Set<number>();
    let i = 0;
    while (i < editable.length) {
      if (wide(editable[i])) {
        full.add(i);
        i += 1;
      } else if (i + 1 < editable.length && !wide(editable[i + 1])) {
        i += 2;
      } else {
        full.add(i);
        i += 1;
      }
    }
    return full;
  })();

  return (
    <div className={embedded ? 'rt' : 'concept-tokens rt c-card rt-standalone'}>
      {!embedded && (
        <div className="rt-head">
          <div className="rt-head-title">
            <span>{config.title}</span>
            {config.gate && (
              <span className="c-tag" title={spansSeveralGates(config.gate) ? `Used at Gates ${config.gate.split(/[/-]/).join(", ")}. Each column is settled at the gate shown on it; the table locks once all of them have passed.` : undefined}>
                Gate {config.gate}
              </span>
            )}
            {spansSeveralGates(config.gate) && <span className="rt-head-note">columns lock at the gate on their tag</span>}
            {readOnly && <span className="c-tag c-tag-ok"><LockOutlined />Read-only</span>}
          </div>
          {config.description && !hideDescription && <p className="rt-head-desc">{config.description}</p>}
          {reviewOwnerText && <p className="rt-head-desc">Review owner: {reviewOwnerText}</p>}
        </div>
      )}
      {!embedded && readOnly && (
        <div className="rt-lock">
          <LockOutlined />
          <span>{readOnlyReason ?? 'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}</span>
        </div>
      )}
      {saveProblems.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="rt-alert"
          title={saveProblems.length === 1 ? 'This cannot be saved yet' : `${saveProblems.length} things to fix before saving`}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {saveProblems.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          }
        />
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
        {!inlineMode && !referenceMode && (
          <div className="rt-count">
            {draft.length} {config.mode === 'register' ? (draft.length === 1 ? 'row' : 'rows') : 'items'}
          </div>
        )}
        {referenceMode ? (
          <table className="rt-table rt-reference">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.map((row, index) => (
                <tr key={index}>
                  {config.columns.map((col, ci) => (
                    <td key={col.key} className={ci === 0 ? 'rt-reference-label' : undefined}>
                      {text(row[col.key]) || <span className="rt-muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {draft.length === 0 && (
                <tr>
                  <td colSpan={config.columns.length} className="rt-empty">
                    No items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : inlineMode ? (
          <table className="rt-table rt-inline">
            {inlineAuto && (
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {isRegister && <th style={{ width: REMOVE_COLUMN }} aria-label="Remove" />}
                </tr>
              </thead>
            )}
            <tbody>
              {draft.map((row, index) => (
                <tr key={index} className={rowClass(row)}>
                  {config.columns.map((col, ci) =>
                    // A first column that holds a fixed label reads as the row's heading; one the person fills in (a category
                    // picked per row) is an input like the rest.
                    ci === 0 && col.editable === false ? (
                      <th key={col.key} scope="row" className="rt-inline-label">
                        {identityCell(row, index)}
                      </th>
                    ) : (
                      <td key={col.key}>{renderEditor(col, row, index)}</td>
                    ),
                  )}
                  {isRegister && (
                    <td className="rt-inline-act">
                      <Tooltip title={removeBlock(row)}>
                        <span>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Remove row"
                            disabled={!!removeBlock(row) || readOnly}
                            onClick={() => removeRow(index)}
                          />
                        </span>
                      </Tooltip>
                    </td>
                  )}
                </tr>
              ))}
              {draft.length === 0 && (
                <tr>
                  <td className="rt-empty" colSpan={config.columns.length + (isRegister ? 1 : 0)}>
                    No rows yet.{isRegister ? ' Add the first one below.' : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : tableMode ? (
          <table className="rt-table">
            <thead>
              <tr>
                <th>
                  <span className="rt-th-box">
                    <span className="rt-th" title={identity.label}>{identity.label}</span>
                    {columnGate(identity) && <span className="c-tag rt-gate" title={`This column is settled and locked at Gate ${columnGate(identity)}`}>G{columnGate(identity)}</span>}
                  </span>
                </th>
                {shown.map((col) => (
                  <th key={col.key} style={{ width: isTextColumn(col) ? TEXT_PREVIEW_WIDTH : DECISION_WIDTH }}>
                    <span className="rt-th-box">
                      <span className="rt-th" title={col.label}>{col.label}</span>
                      {columnGate(col) && <span className="c-tag rt-gate" title={`This column is settled and locked at Gate ${columnGate(col)}`}>G{columnGate(col)}</span>}
                    </span>
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
                      {isTextColumn(col) ? (<div className="rt-preview">{text(row[col.key]) || <span className="rt-muted">—</span>}</div>) : renderEditor(col, row, index)}
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
            <Tooltip title={rowsFrozen ? rowsFrozenReason(rowsFrozen) : access.canChangeRows ? addBlockedReason : access.reason}>
              <span style={{ display: 'block' }}>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addRow} disabled={!!rowsFrozen || !access.canChangeRows || !!addBlockedReason}>
                  Add row
                </Button>
              </span>
            </Tooltip>
            {extraActions?.(draft, update)}
          </div>
        )}
      </div>

      {dirty && (
        // Embedded in a page there is no card around it, so the bar is a padded card of its own.
        <div className={embedded ? 'page-savebar' : 'rt-savebar'}>
          <SaveBar
            dirty={dirty}
            onSave={save}
            onDiscard={discard}
            disabled={saveProblems.length > 0}
            disabledReason={saveProblems.join(' · ')}
          />
        </div>
      )}

      <Drawer
        open={!inlineMode && openRow !== undefined}
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
                <Button type="text" disabled={false} icon={<UpOutlined />} aria-label="Previous row" onClick={() => step(-1)} />
                <Button type="text" disabled={false} icon={<DownOutlined />} aria-label="Next row" onClick={() => step(1)} />
                <Button type="text" disabled={false} aria-label="Close" onClick={() => setOpenIndex(null)}>
                  ✕
                </Button>
              </div>
            </div>
          )
        }
        footer={
          !readOnly && openRow !== undefined && openIndex !== null ? (
            <div className="rt-drawer-foot">
              {/* No "Done" button: it only closed the drawer (the ✕ does that)
                  while reading as if the row were finished or saved. */}
              <DrawerSaveFooter
                dirty={dirty}
                onSave={save}
                onOwnAction={markOwn}
                // Save closes the drawer (project owner, 2026-10-12); Save & next is the way to keep walking the rows.
                onClose={() => setOpenIndex(null)}
                // The page-level rules that block Save (blank rows, validation) block it here too.
                disabled={saveProblems.length > 0}
                disabledReason={saveProblems[0]}
                leading={isRegister ? (
                  <>
              <Tooltip title={removeBlock(draft[openIndex])}>
                <span>
                  {/* No "Remove this row?" step: the removal only changes the draft, and Discard (or leaving the
                      page) brings the row back until the table is saved. */}
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={!!removeBlock(draft[openIndex])}
                    onClick={() => removeRow(openIndex)}
                  >
                    Remove row
                  </Button>
                </span>
              </Tooltip>
                  </>
                ) : undefined}
                onSaveAndNext={openIndex < draft.length - 1 ? async () => { const ok = await save(); if (ok) step(1); return ok; } : undefined}
              />
            </div>
          ) : undefined
        }
      >
        {openRow && openIndex !== null && (
          <div className="rt-sections">
            {(editable.length > 0 || autoIdColumns.length > 0) && (
              <section>
                <div className="rt-sec-title">{readOnly ? 'Details' : 'Edit'}</div>
                <div className="rt-grid">
                  {autoIdColumns.map((col) => (
                    <label key={col.key} className="rt-span-2">
                      <span className="rt-label">{col.label}</span>
                      <Input disabled value={text(openRow[col.key])} placeholder="Assigned on save" />
                      <span className="rt-help">Generated by the system, not typed.</span>
                    </label>
                  ))}
                  {editable.map((col, ci) => (
                    <label key={col.key} className={fullWidthFields.has(ci) ? 'rt-span-2' : undefined}>
                      <span className="rt-label">
                        {col.label}
                        {isColumnRequiredFor(col, openRow) && <RequiredMark met={!!openRow[col.key]} title="Required while the row is in this state" />}
                        {columnGate(col) && <span className="c-tag rt-gate" title={`This column is settled and locked at Gate ${columnGate(col)}`}>G{columnGate(col)}</span>}
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
                          (col.type === 'checkbox' ? (openRow[col.key] ? 'Yes' : 'No') : shownText(col, openRow[col.key]) || '—')}
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
