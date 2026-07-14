import { Card, DatePicker, Input, Select, Table } from 'antd';
import dayjs from 'dayjs';
import type { PhaseClosure } from '../types';
import { GATE_DECISIONS } from '../config/gates';
import { useAppStore } from '../store/useAppStore';

export default function SignOffBlock({
  projectId,
  phase,
  closure,
}: {
  projectId: string;
  phase: number;
  closure: PhaseClosure;
}) {
  const setSignOff = useAppStore((s) => s.setSignOff);
  const setClosureField = useAppStore((s) => s.setClosureField);

  return (
    <Card size="small" title="Evidence Summary, Decision and Sign-Off">
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>
          Evidence summary / decision rationale
        </div>
        <Input.TextArea
          rows={3}
          value={closure.evidenceSummary}
          onChange={(e) => setClosureField(projectId, phase, 'evidenceSummary', e.target.value)}
        />
      </div>
      <Table
        size="small"
        rowKey={(r) => r.role}
        dataSource={closure.signOffs}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Role', width: 120, dataIndex: 'role', render: (v) => <b>{v}</b> },
          {
            title: 'Name',
            width: 180,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.name}
                onChange={(e) => setSignOff(projectId, phase, i, { name: e.target.value })}
              />
            ),
          },
          {
            title: 'Signature / initials',
            width: 130,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.initials}
                onChange={(e) => setSignOff(projectId, phase, i, { initials: e.target.value })}
              />
            ),
          },
          {
            title: 'Date',
            width: 140,
            render: (_, r, i) => (
              <DatePicker
                size="small"
                value={r.date ? dayjs(r.date) : null}
                onChange={(d) => setSignOff(projectId, phase, i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Decision',
            width: 150,
            render: (_, r, i) => (
              <Select
                size="small"
                allowClear
                style={{ width: 140 }}
                value={r.decision}
                options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
                onChange={(v) => setSignOff(projectId, phase, i, { decision: v })}
              />
            ),
          },
          {
            title: 'Comments / conditions',
            width: 260,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.comments}
                onChange={(e) => setSignOff(projectId, phase, i, { comments: e.target.value })}
              />
            ),
          },
        ]}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Input
          style={{ flex: 2, minWidth: 220 }}
          addonBefore="Next action"
          value={closure.nextAction}
          onChange={(e) => setClosureField(projectId, phase, 'nextAction', e.target.value)}
        />
        <DatePicker
          placeholder="Next due date"
          value={closure.nextDueDate ? dayjs(closure.nextDueDate) : null}
          onChange={(d) =>
            setClosureField(projectId, phase, 'nextDueDate', d ? d.format('YYYY-MM-DD') : '')
          }
        />
        <Input
          style={{ flex: 1, minWidth: 160 }}
          addonBefore="Owner"
          value={closure.nextOwner}
          onChange={(e) => setClosureField(projectId, phase, 'nextOwner', e.target.value)}
        />
      </div>
    </Card>
  );
}
