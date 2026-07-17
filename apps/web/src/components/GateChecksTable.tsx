import { Card, Checkbox, DatePicker, Input, Select, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import type { GateCheck, YNNA } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

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
  const setChecksBulk = useAppStore((s) => s.setGateChecksBulk);
  // Draft holds just the mutable GateCheck values, in the same order as
  // `checks` — each row's global store index (checks[i].index) never changes
  // locally, only its `check` fields do.
  const { draft, dirty, update, markSaved, discard } = useDraft(checks.map((c) => c.check));
  const doneCount = draft.filter((c) => c.done).length;

  const patch = (index: number, p: Partial<GateCheck>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setChecksBulk(
      projectId,
      checks.map((c, i) => ({ index: c.index, patch: draft[i] })),
    );
    markSaved();
  };

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
        rowKey={(r) => `${r.gate}-${r.check}`}
        dataSource={draft}
        pagination={false}
        scroll={{ x: 1100 }}
        columns={[
          { title: 'Gate', width: 60, render: (_, r) => <Tag>{r.gate}</Tag> },
          {
            title: 'Key check',
            width: 320,
            render: (_, r) => <span style={{ fontWeight: r.done ? 600 : 400 }}>{r.check}</span>,
          },
          {
            title: 'Done',
            width: 60,
            render: (_, r, i) => (
              <Checkbox
                checked={r.done}
                onChange={(e) =>
                  patch(i, {
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
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: 70 }}
                value={r.ynna}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => patch(i, { ynna: v })}
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
                onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / reference',
            width: 160,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.evidenceRef} onChange={(e) => patch(i, { evidenceRef: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Method ref',
            width: 120,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.methodRef} onChange={(e) => patch(i, { methodRef: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Initials',
            width: 90,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.initials} onChange={(e) => patch(i, { initials: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Notes / action',
            width: 180,
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
