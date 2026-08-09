import { useMemo } from 'react';
import { Alert, Card, Descriptions, Input, Select, Tag } from 'antd';
import type { ProjectData, ProjectIdentity } from '@mbc360/shared/types';
import { PROJECT_NATURE_OPTIONS, REQUEST_ORIGIN_OPTIONS } from '@mbc360/shared/config/opportunity';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

// The eight Gate 1 opportunity fields (SME Round 3 B1/B2/B3) are the ONLY
// editable part of project identity — everything above them is write-once at
// project creation. Follows the repo-wide editable-table rule: local draft plus
// an explicit Save, never a per-keystroke store write.
const OPPORTUNITY_FIELDS = [
  'requestOrigin',
  'requestOriginOther',
  'requesterName',
  'requesterDepartment',
  'projectNature',
  'initialScope',
  'initialTargetUsers',
  'initialTargetMarkets',
] as const;

type OpportunityPatch = Partial<Pick<ProjectIdentity, (typeof OPPORTUNITY_FIELDS)[number]>>;

// `editable` is opt-in because this card is a header rendered on 11 pages —
// putting an eight-field form on all of them would bury the page below it. Only
// the surfaces that OWN this data pass it: the Phase 1 page and Project
// Overview. Everywhere else the block still shows what was captured, read-only,
// and disappears entirely while it is empty.
export default function ProjectIdentificationCard({
  project,
  editable = false,
}: {
  project: ProjectData;
  editable?: boolean;
}) {
  const identity = project.identity;
  const setIdentity = useAppStore((s) => s.setIdentity);

  // Gate 1 evidence, so it freezes once Gate 1 genuinely passes (rule B4) —
  // correcting it afterwards requires Backtrack. The server enforces the same
  // rule; this only avoids offering an edit the API would refuse.
  const locked = !editable || isGateRefLocked(project, '01');

  // Compared by value inside useDraft, so deriving this inline is safe.
  const committed = useMemo<OpportunityPatch>(
    () => Object.fromEntries(OPPORTUNITY_FIELDS.map((f) => [f, identity[f] ?? ''])) as OpportunityPatch,
    [identity],
  );
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);
  const set = (field: (typeof OPPORTUNITY_FIELDS)[number], value: string) =>
    update((prev: OpportunityPatch) => ({ ...prev, [field]: value }));

  const hasAnyOpportunityData = OPPORTUNITY_FIELDS.some((f) => (identity[f] ?? '').trim() !== '');
  const isOther = draft.requestOrigin === 'Other — specify';
  // B1's list ends with "Other — specify", so the free-text box is the specify.
  const originIncomplete = isOther && !draft.requestOriginOther?.trim();

  const save = () => {
    if (originIncomplete) return;
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
    <Card size="small" title="Project Identification">
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
        <Descriptions.Item label="Project ID">{identity.id}</Descriptions.Item>
        <Descriptions.Item label="Product Code">{identity.productCode}</Descriptions.Item>
        <Descriptions.Item label="Project Lead">{identity.projectLead}</Descriptions.Item>
        <Descriptions.Item label="Product Group">{identity.productGroup}</Descriptions.Item>
        <Descriptions.Item label="Brand / Customer">{identity.brandCustomer}</Descriptions.Item>
        <Descriptions.Item label="Product / SKU">{identity.productSku}</Descriptions.Item>
        <Descriptions.Item label="Date Opened">{identity.dateOpened}</Descriptions.Item>
        <Descriptions.Item label="Target Launch">{identity.targetLaunchDate}</Descriptions.Item>
        <Descriptions.Item label="Owner / Department">{identity.ownerDepartment}</Descriptions.Item>
        <Descriptions.Item label="Countries / Markets" span={3}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {identity.markets.map((m) => (
              <Tag key={m} style={{ marginInlineEnd: 0 }}>
                {m}
              </Tag>
            ))}
          </div>
        </Descriptions.Item>
      </Descriptions>

      {(editable || hasAnyOpportunityData) && (
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Opportunity &amp; Request (Gate 01)</div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          Where this request came from, and the initial scope, market and user. These are preliminary — Gate 02 confirms,
          refines and formally approves the target user and markets.
        </div>

        {editable && locked && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Gate 01 has passed — this record is read-only. Use Backtrack to reopen it."
          />
        )}

        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="Request origin / source">
            {locked ? (
              <span style={{ color: '#666' }}>{draft.requestOrigin || '—'}</span>
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                allowClear
                showSearch
                placeholder="Where did this request come from?"
                value={draft.requestOrigin || undefined}
                options={REQUEST_ORIGIN_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => {
                  set('requestOrigin', v ?? '');
                  if (v !== 'Other — specify') set('requestOriginOther', '');
                }}
              />
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Requester name">{text('requesterName', 'Who filed the request')}</Descriptions.Item>
          <Descriptions.Item label="Requester department">
            {text('requesterDepartment', 'Their department')}
          </Descriptions.Item>

          {isOther && (
            <Descriptions.Item label="Origin — specify" span={3}>
              {text('requestOriginOther', 'Describe the source')}
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Project nature">
            {locked ? (
              <span style={{ color: '#666' }}>{draft.projectNature || '—'}</span>
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                allowClear
                placeholder="New development, reformulation, …"
                value={draft.projectNature || undefined}
                options={PROJECT_NATURE_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('projectNature', v ?? '')}
              />
            )}
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

        {!locked && (
          <SaveBar
            dirty={dirty}
            onSave={save}
            onDiscard={discard}
            disabled={originIncomplete}
            disabledReason={originIncomplete ? 'Request origin is "Other" — describe the source before saving' : undefined}
          />
        )}
      </div>
      )}
    </Card>
  );
}
