import { Card, Descriptions, Select, Tag } from 'antd';
import type { ProjectData } from '@mbc360/shared/types';
import { PHASE_1 } from '@mbc360/shared/config/phases';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

// The workbook's PROJECT IDENTIFICATION block, transcribed: 10 parameters in two
// column pairs (`A8:C12` Project ID → Brand / Customer, `D8:F12` Date opened →
// Countries / Markets), repeated verbatim on all four phase sheets. Nine of the
// ten are write-once at project creation, so this card is display-only wherever
// `editableMarkets` is not passed — which is every page except Phase 1.
//
// Countries / Markets is the exception since 2026-08-29 (Round 4 question 24):
// it stopped being mandatory at creation and became mandatory before Gate 1
// passes instead, so a project can now exist without it and something has to be
// able to record it. Phase 1 is where that happens, because that is where Gate 1
// evidence is entered and where the "Initial target market and user" blocker
// links to. It freezes with gate 01 like every other gate-1 surface (rule B4).
//
// The Gate 01 opportunity fields (SME Round 3 B1/B2/B3) used to hang off the
// bottom of this card behind an `editable` flag; they moved to
// OpportunityRequestCard on 2026-08-11 — they are not Project Identification
// parameters, and this card appears on 11 pages, so they were showing up on
// pages that have nothing to do with Gate 1.
const MARKET_OPTIONS = PHASE_1.checklistSections
  .find((s) => s.key === 'targetMarkets')!
  .options.filter((o) => !o.startsWith('Other'))
  .map((o) => ({ value: o, label: o }));

export default function ProjectIdentificationCard({
  project,
  editableMarkets,
}: {
  project: ProjectData;
  editableMarkets?: boolean;
}) {
  const identity = project.identity;
  const setMarkets = useAppStore((s) => s.setMarkets);
  const { draft, dirty, update, markSaved, discard } = useDraft(identity.markets);
  const locked = isGateRefLocked(project, '01');
  const editing = !!editableMarkets && !locked;

  const save = () => {
    setMarkets(identity.id, draft);
    markSaved();
  };

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
          {editing ? (
            <Select
              mode="multiple"
              style={{ width: '100%', maxWidth: 640 }}
              options={MARKET_OPTIONS}
              value={draft}
              // Required before Gate 1 can pass, so an empty list is flagged here
              // rather than only in the readiness panel.
              status={draft.length === 0 ? 'error' : undefined}
              placeholder="Required before Gate 1 can pass"
              onChange={(v: string[]) => update(() => v)}
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {identity.markets.length === 0 && <span style={{ color: '#999' }}>Not recorded yet</span>}
              {identity.markets.map((m) => (
                <Tag key={m} style={{ marginInlineEnd: 0 }}>
                  {m}
                </Tag>
              ))}
            </div>
          )}
        </Descriptions.Item>
      </Descriptions>
      {editing && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </Card>
  );
}
