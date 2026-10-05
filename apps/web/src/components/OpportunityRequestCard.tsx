import { useMemo } from 'react';
import { Input, Tooltip } from 'antd';
import type { ProjectData, ProjectIdentity } from '@mbc360/shared/types';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import '../styles/concept.css';
import './DynamicTable.css';

// Gate 01 "Opportunity & Request" — the five free-text fields SME Round 3 asked
// for: the requester (B1), the initial product scope (B2, the supporting field
// behind the "Initial product scope defined" Key Gate Check) and the preliminary
// target user and markets (B3, option (a)).
//
// Its own card since 2026-08-11 (user-raised). It used to live inside
// ProjectIdentificationCard, which had two consequences: that card is rendered on
// 11 pages, so once any of these fields held a value the block appeared read-only
// on all of them — Formulation Safety and Phase 3 included, where Gate 1 capture
// is pure noise — and it implied this is part of Project Identification, which it
// is not. The workbook's PROJECT IDENTIFICATION block is 10 parameters repeated
// verbatim on all four phase sheets; none of these five fields is one of them.
//
// Rendered only where the data is OWNED: the Phase 1 page (between the Phase Gate
// Flow table and the two gate-01 option tables, so all Gate 01 capture reads in
// one run) and Project Overview.
//
// WRITEABLE on Phase 1 only. Project Overview passes `readOnly` — the project
// owner's rule (2026-08-22): project data is written in the Create Project
// form, on the phase pages and in the ledgers, never on Overview. Overview is a
// summary of state; an editable field there means the same five fields have two
// owners, two drafts and no obvious answer to "which one is the real place to
// fill this in".
const OPPORTUNITY_FIELDS = [
  'requesterName',
  'requesterDepartment',
  'initialScope',
  'initialTargetUsers',
  // No 'initialTargetMarkets': Round 4 question 24 (built 2026-08-29) removed it
  // as a duplicate of the Countries / Markets parameter, which is now the single
  // source of truth and is required before Gate 1 passes rather than at creation.
] as const;

type OpportunityPatch = Partial<Pick<ProjectIdentity, (typeof OPPORTUNITY_FIELDS)[number]>>;

export default function OpportunityRequestCard({ project }: { project: ProjectData }) {
  const identity = project.identity;
  const setIdentity = useAppStore((s) => s.setIdentity);

  // Gate 1 evidence, so it freezes once Gate 1 genuinely passes (rule B4) —
  // correcting it afterwards requires Backtrack. The server enforces the same
  // rule; this only avoids offering an edit the API would refuse.
  const locked = isGateRefLocked(project, '01');

  // Compared by value inside useDraft, so deriving this inline is safe.
  const committed = useMemo<OpportunityPatch>(
    () => Object.fromEntries(OPPORTUNITY_FIELDS.map((f) => [f, identity[f] ?? ''])) as OpportunityPatch,
    [identity],
  );
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);
  const set = (field: (typeof OPPORTUNITY_FIELDS)[number], value: string) =>
    update((prev: OpportunityPatch) => ({ ...prev, [field]: value }));

  const save = () => {
    setIdentity(identity.id, draft);
    markSaved();
  };

  const text = (field: (typeof OPPORTUNITY_FIELDS)[number], placeholder: string, rows?: number) =>
    locked ? (
      <span className="rt-static">{draft[field] || '—'}</span>
    ) : rows ? (
      <Input.TextArea
        autoSize={{ minRows: rows, maxRows: 6 }}
        placeholder={placeholder}
        value={draft[field]}
        onChange={(e) => set(field, e.target.value)}
      />
    ) : (
      <Input placeholder={placeholder} value={draft[field]} onChange={(e) => set(field, e.target.value)} />
    );

  // The two fields behind Mandatory Gate 01 items (`sg01-scope`, `sg01-market-user`
  // via `identityFieldFilled`) — flagged while empty, same tag as the checklists.
  const requiredTag = (field: (typeof OPPORTUNITY_FIELDS)[number]) =>
    !locked && !draft[field]?.trim() && (
      <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
        <span className="c-tag c-tag-bad" style={{ marginLeft: 8 }}>Required</span>
      </Tooltip>
    );

  // 2026-10-02: a plain labelled form (label above input) instead of a bordered
  // Descriptions grid, where each input was squeezed beside its label.
  return (
    <div className="concept-tokens c-card rt rt-standalone">
      <div className="rt-head">
        <div className="rt-head-title">
          <span>Opportunity &amp; Request</span>
          <span className="c-tag">Gate 01</span>
          {locked && <span className="c-tag">Read-only — gate passed</span>}
        </div>
        <p className="rt-head-desc">
          Who filed the request, and the initial scope and user. These are preliminary — Gate 02 confirms, refines and
          formally approves the target user and markets. Where the request came from, and the type of development or
          change, are recorded in the two Gate 01 tables below.
        </p>
      </div>
      <div className="rt-grid">
        <label>
          <span className="rt-label">Requester name</span>
          {text('requesterName', 'Who filed the request')}
        </label>
        <label>
          <span className="rt-label">Requester department</span>
          {text('requesterDepartment', 'Their department')}
        </label>
        <label className="rt-span-2">
          <span className="rt-label">Initial target user / life-stage</span>{requiredTag('initialTargetUsers')}
          {text('initialTargetUsers', 'e.g. general adult, pregnancy')}
        </label>
        <label className="rt-span-2">
          <span className="rt-label">Initial product scope</span>{requiredTag('initialScope')}
          {text('initialScope', 'Proposed product type, intended purpose, and the known boundaries of the request', 2)}
        </label>
      </div>
      {locked && <p className="rt-head-desc" style={{ margin: 0 }}>Gate 01 has passed — use Backtrack to reopen this record.</p>}
      {!locked && dirty && (
        <div className="rt-savebar">
          <div>
            <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
          </div>
        </div>
      )}
    </div>
  );
}
