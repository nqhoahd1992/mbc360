import { Card, Empty, Input, Progress, Select, Table, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { WorkStatus } from '../types';
import { WORK_STATUSES } from '../config/gates';

export default function EvidenceSummary() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setEvidenceItem = useAppStore((s) => s.setEvidenceItem);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;

  const completed = project.evidence.filter((e) => e.status === 'Completed').length;

  return (
    <Card
      size="small"
      title={`Product Evidence Summary — ${project.identity.productSku}`}
      extra={
        <Progress
          size="small"
          style={{ width: 200 }}
          percent={Math.round((completed / project.evidence.length) * 100)}
        />
      }
    >
      <Table
        size="small"
        rowKey={(e) => e.area}
        dataSource={project.evidence}
        pagination={false}
        scroll={{ x: 1200 }}
        columns={[
          { title: 'Evidence area', width: 220, dataIndex: 'area', render: (v) => <b>{v}</b> },
          {
            title: 'Required?',
            width: 110,
            dataIndex: 'required',
            render: (v) => <Tag color={v === 'Y' ? 'blue' : 'gold'}>{v === 'Y' ? 'Required' : 'Conditional'}</Tag>,
          },
          { title: 'Trigger', width: 220, dataIndex: 'trigger', render: (v) => <span style={{ color: '#666' }}>{v}</span> },
          { title: 'Primary template', width: 180, dataIndex: 'primaryTemplate' },
          { title: 'Owner', width: 170, dataIndex: 'owner' },
          { title: 'Gate', width: 80, dataIndex: 'gate', render: (v) => <Tag>{v}</Tag> },
          {
            title: 'Status',
            width: 150,
            render: (_, e, i) => (
              <Select
                size="small"
                style={{ width: 140 }}
                value={e.status}
                options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: WorkStatus) => setEvidenceItem(id, i, { status: v })}
              />
            ),
          },
          {
            title: 'Evidence link / folder',
            width: 200,
            render: (_, e, i) => (
              <Input
                size="small"
                value={e.evidenceLink}
                placeholder="link"
                onChange={(ev) => setEvidenceItem(id, i, { evidenceLink: ev.target.value })}
              />
            ),
          },
          {
            title: 'Notes',
            width: 200,
            render: (_, e, i) => (
              <Input
                size="small"
                value={e.notes}
                onChange={(ev) => setEvidenceItem(id, i, { notes: ev.target.value })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
