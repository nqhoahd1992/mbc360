import { Card, Checkbox, DatePicker, Input, Select, Table } from 'antd';
import dayjs from 'dayjs';
import type { AngleRow, YNNA } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

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
  const setAnglesBulk = useAppStore((s) => s.setAnglesBulk);
  const { draft, dirty, update, markSaved, discard } = useDraft(angles);
  const covered = draft.filter((a) => a.covered).length;

  const patch = (index: number, p: Partial<AngleRow>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setAnglesBulk(projectId, phase, draft);
    markSaved();
  };

  return (
    <Card
      size="small"
      title="8 Angles Coverage — apply to the phase before gate closure"
      extra={
        <span style={{ color: TEXT.secondary }}>
          {covered}/8 covered
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(r) => r.angle}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Angle', width: 200, dataIndex: 'angle', fixed: 'left', render: (v) => <b>{v}</b> },
          {
            title: 'Y/N/NA',
            width: 80,
            render: (_, r, i) => (
              <Select
                style={{ width: 70 }}
                value={r.ynna}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => patch(i, { ynna: v })}
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
                  patch(i, {
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
                value={r.date ? dayjs(r.date) : null}
                onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / reference',
            width: 180,
            render: (_, r, i) => (
              <Input value={r.evidenceRef} onChange={(e) => patch(i, { evidenceRef: e.target.value })} />
            ),
          },
          {
            title: 'Initials',
            width: 90,
            render: (_, r, i) => (
              <Input value={r.initials} onChange={(e) => patch(i, { initials: e.target.value })} />
            ),
          },
          {
            title: 'Comments',
            width: 220,
            render: (_, r, i) => (
              <Input value={r.comments} onChange={(e) => patch(i, { comments: e.target.value })} />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
