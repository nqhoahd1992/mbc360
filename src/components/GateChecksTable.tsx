import { Card, Checkbox, DatePicker, Input, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import type { GateCheck, YNNA } from '../types';
import { useAppStore } from '../store/useAppStore';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

export default function GateChecksTable({
  projectId,
  title,
  checks,
}: {
  projectId: string;
  title: string;
  checks: { check: GateCheck; index: number }[];
}) {
  const setCheck = useAppStore((s) => s.setGateCheck);
  const doneCount = checks.filter((c) => c.check.done).length;

  return (
    <Card
      size="small"
      title={title}
      extra={
        <span style={{ color: '#999' }}>
          {doneCount}/{checks.length} done
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(r) => `${r.check.gate}-${r.check.check}`}
        dataSource={checks}
        pagination={false}
        scroll={{ x: 1100 }}
        columns={[
          { title: 'Gate', width: 60, render: (_, r) => <Tag>{r.check.gate}</Tag> },
          {
            title: 'Key check',
            width: 320,
            render: (_, r) => (
              <span style={{ fontWeight: r.check.done ? 600 : 400 }}>{r.check.check}</span>
            ),
          },
          {
            title: 'Done',
            width: 60,
            render: (_, r) => (
              <Checkbox
                checked={r.check.done}
                onChange={(e) =>
                  setCheck(projectId, r.index, {
                    done: e.target.checked,
                    ynna: e.target.checked ? 'Y' : 'NA',
                    date: e.target.checked ? dayjs().format('YYYY-MM-DD') : undefined,
                  })
                }
              />
            ),
          },
          {
            title: 'Y/N/NA',
            width: 80,
            render: (_, r) => (
              <Select
                size="small"
                style={{ width: 70 }}
                value={r.check.ynna}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => setCheck(projectId, r.index, { ynna: v })}
              />
            ),
          },
          {
            title: 'Date',
            width: 130,
            render: (_, r) => (
              <DatePicker
                size="small"
                value={r.check.date ? dayjs(r.check.date) : null}
                onChange={(d) => setCheck(projectId, r.index, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / reference',
            width: 160,
            render: (_, r) => (
              <Input
                size="small"
                value={r.check.evidenceRef}
                onChange={(e) => setCheck(projectId, r.index, { evidenceRef: e.target.value })}
              />
            ),
          },
          {
            title: 'Method ref',
            width: 120,
            render: (_, r) => (
              <Input
                size="small"
                value={r.check.methodRef}
                onChange={(e) => setCheck(projectId, r.index, { methodRef: e.target.value })}
              />
            ),
          },
          {
            title: 'Initials',
            width: 90,
            render: (_, r) => (
              <Input
                size="small"
                value={r.check.initials}
                onChange={(e) => setCheck(projectId, r.index, { initials: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / action',
            width: 180,
            render: (_, r) => (
              <Input
                size="small"
                value={r.check.notes}
                onChange={(e) => setCheck(projectId, r.index, { notes: e.target.value })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
