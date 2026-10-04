import { useState } from 'react';
import { Empty, Input, Select } from 'antd';
import { Link, useParams } from 'react-router-dom';
import type { EvidenceItem, WorkStatus } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { composeReviewOwner, REVIEW_SPECS } from '@mbc360/shared/config/reviewers';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import RecordList, { RecordField } from '../components/RecordList';
import { CompositePageHeader } from '../components/RegisterPageHeader';
import '../styles/concept.css';
import './AdminUsers.css';

// Product Evidence Summary: the sixteen evidence areas of the workbook, each
// with where its evidence lives, who owns it and whether it is done.
//
// 2026-10-02 redesign (wireframe option A): the 1200px table with in-cell
// link and notes inputs became a RecordList — area, trigger, gate and Status on
// the row; link, notes and the reference columns in the drawer — with chips for
// open / required-open / completed. Same draft, same Save.

type Filter = 'all' | 'open' | 'requiredOpen' | 'completed';

// "Primary template" names a sheet; where the name matches ONE screen exactly
// it becomes a link. Matched by hand against the register keys and pages, and
// deliberately left out where it does not: "Change Control Comm" could mean the
// Change Control page or the Communications register, so it stays text.
const TEMPLATE_LINKS: Record<string, { label: string; path: string }[]> = {
  'Phase 1 (Marketing)': [{ label: 'Phase 1 (Marketing)', path: 'phase/1' }],
  'Formula BOM / Costing Calc': [
    { label: 'Formula BOM', path: 'bom/formula' },
    { label: 'Costing Calculator', path: 'bom/costing' },
  ],
  'Supplier RM Evidence': [{ label: 'Supplier RM Evidence', path: 'registers/reg/supplierRmEvidence' }],
  'Formulation Safety': [{ label: 'Formulation Safety', path: 'formulation-safety' }],
  'Fragrance Safety': [{ label: 'Fragrance Safety', path: 'registers/reg/fragranceSafety' }],
  'Prohibited Ingredients': [{ label: 'Prohibited Ingredients', path: 'registers/reg/prohibitedIngredients' }],
  'PB Caution Limits': [{ label: 'PB Caution Limits', path: 'registers/reg/pbCautionLimits' }],
  'Packaging Specs Artwork': [{ label: 'Packaging Specs Artwork', path: 'registers/reg/packagingSpecsArtwork' }],
  'Micro PET Evidence': [{ label: 'Micro PET Evidence', path: 'registers/reg/microPetEvidence' }],
  'Stability Release': [{ label: 'Stability Release', path: 'registers/reg/stabilityRelease' }],
  'Mechanism Claims Map': [{ label: 'Mechanism Claims Map', path: 'registers/reg/mechanismClaimsMap' }],
  'Clinical Human Evidence': [{ label: 'Clinical Human Evidence', path: 'registers/reg/clinicalHumanEvidence' }],
  'PIF Checklist ASEAN': [{ label: 'PIF Checklist ASEAN', path: 'registers/reg/pifChecklistAsean' }],
  'GMP Links': [{ label: 'GMP Links', path: 'registers/reg/gmpLinks' }],
  'PostMarket CAPA': [{ label: 'Post-Market / CAPA', path: 'post-market' }],
};

const gateLabel = (gate: string) => (gate.toUpperCase() === 'ALL' ? 'All gates' : `Gate ${gate.replace(/[-/]/g, ' · ')}`);
const isDone = (e: EvidenceItem) => e.status === 'Completed';

export default function EvidenceSummary() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setEvidenceItemsBulk = useAppStore((s) => s.setEvidenceItemsBulk);
  const { draft, dirty, update, markSaved, discard } = useDraft(project?.evidence ?? []);
  const [filter, setFilter] = useState<Filter>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;

  const patch = (index: number, p: Partial<EvidenceItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setEvidenceItemsBulk(id, draft);
    markSaved();
  };

  const completed = draft.filter(isDone).length;
  const requiredOpen = draft.filter((e) => e.required === 'Y' && !isDone(e)).length;
  // Each visible row carries its index in the draft, since the list is filtered.
  const rows = draft
    .map((e, index) => ({ e, index }))
    .filter(({ e }) =>
      filter === 'all' ? true : filter === 'open' ? !isDone(e) : filter === 'requiredOpen' ? e.required === 'Y' && !isDone(e) : isDone(e),
    );
  const chips: [Filter, string, number][] = [
    ['all', 'All', draft.length],
    ['open', 'Open', draft.length - completed],
    ['requiredOpen', 'Required open', requiredOpen],
    ['completed', 'Completed', completed],
  ];

  // C9: an evidence area whose gate has passed is read-only (the API refuses it).
  const isLocked = (e: EvidenceItem) => isGateRefLocked(project, e.gate);
  const statusControl = (row: { e: EvidenceItem; index: number }) => (
    <Select
      style={{ width: '100%' }}
      disabled={isLocked(row.e)}
      value={row.e.status}
      options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
      onChange={(v: WorkStatus) => patch(row.index, { status: v })}
    />
  );
  const template = (name: string) => {
    const links = TEMPLATE_LINKS[name];
    if (!links) return name;
    return links.map((l, i) => (
      <span key={l.path}>
        {i > 0 && ' · '}
        <Link to={`/projects/${id}/${l.path}`}>{l.label}</Link>
      </span>
    ));
  };

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Product Evidence Summary"
        description="One line per evidence area: where its evidence lives, who owns it, and whether it is done."
        reviewOwnerText={composeReviewOwner(REVIEW_SPECS.ri, project.identity.reviewers)}
      />
      <p className="au-meta" style={{ marginTop: -8 }}>
        {draft.length} areas · {completed} completed
        {requiredOpen > 0 && (
          <>
            {' · '}
            <b className="au-meta-warn">{requiredOpen} required still open</b>
          </>
        )}
      </p>

      <div className="au-toolbar">
        {chips.map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            className="au-chip"
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key);
              setOpenIndex(null);
            }}
          >
            {label} <b>{n}</b>
          </button>
        ))}
      </div>

      <RecordList
        title="Evidence areas"
        count={`${completed}/${draft.length} completed`}
        rows={rows}
        rowKey={(r) => r.e.area}
        rowTitle={(r) => (
          <>
            {r.e.area}
            {r.e.required !== 'Y' && (
              <span className="c-tag" style={{ marginLeft: 8 }}>
                Conditional
              </span>
            )}
          </>
        )}
        rowSubtitle={(r) => r.e.trigger}
        emptyText="No evidence area here."
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
        // Gate as the row's leading badge, as on the requirement tables, so on a
        // phone it does not become a labelled field of its own.
        rowBadge={(r) => (
          // Fixed width so the area names line up whatever the gate label.
          <span className="c-tag" style={{ flexShrink: 0, minWidth: 116, justifyContent: 'center' }}>
            {gateLabel(r.e.gate)}
          </span>
        )}
        inline={[{ label: 'Status', width: 168, render: statusControl }]}
        drawerTitle={(r) => r.e.area}
        drawer={(r) => (
          <>
            <section>
              <div className="rt-grid">
                <RecordField label="Status">{statusControl(r)}</RecordField>
                <RecordField label="Evidence link / folder" wide>
                  <Input
                    disabled={isLocked(r.e)}
                    value={r.e.evidenceLink}
                    placeholder="Link to the evidence"
                    onChange={(ev) => patch(r.index, { evidenceLink: ev.target.value })}
                  />
                </RecordField>
                <RecordField label="Notes" wide>
                  <Input.TextArea
                    autoSize={{ minRows: 2 }}
                    disabled={isLocked(r.e)}
                    value={r.e.notes}
                    onChange={(ev) => patch(r.index, { notes: ev.target.value })}
                  />
                </RecordField>
              </div>
            </section>
            <section>
              <div className="rt-sec-title">Reference</div>
              <dl className="rt-dl">
                {(
                  [
                    ['Required', r.e.required === 'Y' ? 'Yes' : 'Conditional'],
                    ['Trigger', r.e.trigger],
                    ['Primary template', template(r.e.primaryTemplate)],
                    ['Owner', r.e.owner],
                    ['Gate', gateLabel(r.e.gate)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rt-dl-row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}
        footer={
          dirty ? (
            <div className="rt-savebar">
              <div>
                <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
