import { Card, Checkbox, DatePicker, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GateCheck, YNNA } from '@mbc360/shared/types';
import { isMandatoryGateCheck } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

export default function GateChecksTable({
  projectId,
  title,
  checks,
  currentGateNumber,
  isRowLocked,
}: {
  projectId: string;
  title: string;
  checks: { check: GateCheck; index: number }[];
  // Gate `number` (e.g. '01') currently open for work — rows for that gate
  // that are still-required get an extra highlight (see the render below).
  currentGateNumber?: string;
  // Gate-level edit lock (2026-07-23): a row whose gate has passed is
  // read-only (inputs disabled). Key Gate Checks span every gate in a phase,
  // so this is per-row.
  isRowLocked?: (check: GateCheck) => boolean;
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
        <span style={{ color: TEXT.secondary }}>
          {doneCount}/{checks.length} done
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(r) => `${r.gate}-${r.check}`}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 1100 }}
        onRow={(r) => {
          const required = isMandatoryGateCheck(r.gate, r.check) && !r.done;
          const isCurrentGate = r.gate === currentGateNumber;
          return required && isCurrentGate ? { style: { background: '#fffbe6' } } : {};
        }}
        columns={[
          {
            title: 'Gate',
            width: 60,
            render: (_, r) => <Tag icon={isRowLocked?.(r) ? <LockOutlined /> : undefined}>{r.gate}</Tag>,
          },
          {
            title: 'Key check',
            width: 320,
            render: (_, r) => {
              const required = isMandatoryGateCheck(r.gate, r.check) && !r.done;
              return (
                <span style={{ fontWeight: r.done ? 600 : 400 }}>
                  {r.check}
                  {required && (
                    <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
                      <span style={{ color: '#ff4d4f' }}> *</span>
                    </Tooltip>
                  )}
                </span>
              );
            },
          },
          {
            title: 'Done',
            width: 60,
            render: (_, r, i) => (
              <Checkbox
                checked={r.done}
                disabled={isRowLocked?.(r)}
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
                disabled={isRowLocked?.(r)}
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
                disabled={isRowLocked?.(r)}
                onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / reference',
            width: 160,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.evidenceRef} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { evidenceRef: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Method ref',
            width: 120,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.methodRef} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { methodRef: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Initials',
            width: 90,
            render: (_, r, i) =>
              r.done ? (
                <Input size="small" value={r.initials} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { initials: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Notes / action',
            width: 180,
            render: (_, r, i) => (
              <Input size="small" value={r.notes} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { notes: e.target.value })} />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
