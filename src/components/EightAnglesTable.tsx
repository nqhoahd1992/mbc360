import { Card, Checkbox, DatePicker, Input, Select, Table } from 'antd';
import dayjs from 'dayjs';
import type { AngleRow, YNNA } from '../types';
import { useAppStore } from '../store/useAppStore';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

export default function EightAnglesTable({
  projectId,
  phase,
  angles,
}: {
  projectId: string;
  phase: number;
  angles: AngleRow[];
}) {
  const setAngle = useAppStore((s) => s.setAngle);
  const covered = angles.filter((a) => a.covered).length;

  return (
    <Card
      size="small"
      title="8 Angles Coverage — apply to the phase before gate closure"
      extra={
        <span style={{ color: '#999' }}>
          {covered}/8 covered
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(r) => r.angle}
        dataSource={angles}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Angle', width: 200, dataIndex: 'angle', render: (v) => <b>{v}</b> },
          {
            title: 'Y/N/NA',
            width: 80,
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: 70 }}
                value={r.ynna}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => setAngle(projectId, phase, i, { ynna: v })}
              />
            ),
          },
          {
            title: 'Covered',
            width: 80,
            render: (_, r, i) => (
              <Checkbox
                checked={r.covered}
                onChange={(e) =>
                  setAngle(projectId, phase, i, {
                    covered: e.target.checked,
                    ynna: e.target.checked ? 'Y' : r.ynna,
                    date: e.target.checked ? dayjs().format('YYYY-MM-DD') : undefined,
                  })
                }
              />
            ),
          },
          {
            title: 'Date',
            width: 130,
            render: (_, r, i) => (
              <DatePicker
                size="small"
                value={r.date ? dayjs(r.date) : null}
                onChange={(d) => setAngle(projectId, phase, i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / reference',
            width: 180,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.evidenceRef}
                onChange={(e) => setAngle(projectId, phase, i, { evidenceRef: e.target.value })}
              />
            ),
          },
          {
            title: 'Initials',
            width: 90,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.initials}
                onChange={(e) => setAngle(projectId, phase, i, { initials: e.target.value })}
              />
            ),
          },
          {
            title: 'Comments',
            width: 220,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.comments}
                onChange={(e) => setAngle(projectId, phase, i, { comments: e.target.value })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
