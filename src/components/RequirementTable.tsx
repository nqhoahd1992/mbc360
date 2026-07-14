import { Card, Input, Select, Table, Tag } from 'antd';
import type { RequirementItem, WorkStatus } from '../types';
import { WORK_STATUSES } from '../config/gates';
import { useAppStore } from '../store/useAppStore';

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
  const setItem = useAppStore((s) => s.setRequirementItem);
  return (
    <Card size="small" title={title}>
      <Table
        size="small"
        rowKey={(r) => r.requirement}
        dataSource={items}
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
                onChange={(v: WorkStatus) => setItem(projectId, sectionKey, i, { status: v })}
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
                onChange={(e) => setItem(projectId, sectionKey, i, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / action',
            width: 200,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.notes}
                onChange={(e) => setItem(projectId, sectionKey, i, { notes: e.target.value })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
