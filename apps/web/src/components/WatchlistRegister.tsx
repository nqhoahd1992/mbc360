import { useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Grid, Input, InputNumber, Select, Tooltip } from 'antd';
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
import { GATE4_DISPOSITION_OPTIONS } from '@mbc360/shared/config/registers';
import type { ProjectData, RegisterRow } from '@mbc360/shared/types';
import { bomWatchMatches, type WatchHit } from '@mbc360/shared/utils/ingredientWatch';
import {
  isFlaggedWatchlistRow,
  watchlistHardBlockers,
  watchlistReviewGaps,
} from '@mbc360/shared/utils/watchlistReview';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import NextActionSelect from './NextActionSelect';
import RegisterClosurePanel from './RegisterClosurePanel';
import RegisterPageHeader from './RegisterPageHeader';
import '../styles/concept.css';
import './WatchlistRegister.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

// Prohibited Ingredient Watch-list, redesigned 2026-10-02 (wireframe option A).
//
// The generic DynamicTable put all 19 columns side by side, so every column a
// reviewer actually WORKS in (product status, Gate 4 disposition, the D3 review
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
  onSave: (rows: RegisterRow[]) => void;
  readOnly: boolean;
  readOnlyReason?: string;
  closeable: boolean;
}) {
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const [filter, setFilter] = useState<Filter>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
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
        if (hit.kind !== 'prohibited') continue;
        byGroup.set(hit.group, [...(byGroup.get(hit.group) ?? []), { line: match.line, inciName: match.inciName, hit }]);
      }
    }
    return byGroup;
  }, [project]);

  const dispositioned = (row: RegisterRow) =>
    (GATE4_DISPOSITION_OPTIONS as readonly string[]).includes(text(row.gate4Disposition));

  const rowState = (row: RegisterRow): RowState => {
    if (text(row.productStatus) === PROHIBITED_REMOVE) return 'blocks';
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

  const save = () => {
    onSave(draft);
    markSaved();
  };

  const stateCell = (row: RegisterRow, state: RowState) => {
    switch (state) {
      case 'blocks':
        return <span className="wl-state wl-state-bad"><CloseCircleOutlined />Blocks Gate 04</span>;
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

  const bomCell = (row: RegisterRow) => {
    const hits = bomHits.get(text(row.ingredientGroup)) ?? [];
    return hits.length ? (
      <span className="c-tag c-tag-warn"><ExperimentOutlined />{hits.length} BOM line{hits.length > 1 ? 's' : ''}</span>
    ) : (
      <span className="wl-muted">No match</span>
    );
  };

  const owner = (row: RegisterRow) => {
    const name = text(row.owner);
    if (!name) return <span className="wl-muted">—</span>;
    const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    return (
      <span className="wl-owner">
        <span className="wl-initials" aria-hidden="true">{initials}</span>
        <span>{name}</span>
      </span>
    );
  };

  const productStatusSelect = (row: RegisterRow, index: number) => (
    <Select
      style={{ width: '100%' }}
      value={text(row.productStatus) || undefined}
      placeholder="Select…"
      options={columnOptions(config, 'productStatus')}
      disabled={readOnly}
      popupMatchSelectWidth={false}
      onChange={(v: string) => patch(index, { productStatus: v })}
    />
  );
  const dispositionSelect = (row: RegisterRow, index: number) => (
    <Select
      style={{ width: '100%' }}
      value={text(row.gate4Disposition) || undefined}
      placeholder="Not dispositioned"
      allowClear
      options={columnOptions(config, 'gate4Disposition')}
      disabled={readOnly}
      popupMatchSelectWidth={false}
      onChange={(v?: string) => patch(index, { gate4Disposition: v ?? '' })}
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
          <div className="wl-label">Gate 04 disposition</div>
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
            <dt className="wl-label">Blocking Gate 04</dt>
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
              <th style={{ width: 128 }}>Formula BOM</th>
              <th style={{ width: 200 }}>Product status</th>
              <th style={{ width: 200 }}>Gate 4 disposition</th>
              <th style={{ width: 160 }}>Review</th>
              <th className="wl-col-owner" style={{ width: 132 }}>Owner</th>
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
                <td>{bomCell(row)}</td>
                <td onClick={stop}>{productStatusSelect(row, index)}</td>
                <td onClick={stop}>{dispositionSelect(row, index)}</td>
                <td>{stateCell(row, state)}</td>
                <td className="wl-col-owner">{owner(row)}</td>
                <td className="wl-chev"><RightOutlined /></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="wl-empty">Nothing in this filter.</td>
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
                {bomCell(row)}
                {stateCell(row, state)}
              </div>
              <div className="wl-list-controls" onClick={stop}>
                {productStatusSelect(row, index)}
                {dispositionSelect(row, index)}
              </div>
            </li>
          ))}
          {visible.length === 0 && <li className="wl-empty">Nothing in this filter.</li>}
        </ul>
      </div>

      {dirty && !readOnly && (
        <div className="wl-savebar">
          <div>
            <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
          </div>
        </div>
      )}

      {closeable && config.reviewOwner && (
        <RegisterClosurePanel
          projectId={project.identity.id}
          registerKey={config.key}
          spec={config.reviewOwner}
          reviewers={project.identity.reviewers}
          closure={project.registerClosures[config.key]}
        />
      )}

      <Drawer
        open={openRow !== undefined}
        onClose={() => setOpenIndex(null)}
        size={screens.md ? 560 : '100%'}
        mask={!screens.xxl}
        closable={false}
        rootClassName="concept-tokens"
        footer={readOnly ? undefined : <span className="wl-muted">Changes stay in this section's draft until you Save it.</span>}
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
                <Button type="text" icon={<UpOutlined />} aria-label="Previous group" onClick={() => step(-1)} />
                <Button type="text" icon={<DownOutlined />} aria-label="Next group" onClick={() => step(1)} />
                <Button type="text" aria-label="Close" onClick={() => setOpenIndex(null)}>✕</Button>
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
            onPatch={(values) => patch(openIndex, values)}
          />
        )}
      </Drawer>
    </div>
  );
}

function ProductStatusTag({ value }: { value: string }) {
  const tone =
    value === PROHIBITED_REMOVE
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
  onPatch,
}: {
  config: RegisterConfig;
  row: RegisterRow;
  gaps: string[];
  hits: { line: number; inciName: string; hit: WatchHit }[];
  readOnly: boolean;
  onPatch: (values: Partial<RegisterRow>) => void;
}) {
  const flagged = isFlaggedWatchlistRow(row);
  const hasTrailData = ['reviewerAssessment', 'reviewer', 'reviewDate', 'reviewRationale', 'linkedNextActionId'].some(
    (k) => text(row[k]) !== '',
  );
  // D3's trail applies to flagged results. It stays visible on any row that
  // already carries trail data, so un-flagging a row never hides what was recorded.
  const showTrail = flagged || hasTrailData || text(row.productStatus) === PROHIBITED_REMOVE;
  const req = flagged ? 'wl-field-label wl-req' : 'wl-field-label';

  return (
    <div className="wl-sections">
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
        <div className="wl-sec-title">Screening &amp; disposition</div>
        <div className="wl-grid">
          <label className="wl-span-2">
            <span className="wl-field-label">Product status</span>
            <Select
              style={{ width: '100%' }}
              value={text(row.productStatus) || undefined}
              options={columnOptions(config, 'productStatus')}
              disabled={readOnly}
              onChange={(v: string) => onPatch({ productStatus: v })}
            />
          </label>
          <label>
            <span className="wl-field-label wl-req">Gate 4 disposition</span>
            <Select
              style={{ width: '100%' }}
              value={text(row.gate4Disposition) || undefined}
              placeholder="Not dispositioned"
              allowClear
              options={columnOptions(config, 'gate4Disposition')}
              disabled={readOnly}
              onChange={(v?: string) => onPatch({ gate4Disposition: v ?? '' })}
            />
          </label>
          <label>
            <span className="wl-field-label">Owner</span>
            <UserSelect value={text(row.owner) || undefined} disabled={readOnly} placeholder="Select a user" onChange={(v) => onPatch({ owner: v ?? '' })} />
          </label>
          <label>
            <span className="wl-field-label">Formula match count</span>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={typeof row.formulaMatchCount === 'number' ? row.formulaMatchCount : undefined}
              disabled={readOnly}
              onChange={(v) => onPatch({ formulaMatchCount: v ?? undefined })}
            />
          </label>
          <label className="wl-span-2">
            <span className="wl-field-label">Evidence link</span>
            <Input
              value={text(row.evidenceLink)}
              placeholder="Link to CoA, supplier declaration or report"
              disabled={readOnly}
              onChange={(e) => onPatch({ evidenceLink: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="wl-sec-title">
          Review trail
          {flagged && (gaps.length ? <span className="c-tag c-tag-warn">{gaps.length} missing</span> : <span className="c-tag c-tag-ok">Complete</span>)}
        </div>
        {showTrail ? (
          <>
            {flagged && (
              <p className="wl-sec-note">
                Required for a flagged result before Gate 04 can move. A note alone is not sufficient — link a controlled Next Action.
              </p>
            )}
            <div className="wl-grid">
              <label>
                <span className={req}>Reviewer assessment</span>
                <Select
                  style={{ width: '100%' }}
                  value={text(row.reviewerAssessment) || undefined}
                  placeholder="Select…"
                  allowClear
                  options={columnOptions(config, 'reviewerAssessment')}
                  disabled={readOnly}
                  onChange={(v?: string) => onPatch({ reviewerAssessment: v ?? '' })}
                />
              </label>
              <label>
                <span className="wl-field-label">Resolution status</span>
                <Select
                  style={{ width: '100%' }}
                  value={text(row.resolutionStatus) || undefined}
                  placeholder="Select…"
                  allowClear
                  options={columnOptions(config, 'resolutionStatus')}
                  disabled={readOnly}
                  onChange={(v?: string) => onPatch({ resolutionStatus: v ?? '' })}
                />
              </label>
              <label>
                <span className={req}>Reviewer</span>
                <UserSelect value={text(row.reviewer) || undefined} disabled={readOnly} placeholder="Select a user" onChange={(v) => onPatch({ reviewer: v ?? '' })} />
              </label>
              <label>
                <span className={req}>Review date</span>
                <DatePicker
                  style={{ width: '100%' }}
                  value={text(row.reviewDate) ? dayjs(text(row.reviewDate)) : null}
                  disabled={readOnly}
                  onChange={(d) => onPatch({ reviewDate: d ? d.format('YYYY-MM-DD') : '' })}
                />
              </label>
              <label className="wl-span-2">
                <span className={req}>Rationale</span>
                <Input.TextArea
                  autoSize={{ minRows: 3 }}
                  value={text(row.reviewRationale)}
                  placeholder="Why this assessment"
                  disabled={readOnly}
                  onChange={(e) => onPatch({ reviewRationale: e.target.value })}
                />
              </label>
              <label className="wl-span-2">
                <span className="wl-field-label">Linked Next Action</span>
                <NextActionSelect value={text(row.linkedNextActionId) || undefined} disabled={readOnly} onChange={(v) => onPatch({ linkedNextActionId: v })} />
              </label>
            </div>
          </>
        ) : (
          <p className="wl-muted" style={{ margin: 0 }}>
            Only needed when the product status is flagged (possible match, Needs Safety / Regulatory Review) or Prohibited.
          </p>
        )}
      </section>

      <section>
        <label>
          <span className="wl-field-label">Notes</span>
          <Input.TextArea
            autoSize={{ minRows: 2 }}
            value={text(row.notes)}
            disabled={readOnly}
            onChange={(e) => onPatch({ notes: e.target.value })}
          />
        </label>
      </section>

      <section>
        <div className="wl-sec-title">Reference</div>
        <dl className="wl-dl">
          <dt>Function</dt>
          <dd>{text(row.functionRole)}</dd>
          <dt>Status / level</dt>
          <dd>{text(row.statusLevel)}</dd>
          <dt>Why it matters</dt>
          <dd>{text(row.whyItMatters)}</dd>
          <dt>Applicable products</dt>
          <dd>{text(row.applicableProducts)}</dd>
          <dt>Linked gate</dt>
          <dd className="wl-mono">{text(row.linkedGate)}</dd>
        </dl>
      </section>
    </div>
  );
}
