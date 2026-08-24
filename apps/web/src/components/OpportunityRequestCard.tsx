import { useMemo } from 'react';
import { Alert, Card, Descriptions, Input } from 'antd';
import type { ProjectData, ProjectIdentity } from '@mbc360/shared/types';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT } from '../theme/tokens';

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
  'initialTargetMarkets',
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
      <span style={{ color: '#666' }}>{draft[field] || '—'}</span>
    ) : rows ? (
      <Input.TextArea
        size="small"
        autoSize={{ minRows: rows, maxRows: 6 }}
        placeholder={placeholder}
        value={draft[field]}
        onChange={(e) => set(field, e.target.value)}
      />
    ) : (
      <Input size="small" placeholder={placeholder} value={draft[field]} onChange={(e) => set(field, e.target.value)} />
    );

  return (
    <Card size="small" title="Opportunity &amp; Request (Gate 01)">
      <div style={{ color: TEXT.secondary, fontSize: 12, marginBottom: 12 }}>
        Who filed the request, and the initial scope, market and user. These are preliminary — Gate 02 confirms, refines
        and formally approves the target user and markets. Where the request came from, and the type of development or
        change, are recorded in the two Gate 01 tables below.
      </div>

      {locked && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Gate 01 has passed — this record is read-only. Use Backtrack to reopen it."
        />
      )}

      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
        <Descriptions.Item label="Requester name">{text('requesterName', 'Who filed the request')}</Descriptions.Item>
        <Descriptions.Item label="Requester department">
          {text('requesterDepartment', 'Their department')}
        </Descriptions.Item>
        <Descriptions.Item label="Initial target user / life-stage">
          {text('initialTargetUsers', 'e.g. general adult, pregnancy')}
        </Descriptions.Item>
        <Descriptions.Item label="Initial target market(s)">
          {text('initialTargetMarkets', 'e.g. Vietnam, Malaysia')}
        </Descriptions.Item>

        <Descriptions.Item label="Initial product scope" span={3}>
          {text('initialScope', 'Proposed product type, intended purpose, and the known boundaries of the request', 2)}
        </Descriptions.Item>
      </Descriptions>

      {!locked && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </Card>
  );
}
