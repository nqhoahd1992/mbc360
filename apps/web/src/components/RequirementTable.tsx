import { Card, Input, Select, Table, Tag } from 'antd';
import type { RequirementItem, WorkStatus } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

export default function RequirementTable({
  projectId,
  sectionKey,
  title,
  items,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  items: RequirementItem[];
}) {
  const setSection = useAppStore((s) => s.setRequirementSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);

  const patch = (index: number, p: Partial<RequirementItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };

  return (
    <Card size="small" title={title}>
      <Table
        size="small"
        rowKey={(r) => r.requirement}
        dataSource={draft}
        pagination={false}
        scroll={{ x: 1100 }}
        columns={[
          { title: 'Gate', width: 60, render: (_, r) => <Tag>{r.gate}</Tag> },
          { title: 'Requirement / field', width: 200, dataIndex: 'requirement', render: (v) => <b>{v}</b> },
          { title: 'Minimum requirement', width: 260, dataIndex: 'minimumRequirement' },
          {
            title: 'Rationale / control reason',
            width: 260,
            dataIndex: 'rationale',
            render: (v) => <span style={{ color: '#666' }}>{v}</span>,
          },
          { title: 'Owner', width: 150, dataIndex: 'owner' },
          {
            title: 'Status',
            width: 140,
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: 130 }}
                value={r.status}
                options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: WorkStatus) => patch(i, { status: v })}
              />
            ),
          },
          {
            title: 'Evidence link',
            width: 160,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.evidenceLink}
                placeholder="link"
                onChange={(e) => patch(i, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / action',
            width: 200,
            render: (_, r, i) => (
              <Input size="small" value={r.notes} onChange={(e) => patch(i, { notes: e.target.value })} />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
