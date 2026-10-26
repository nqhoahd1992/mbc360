import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Grid, Input, InputNumber, Select, Tooltip } from 'antd';
import ChoiceSelect from './ChoiceSelect';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  MinusCircleOutlined,
  RightOutlined,
  UpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { NavGroup, RegisterConfig } from '@mbc360/shared/config/registers';
import {
  GATE4_DISPOSITION_OPTIONS,
  WATCHLIST_ASSESSMENT_MORE_INFO,
  WATCHLIST_ASSESSMENT_NON_CRITICAL,
} from '@mbc360/shared/config/registers';
import { ownerFunctionWithPeople } from '@mbc360/shared/config/reviewers';
import type { ProjectData, RegisterRow } from '@mbc360/shared/types';
import { bomWatchMatches, type WatchHit } from '@mbc360/shared/utils/ingredientWatch';
import {
  isFlaggedWatchlistRow,
  WATCHLIST_REGISTER,
  watchlistLinkedGate,
  WATCHLIST_AUTHORITY_LABEL,
  watchlistRequiredAuthority,
  watchlistHardBlockers,
  watchlistReviewGaps,
} from '@mbc360/shared/utils/watchlistReview';
import { patchArray, useDraft } from '../hooks/useDraft';
import { useRegisterFreeze } from '../hooks/useRegisterFreeze';
import DrawerSaveFooter from './DrawerSaveFooter';
import { useCloseDrawerOnPageSave } from '../hooks/useCloseDrawerOnPageSave';
import SaveBar from './SaveBar';
import { usePickerUsers } from '../hooks/useUserOptions';
import { useRegisterAccess } from '../hooks/useRegisterAccess';
import { useSession } from '../auth/useSession';
import GateLink from './GateLink';
import { useAppStore } from '../store/useAppStore';
import { usePermissionView } from '../auth/previewMode';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import NextActionSelect from './NextActionSelect';
import RegisterClosurePanel from './RegisterClosurePanel';
import { registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import RegisterPageHeader from './RegisterPageHeader';
import '../styles/concept.css';
import './WatchlistRegister.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

// Prohibited Ingredient Watch-list, redesigned 2026-10-02 (wireframe option A).
//
// The generic DynamicTable put all 19 columns side by side, so every column a
// reviewer actually WORKS in (product status, classification, the D3 review
// trail) sat past the right edge behind a horizontal scroll, under ~780px of
// identification and signing cards. Here the table keeps only what a decision is
// made with — the group, its Formula BOM match, the two dropdowns, whether the
// review is complete, the owner — and everything else opens in a drawer.
//
// Display only: every verdict on screen comes from the shared rule helpers
// (watchlistReview.ts, the `sg04-no-remove` value, GATE4_DISPOSITION_OPTIONS), so
// the table cannot disagree with what actually blocks Gate 04. Saving is the same
// bulk `onSave` the other register tables use.

const PROHIBITED_REMOVE = 'Prohibited - remove'; // the value `sg04-no-remove` blocks on
const EXCEEDS_LIMIT = 'Exceeds limit - reformulate'; // the caution list's direct block
const isBlockingStatus = (value: unknown) => value === PROHIBITED_REMOVE || value === EXCEEDS_LIMIT;
// "Gate 07" for a row linked to the 07_… gate; the register's own gate when the row names none.
const blocksGateLabel = (row: RegisterRow) => {
  const n = watchlistLinkedGate(row);
  return n === undefined ? 'the gate' : `Gate ${String(n).padStart(2, '0')}`;
};

type Filter = 'all' | 'action' | 'flagged' | 'done';
type RowState = 'blocks' | 'gaps' | 'critical' | 'open' | 'undispositioned' | 'done';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function columnOptions(config: RegisterConfig, key: string): { value: string; label: string }[] {
  const options = config.columns.find((c) => c.key === key)?.options ?? [];
  return options.map((o) => ({ value: o, label: o }));
}

export default function WatchlistRegister({
  project,
  config,
  rows,
  parent,
  onSave,
  readOnly,
  readOnlyReason,
  closeable,
}: {
  project: ProjectData;
  config: RegisterConfig;
  rows: RegisterRow[];
  parent?: NavGroup;
  // Resolve false when the server refused the write.
  onSave: (rows: RegisterRow[]) => void | boolean | Promise<unknown>;
  readOnly: boolean;
  readOnlyReason?: string;
  closeable: boolean;
}) {
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  // Cells frozen by a gate that has passed or is signed (SW-5, SW-24) are greyed out, as the server will refuse them.
  const freeze = useRegisterFreeze(project, config);
  // SW-34: important cells are the register's assigned people's alone (the Reviewer named on a row counts for that row).
  const access = useRegisterAccess(project, config);
  const [filter, setFilter] = useState<Filter>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  const markOwn = useCloseDrawerOnPageSave(dirty, openIndex !== null, () => setOpenIndex(null));
  const screens = Grid.useBreakpoint();

  const patch = (index: number, values: Partial<RegisterRow>) => update((prev) => patchArray(prev, index, values));

  // Evaluate the rules against the DRAFT, so the counts and per-row states move as
  // the user edits rather than only after Save.
  const draftProject = useMemo<ProjectData>(
    () => ({ ...project, registers: { ...project.registers, [config.key]: draft } }),
    [project, config.key, draft],
  );
  const hardBlocked = useMemo(() => new Set(watchlistHardBlockers(draftProject)), [draftProject]);
  const bomHits = useMemo(() => {
    const byGroup = new Map<string, { line: number; inciName: string; hit: WatchHit }[]>();
    for (const match of bomWatchMatches(project)) {
      for (const hit of match.hits) {
        if (hit.kind !== (config.key === WATCHLIST_REGISTER ? 'prohibited' : 'pbCaution')) continue;
        byGroup.set(hit.group, [...(byGroup.get(hit.group) ?? []), { line: match.line, inciName: match.inciName, hit }]);
      }
    }
    return byGroup;
  }, [project, config.key]);

  const dispositioned = (row: RegisterRow) =>
    (GATE4_DISPOSITION_OPTIONS as readonly string[]).includes(text(row.gate4Disposition));

  const rowState = (row: RegisterRow): RowState => {
    if (isBlockingStatus(text(row.productStatus))) return 'blocks';
    if (isFlaggedWatchlistRow(row)) {
      if (watchlistReviewGaps(draftProject, row).length > 0) return 'gaps';
      if (hardBlocked.has(row)) return 'critical';
      if (text(row.resolutionStatus) !== 'Closed') return 'open';
    }
    if (!dispositioned(row)) return 'undispositioned';
    return 'done';
  };

  const states = draft.map(rowState);
  const counts = {
    all: draft.length,
    action: states.filter((s) => s !== 'done').length,
    flagged: draft.filter((r, i) => isFlaggedWatchlistRow(r) || states[i] === 'blocks').length,
    done: states.filter((s) => s === 'done').length,
    dispositioned: draft.filter(dispositioned).length,
    blocking: states.filter((s) => s === 'blocks').length,
    reviewOpen: states.filter((s) => s === 'gaps' || s === 'critical' || s === 'open').length,
    bomMatches: draft.reduce((n, r) => n + (bomHits.get(text(r.ingredientGroup))?.length ?? 0), 0),
  };

  const visible = draft
    .map((row, index) => ({ row, index, state: states[index] }))
    .filter(({ row, state }) =>
      filter === 'all'
        ? true
        : filter === 'action'
          ? state !== 'done'
          : filter === 'flagged'
            ? isFlaggedWatchlistRow(row) || state === 'blocks'
            : state === 'done',
    );

  const save = async (): Promise<boolean> => {
    if ((await onSave(draft)) === false) return false;
    markSaved();
    return true;
  };

  const stateCell = (row: RegisterRow, state: RowState) => {
    switch (state) {
      case 'blocks':
        return <span className="wl-state wl-state-bad"><CloseCircleOutlined />Blocks {blocksGateLabel(row)}</span>;
      case 'gaps': {
        const gaps = watchlistReviewGaps(draftProject, row);
        return (
          <Tooltip title={`Missing: ${gaps.join(', ')}`}>
            <span className="wl-state wl-state-warn"><ExclamationCircleOutlined />{gaps.length} missing</span>
          </Tooltip>
        );
      }
      case 'critical':
        return <span className="wl-state wl-state-bad"><CloseCircleOutlined />Critical</span>;
      case 'open':
        return <span className="wl-state wl-state-open"><ClockCircleOutlined />{text(row.resolutionStatus) || 'Open'}</span>;
      case 'undispositioned':
        return <span className="wl-state wl-state-muted"><MinusCircleOutlined />Not dispositioned</span>;
      default:
        return <span className="wl-state wl-state-ok"><CheckCircleOutlined />Done</span>;
    }
  };

  // The workbook names a FUNCTION ("Regulatory"); on this project that function is somebody ("Regulatory — Chi Chu").
  const ownerLabel = (row: RegisterRow) => ownerFunctionWithPeople(text(row.owner), project.identity.reviewers);
  const owner = (row: RegisterRow) => {
    const name = text(row.owner);
    if (!name) return <span className="wl-muted">—</span>;
    return (
      <span className="wl-owner">
        <span>{ownerLabel(row)}</span>
      </span>
    );
  };

  const productStatusSelect = (row: RegisterRow, index: number) => (
    <Select
      style={{ width: '100%' }}
      value={text(row.productStatus) || undefined}
      placeholder="Select…"
      options={columnOptions(config, 'productStatus')}
      disabled={readOnly || freeze.isFrozen('productStatus') || access.cellBlocked('productStatus', row)}
      popupMatchSelectWidth={false}
      onChange={(v: string) => patch(index, { productStatus: v })}
    />
  );
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const pct = counts.all ? Math.round((counts.dispositioned / counts.all) * 100) : 0;
  const chips: [Filter, string, number][] = [
    ['all', 'All', counts.all],
    ['action', 'Needs action', counts.action],
    ['flagged', 'Flagged', counts.flagged],
    ['done', 'Done', counts.done],
  ];

  // Drawer navigation walks the rows currently in view, in register order.
  const openRow = openIndex === null ? undefined : draft[openIndex];
  // A stale index (the row is gone after Discard) is dropped, not read.
  useEffect(() => {
    if (openIndex !== null && openIndex >= draft.length) setOpenIndex(null);
  }, [openIndex, draft.length]);
  const position = visible.findIndex((v) => v.index === openIndex);
  const step = (delta: number) => {
    if (visible.length === 0) return;
    const next = visible[(position + delta + visible.length) % visible.length];
    setOpenIndex(next.index);
  };

  return (
    <div className="concept">
      <RegisterPageHeader
        project={project}
        config={config}
        parent={parent}
        readOnly={readOnly}
        readOnlyReason={readOnlyReason}
      />

      <div className="c-card wl-summary">
        <div className="wl-progress">
          <div className="wl-label">Classification</div>
          <div className="wl-big">
            <b>{counts.dispositioned}</b>
            <span>of {counts.all} groups</span>
          </div>
          <div className="wl-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={counts.dispositioned === counts.all ? 'wl-bar-done' : undefined} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <dl className="wl-counts">
          <div>
            <dt className="wl-label">Blocking a gate</dt>
            <dd className={counts.blocking ? 'wl-bad-text' : undefined}>{counts.blocking}</dd>
          </div>
          <div>
            <dt className="wl-label">Flagged, review open</dt>
            <dd className={counts.reviewOpen ? 'wl-warn-text' : undefined}>{counts.reviewOpen}</dd>
          </div>
          <div>
            <dt className="wl-label">Formula BOM matches</dt>
            <dd>{counts.bomMatches}</dd>
          </div>
        </dl>
      </div>

      <div className="wl-chips" role="group" aria-label="Filter rows">
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" className="wl-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <b>{n}</b>
          </button>
        ))}
      </div>

      <div className="c-card wl-tablecard">
        <table className="wl-table">
          <thead>
            <tr>
              <th>Ingredient / group</th>
              <th style={{ width: 200 }}>Product status</th>
              <th style={{ width: 160 }}>Review</th>
              <th className="wl-col-owner" style={{ width: 190 }}>Owner</th>
              <th style={{ width: 36 }} aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, index, state }) => (
              <tr
                key={index}
                className="wl-row"
                aria-selected={openIndex === index}
                onClick={() => setOpenIndex(index)}
              >
                <td>
                  <div className="wl-name" title={text(row.ingredientGroup)}>{text(row.ingredientGroup)}</div>
                  <div className="wl-fn">{text(row.functionRole)}</div>
                </td>
                <td onClick={stop}>{productStatusSelect(row, index)}</td>
                <td>{stateCell(row, state)}</td>
                <td className="wl-col-owner">{owner(row)}</td>
                <td className="wl-chev"><RightOutlined /></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="wl-empty">Nothing in this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
        <ul className="wl-list">
          {visible.map(({ row, index, state }) => (
            <li key={index} className="wl-row" aria-selected={openIndex === index} onClick={() => setOpenIndex(index)}>
              <div className="wl-list-head">
                <div style={{ minWidth: 0 }}>
                  <div className="wl-name" style={{ whiteSpace: 'normal' }}>{text(row.ingredientGroup)}</div>
                  <div className="wl-fn">{text(row.functionRole)}</div>
                </div>
                <RightOutlined className="wl-chev" style={{ marginTop: 4 }} />
              </div>
              <div className="wl-list-meta">
                {stateCell(row, state)}
              </div>
              <div className="wl-list-controls" onClick={stop}>
                {productStatusSelect(row, index)}
              </div>
            </li>
          ))}
          {visible.length === 0 && <li className="wl-empty">Nothing in this filter.</li>}
        </ul>
      </div>

      {dirty && !readOnly && (
        <div className="page-savebar">
          <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
        </div>
      )}

      {closeable && registerReviewSpec(config) && (
        <RegisterClosurePanel
          projectId={project.identity.id}
          registerKey={config.key}
          spec={registerReviewSpec(config)!}
          reviewers={project.identity.reviewers}
          closures={project.registerClosures}
        />
      )}

      <Drawer
        open={openRow !== undefined}
        onClose={() => setOpenIndex(null)}
        size={screens.md ? 560 : '100%'}
        mask={!screens.xxl}
        closable={false}
        rootClassName="concept-tokens"
        footer={
          readOnly ? undefined : (
            <DrawerSaveFooter
              dirty={dirty}
              onSave={save}
              onOwnAction={markOwn}
              onClose={() => setOpenIndex(null)}
              // Walks to the next row IN VIEW. There is none after the last one, so the button is absent
              // there rather than wrapping round to the first (the arrows in the header still wrap).
              onSaveAndNext={position >= 0 && position < visible.length - 1 ? async () => { const ok = await save(); if (ok) step(1); return ok; } : undefined}
            />
          )
        }
        title={
          openRow && (
            <div className="wl-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="wl-drawer-count">
                  {position + 1} of {visible.length}
                </div>
                <div className="wl-drawer-name">{text(openRow.ingredientGroup)}</div>
                <div className="wl-drawer-tags">
                  <ProductStatusTag value={text(openRow.productStatus)} />
                  <span className="wl-drawer-fn">{text(openRow.functionRole)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button type="text" disabled={false} icon={<UpOutlined />} aria-label="Previous group" onClick={() => step(-1)} />
                <Button type="text" disabled={false} icon={<DownOutlined />} aria-label="Next group" onClick={() => step(1)} />
                <Button type="text" disabled={false} aria-label="Close" onClick={() => setOpenIndex(null)}>✕</Button>
              </div>
            </div>
          )
        }
      >
        {openRow && openIndex !== null && (
          <RowDetail
            config={config}
            row={openRow}
            gaps={watchlistReviewGaps(draftProject, openRow)}
            hits={bomHits.get(text(openRow.ingredientGroup)) ?? []}
            readOnly={readOnly}
            isFrozen={(key) => freeze.isFrozen(key) || access.cellBlocked(key, openRow)}
            onPatch={(values) => patch(openIndex, values)}
            reviewers={project.identity.reviewers}
          />
        )}
      </Drawer>
    </div>
  );
}

function ProductStatusTag({ value }: { value: string }) {
  const tone =
    isBlockingStatus(value)
      ? 'c-tag-bad'
      : isFlaggedWatchlistRow({ productStatus: value } as RegisterRow)
        ? 'c-tag-warn'
        : value === 'No formula match recorded' || !value
          ? ''
          : 'c-tag-ok';
  return <span className={`c-tag c-tag-dot ${tone}`}>{value || 'No status'}</span>;
}

function RowDetail({
  config,
  row,
  gaps,
  hits,
  readOnly,
  isFrozen,
  onPatch,
  reviewers,
}: {
  config: RegisterConfig;
  row: RegisterRow;
  // The project's review owners, to put a person beside the Owner function.
  reviewers: Record<string, string> | undefined;
  gaps: string[];
  hits: { line: number; inciName: string; hit: WatchHit }[];
  readOnly: boolean;
  // True for a column frozen by a gate that has passed or is signed.
  isFrozen: (columnKey: string) => boolean;
  onPatch: (values: Partial<RegisterRow>) => void;
}) {
  const off = (columnKey: string) => readOnly || isFrozen(columnKey);
  const flagged = isFlaggedWatchlistRow(row);
  // The two lists name a few columns differently (the sheets' own headers); the label comes from whichever the register has.
  const label = (...keys: string[]) => keys.map((k) => config.columns.find((c) => c.key === k)?.label).find(Boolean) ?? '';
  const hasExposureText = config.columns.some((c) => c.key === 'formulaExposure');
  const hasTrailData = ['reviewerAssessment', 'reviewer', 'reviewDate', 'reviewRationale', 'linkedNextActionId'].some(
    (k) => text(row[k]) !== '',
  );
  // D3's trail applies to flagged results. It stays visible on any row that
  // already carries trail data, so un-flagging a row never hides what was recorded.
  const showTrail = flagged || hasTrailData || isBlockingStatus(text(row.productStatus));
  const req = flagged ? 'wl-field-label wl-req' : 'wl-field-label';
  // SW-32: assessing a finding as one that may be carried under Proceed with Conditions IS the acceptance, so it needs the
  // authority this finding names (its status, else its Owner). The server refuses it otherwise; here the two verdicts are
  // simply not offered to someone who lacks it. [ASSUMPTION: R5-Q67]
  const { isAdmin } = usePermissionView();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const needs = watchlistRequiredAuthority(row);
  const needsLabel = needs.map((a) => WATCHLIST_AUTHORITY_LABEL[a]).join(' or ');
  // Who may be this finding's Reviewer: users holding the authority it needs. Who may record the acceptance: that Reviewer.
  const holdsAuthority = (keys: string[] | undefined) => needs.some((a) => hasCapability(grants, keys ?? [], `watchlist-finding|accept-${a}`));
  const pickerUsers = usePickerUsers();
  const me = useSession().user?.displayName;
  const reviewerName = text(row.reviewer);
  const reviewerOptions = pickerUsers
    .filter((u) => holdsAuthority(u.roleKeys) || u.displayName === reviewerName)
    .map((u) => ({ value: u.displayName, label: u.displayName }));
  const reviewerFit = reviewerName !== '' && pickerUsers.some((u) => u.displayName === reviewerName && holdsAuthority(u.roleKeys));
  const canCarry = isAdmin || (!!me && me === reviewerName);
  const carriedVerdicts = [WATCHLIST_ASSESSMENT_NON_CRITICAL, WATCHLIST_ASSESSMENT_MORE_INFO];

  return (
    <div className="wl-sections">
      <section>
        <div className="wl-sec-title">Reference</div>
        <dl className="wl-dl">
          <dt>Function</dt>
          <dd>{text(row.functionRole)}</dd>
          <dt>{label('statusLevel', 'statusLimitGuidance')}</dt>
          <dd>{text(row.statusLevel) || text(row.statusLimitGuidance)}</dd>
          <dt>{label('whyItMatters', 'whyCautionRequired')}</dt>
          <dd>{text(row.whyItMatters) || text(row.whyCautionRequired)}</dd>
          <dt>Applicable products</dt>
          <dd>{text(row.applicableProducts)}</dd>
          <dt>Reference / source</dt>
          <dd>{text(row.referenceSource) || '—'}</dd>
        </dl>
      </section>

      <section>
        <div className="wl-sec-title">Formula BOM screen</div>
        {hits.length ? (
          <ul className="wl-bom">
            {hits.map(({ line, inciName, hit }) => (
              <li key={`${line}-${hit.matchedValue}`}>
                <ExperimentOutlined />
                <span>
                  <b>Line {line} · {inciName || '(no INCI name)'}</b>
                  <span>
                    Matched by {hit.matchedBy === 'cas' ? `CAS ${hit.matchedValue}` : `name (“${hit.matchedValue}”)`} · automatic, from the Formula BOM
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wl-muted" style={{ margin: 0 }}>No Formula BOM line matches this group by CAS number or INCI name.</p>
        )}
      </section>

      <section>
        <div className="wl-sec-title">1 · Recording the finding</div>
        <p className="wl-sec-note">What the screening found and how it is classified. Whoever screens the formula records this.</p>
        <div className="wl-grid">
          <label className="wl-span-2">
            <span className="wl-field-label">Status</span>
            <Select
              style={{ width: '100%' }}
              value={text(row.status) || undefined}
              options={columnOptions(config, 'status')}
              disabled={off('status')}
              onChange={(v: string) => onPatch({ status: v })}
            />
          </label>
          <label className="wl-span-2">
            <span className="wl-field-label">{label('formulaMatchCount', 'formulaExposure')}</span>
            {hasExposureText ? (
              <Input
                value={text(row.formulaExposure)}
                disabled={off('formulaExposure')}
                onChange={(e) => onPatch({ formulaExposure: e.target.value })}
              />
            ) : (
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={typeof row.formulaMatchCount === 'number' ? row.formulaMatchCount : undefined}
                // Counted from the Formula BOM, not entered (utils/registerDerived.ts).
                disabled
                onChange={(v) => onPatch({ formulaMatchCount: v ?? undefined })}
              />
            )}
          </label>
          <label className="wl-span-2">
            <span className="wl-field-label">Product status</span>
            <Select
              style={{ width: '100%' }}
              value={text(row.productStatus) || undefined}
              options={columnOptions(config, 'productStatus')}
              disabled={off('productStatus')}
              onChange={(v: string) => onPatch({ productStatus: v })}
            />
            {typeof row.formulaMatchCount === 'number' && row.formulaMatchCount > 0 && text(row.productStatus) === 'REVIEW - possible formula match' && (
              <span className="wl-help">
                The Formula BOM has {row.formulaMatchCount} {row.formulaMatchCount === 1 ? 'line' : 'lines'} matching this row, so the status is set to review. To clear it, record your conclusion here
                (for example &quot;Not present - evidence linked&quot; or &quot;Present within restriction&quot;) — or fix the ingredient on the Formula BOM.
              </span>
            )}
          </label>
          <label className="wl-span-2">
            <span className="wl-field-label">Evidence link</span>
            <Input
              value={text(row.evidenceLink)}
              placeholder="Link to CoA, supplier declaration or report"
              disabled={off('evidenceLink')}
              onChange={(e) => onPatch({ evidenceLink: e.target.value })}
            />
          </label>
          <label className="wl-span-2">
            <span className="wl-field-label wl-req">Classification</span>
            <Select
              style={{ width: '100%' }}
              value={text(row.gate4Disposition) || undefined}
              placeholder="Not dispositioned"
              allowClear
              options={columnOptions(config, 'gate4Disposition')}
              disabled={off('gate4Disposition')}
              onChange={(v?: string) => onPatch({ gate4Disposition: v ?? '' })}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="wl-sec-title">
          2 · Handling the finding
          {flagged && (gaps.length ? <span className="c-tag c-tag-warn">{gaps.length} missing</span> : <span className="c-tag c-tag-ok">Complete</span>)}
        </div>
        {showTrail ? (
          <>
            {flagged && (
              <p className="wl-sec-note">
                A qualified reviewer assesses the finding and records what is done about it. Required for a flagged result before its gate
                can move. A note alone is not sufficient — link a controlled Next Action.
              </p>
            )}
            {flagged && (
              <p className={`wl-sec-note${canCarry ? '' : ' wl-sec-warn'}`}>
                {canCarry
                  ? `Assessing this finding as Non-critical or Further information required lets it be carried under Proceed with Conditions, so it is the acceptance. You are its Reviewer, so you can record it.`
                  : reviewerName === ''
                    ? `Assessing this finding as Non-critical or Further information required lets it be carried under Proceed with Conditions, so it is the acceptance. Pick its Reviewer below (a user with ${needsLabel} authority); only the Reviewer records those two assessments.`
                    : `Assessing this finding as Non-critical or Further information required lets it be carried under Proceed with Conditions, so it is the acceptance. Only its Reviewer, ${reviewerName}, records those two assessments.`}
              </p>
            )}
            <div className="wl-grid">
              <label className="wl-span-2">
                <span className={req}>Reviewer assessment</span>
                <ChoiceSelect
                  value={text(row.reviewerAssessment) || undefined}
                  placeholder="Select…"
                  allowClear
                  options={columnOptions(config, 'reviewerAssessment').map((o) => ({ ...o, disabled: !canCarry && carriedVerdicts.includes(o.value) }))}
                  disabled={off('reviewerAssessment')}
                  onChange={(v) => onPatch({ reviewerAssessment: v ?? '' })}
                />
              </label>
              <label className="wl-span-2">
                <span className="wl-field-label">Resolution status</span>
                <ChoiceSelect
                  value={text(row.resolutionStatus) || undefined}
                  placeholder="Select…"
                  allowClear
                  options={columnOptions(config, 'resolutionStatus')}
                  disabled={off('resolutionStatus')}
                  onChange={(v) => onPatch({ resolutionStatus: v ?? '' })}
                />
              </label>
              <label className="wl-span-2">
                <span className={req}>Reviewer</span>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  value={reviewerName || undefined}
                  placeholder={`Select a user with ${needsLabel} authority`}
                  options={reviewerOptions}
                  status={reviewerName !== '' && pickerUsers.length > 0 && !reviewerFit ? 'warning' : undefined}
                  disabled={off('reviewer')}
                  onChange={(v?: string) => onPatch({ reviewer: v ?? '' })}
                />
              </label>
              <label className="wl-span-2">
                <span className={req}>Review date</span>
                <DatePicker
                  style={{ width: '100%' }}
                  value={text(row.reviewDate) ? dayjs(text(row.reviewDate)) : null}
                  disabled={off('reviewDate')}
                  onChange={(d) => onPatch({ reviewDate: d ? d.format('YYYY-MM-DD') : '' })}
                />
              </label>
              <label className="wl-span-2">
                <span className={req}>Rationale</span>
                <Input.TextArea
                  autoSize={{ minRows: 3 }}
                  value={text(row.reviewRationale)}
                  placeholder="Why this assessment"
                  disabled={off('reviewRationale')}
                  onChange={(e) => onPatch({ reviewRationale: e.target.value })}
                />
              </label>
              <label className="wl-span-2">
                <span className="wl-field-label">Linked Next Action</span>
                <NextActionSelect value={text(row.linkedNextActionId) || undefined} disabled={off('linkedNextActionId')} onChange={(v) => onPatch({ linkedNextActionId: v })} />
              </label>
            </div>
          </>
        ) : (
          <p className="wl-muted" style={{ margin: 0 }}>
            Only needed when the product status is flagged (possible match, Needs Safety / Regulatory Review), Prohibited or over its limit.
          </p>
        )}
      </section>

      <section>
        <div className="wl-sec-title">Row details</div>
        <dl className="wl-dl">
          <dt>Owner (department)</dt>
          <dd>{ownerFunctionWithPeople(text(row.owner), reviewers) || '—'}</dd>
          <dt>Linked gate</dt>
          <dd><GateLink value={text(row.linkedGate)} /></dd>
          <dt>Notes</dt>
          <dd>{text(row.notes) || '—'}</dd>
        </dl>
      </section>
    </div>
  );
}
