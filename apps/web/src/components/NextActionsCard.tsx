import { Button, Card, DatePicker, Input, Popconfirm, Select, Table, Tag } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { NextAction, NextActionPriority, NextActionStatus } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

const STATUS_OPTIONS: NextActionStatus[] = ['Open', 'In Progress', 'Done'];
const PRIORITY_OPTIONS: NextActionPriority[] = ['Low', 'Medium', 'High'];

const PRIORITY_COLORS: Record<NextActionPriority, string> = {
  Low: 'default',
  Medium: 'gold',
  High: 'red',
};

// Controlled per-gate follow-up actions (confirmed rule B2). Open actions block
// a plain Proceed pass — they may stay open only under Proceed with Conditions.
export default function NextActionsCard({
  projectId,
  gateIds,
  actions,
}: {
  projectId: string;
  gateIds: string[];
  actions: NextAction[];
}) {
  const setActionsBulk = useAppStore((s) => s.setNextActionsBulk);
  const rows = actions.filter((a) => gateIds.includes(a.gateId));
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const openCount = draft.filter((a) => a.status !== 'Done').length;
  const gateOptions = gateIds.map((id) => {
    const meta = GATES.find((g) => g.id === id);
    return { value: id, label: `Gate ${meta?.number ?? id}` };
  });

  const patch = (index: number, p: Partial<NextAction>) => update((prev) => patchArray(prev, index, p));
  const addAction = () =>
    update((prev) => [
      ...prev,
      {
        id: `NA-${Date.now()}`,
        gateId: gateIds[0],
        description: '',
        status: 'Open' as const,
        priority: 'Medium' as const,
      },
    ]);
  const removeAction = (actionId: string) => update((prev) => prev.filter((a) => a.id !== actionId));
  const save = () => {
    setActionsBulk(projectId, gateIds, draft);
    markSaved();
  };

  return (
    <Card
      size="small"
      title={
        <span>
          Next Actions{' '}
          <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
            — open actions block a plain Proceed; allowed only under Proceed with Conditions
          </span>
        </span>
      }
      extra={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: openCount > 0 ? '#d48806' : '#999', fontSize: 12 }}>
            {openCount} open / {draft.length} total
          </span>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addAction}>
            Add action
          </Button>
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(a) => a.id}
        dataSource={draft}
        pagination={false}
        scroll={{ x: 1050 }}
        locale={{ emptyText: 'No next actions recorded for this phase' }}
        columns={[
          {
            title: 'Gate',
            width: 100,
            render: (_, a, i) => (
              <Select
                size="small"
                style={{ width: 90 }}
                value={a.gateId}
                options={gateOptions}
                onChange={(v) => patch(i, { gateId: v })}
              />
            ),
          },
          {
            title: 'Description',
            width: 280,
            render: (_, a, i) => (
              <Input.TextArea
                size="small"
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={a.description}
                placeholder="What must be done?"
                onChange={(e) => patch(i, { description: e.target.value })}
              />
            ),
          },
          {
            title: 'Owner',
            width: 140,
            render: (_, a, i) => (
              <Input size="small" value={a.owner} onChange={(e) => patch(i, { owner: e.target.value })} />
            ),
          },
          {
            title: 'Due date',
            width: 130,
            render: (_, a, i) => (
              <DatePicker
                size="small"
                value={a.dueDate ? dayjs(a.dueDate) : null}
                onChange={(d) => patch(i, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Priority',
            width: 110,
            render: (_, a, i) => (
              <Select
                size="small"
                style={{ width: 100 }}
                value={a.priority}
                options={PRIORITY_OPTIONS.map((p) => ({
                  value: p,
                  label: <Tag color={PRIORITY_COLORS[p]}>{p}</Tag>,
                }))}
                onChange={(v) => patch(i, { priority: v })}
              />
            ),
          },
          {
            title: 'Status',
            width: 130,
            render: (_, a, i) => (
              <Select
                size="small"
                style={{ width: 120 }}
                value={a.status}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                onChange={(v: NextActionStatus) =>
                  patch(i, {
                    status: v,
                    dateCompleted: v === 'Done' ? dayjs().format('YYYY-MM-DD') : undefined,
                  })
                }
              />
            ),
          },
          {
            title: 'Date completed',
            width: 120,
            render: (_, a) => <span style={{ color: '#888' }}>{a.dateCompleted ?? '—'}</span>,
          },
          {
            title: '',
            width: 50,
            render: (_, a) => (
              <Popconfirm title="Remove action?" onConfirm={() => removeAction(a.id)}>
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
