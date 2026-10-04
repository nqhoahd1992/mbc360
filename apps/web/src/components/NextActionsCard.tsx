import { DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { NextAction, NextActionPriority, NextActionStatus } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import RecordList, { RecordField } from './RecordList';

// F8: full controlled-record workflow + Critical priority.
const STATUS_OPTIONS: NextActionStatus[] = [
  'Open',
  'In Progress',
  'Awaiting Information',
  'Ready for Verification',
  'Closed',
  'Cancelled',
];
const PRIORITY_OPTIONS: NextActionPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const TERMINAL_STATUSES: NextActionStatus[] = ['Closed', 'Cancelled'];
const PRIORITY_TONE: Record<NextActionPriority, string> = { Low: '', Medium: 'c-tag-warn', High: 'c-tag-warn', Critical: 'c-tag-bad' };

// Controlled per-gate follow-up actions (confirmed rule B2). Open actions block
// a plain Proceed pass — they may stay open only under Proceed with Conditions.
// Since 2026-10-02 laid out as a RecordList: priority and status on the row,
// everything else in the drawer; adding an action opens its drawer.
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
  const openCount = draft.filter((a) => !TERMINAL_STATUSES.includes(a.status)).length;
  const openCriticalCount = draft.filter((a) => !TERMINAL_STATUSES.includes(a.status) && a.priority === 'Critical').length;
  const gateOptions = gateIds.map((id) => {
    const meta = GATES.find((g) => g.id === id);
    return { value: id, label: `Gate ${meta?.number ?? id}` };
  });
  const gateNumber = (id: string) => GATES.find((g) => g.id === id)?.number ?? id;

  const patch = (index: number, p: Partial<NextAction>) => update((prev) => patchArray(prev, index, p));
  const addAction = () => {
    update((prev) => [
      ...prev,
      { id: `NA-${Date.now()}`, gateId: gateIds[0], description: '', status: 'Open' as const, priority: 'Medium' as const },
    ]);
    return draft.length;
  };
  const removeAction = (index: number) => update((prev) => prev.filter((_, i) => i !== index));
  const save = () => {
    setActionsBulk(projectId, gateIds, draft);
    markSaved();
  };
  const setStatus = (i: number, v: NextActionStatus) =>
    patch(i, { status: v, dateCompleted: v === 'Closed' ? dayjs().format('YYYY-MM-DD') : undefined });

  return (
    <RecordList
      title="Next Actions"
      description="Open actions block a plain Proceed (allowed only under Proceed with Conditions); a Critical action blocks the gate even under Proceed with Conditions."
      count={
        <>
          {openCount} open / {draft.length} total
          {openCriticalCount > 0 && <span className="rl-req"> · {openCriticalCount} Critical</span>}
        </>
      }
      rows={draft}
      rowKey={(a) => a.id}
      rowBadge={gateIds.length > 1 ? (a) => <span className="c-tag" style={{ flexShrink: 0 }}>{gateNumber(a.gateId)}</span> : undefined}
      rowTitle={(a) => a.description || <span className="rt-muted">New action — describe what must be done</span>}
      rowSubtitle={(a) => [a.owner, a.dueDate && `due ${a.dueDate}`].filter(Boolean).join(' · ')}
      rowFlag={(a) => a.priority === 'Critical' && !TERMINAL_STATUSES.includes(a.status)}
      inline={[
        {
          label: 'Priority',
          width: 132,
          render: (a, i) => (
            <Select
              style={{ width: '100%' }}
              value={a.priority}
              options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: <span className={`c-tag ${PRIORITY_TONE[p]}`}>{p}</span> }))}
              onChange={(v) => patch(i, { priority: v })}
            />
          ),
        },
        {
          label: 'Status',
          width: 184,
          render: (a, i) => (
            <Select style={{ width: '100%' }} value={a.status} options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} onChange={(v: NextActionStatus) => setStatus(i, v)} />
          ),
        },
      ]}
      drawerTitle={(a) => a.description || 'New action'}
      drawer={(a, i) => (
        <section>
          <div className="rt-grid">
            <RecordField label="Description" wide>
              <Input.TextArea autoSize={{ minRows: 2 }} value={a.description} placeholder="What must be done?" onChange={(e) => patch(i, { description: e.target.value })} />
            </RecordField>
            <RecordField label="Gate">
              <Select style={{ width: '100%' }} value={a.gateId} options={gateOptions} onChange={(v) => patch(i, { gateId: v })} />
            </RecordField>
            <RecordField label="Owner">
              <UserSelect value={a.owner} onChange={(v) => patch(i, { owner: v ?? '' })} />
            </RecordField>
            <RecordField label="Due date">
              <DatePicker
                style={{ width: '100%' }}
                value={a.dueDate ? dayjs(a.dueDate) : null}
                onChange={(d) => patch(i, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            </RecordField>
            <RecordField label="Priority">
              <Select
                style={{ width: '100%' }}
                value={a.priority}
                options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                onChange={(v) => patch(i, { priority: v })}
              />
            </RecordField>
            <RecordField label="Status">
              <Select style={{ width: '100%' }} value={a.status} options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} onChange={(v: NextActionStatus) => setStatus(i, v)} />
            </RecordField>
            {/* F8: verified & closed by someone other than the owner. Recorded by
                the server as whoever moves the action to Closed or Cancelled —
                a name typed here would be the free-text signature D1 rejects. */}
            <RecordField label="Raised by">
              <span className="rt-static">{a.raisedBy ?? '—'}</span>
            </RecordField>
            <RecordField label="Verified by">
              <span className="rt-static">{a.verifiedBy ?? 'Recorded when someone other than the owner closes it'}</span>
            </RecordField>
            <RecordField label="Date completed">
              <span className="rt-static">{a.dateCompleted ?? '—'}</span>
            </RecordField>
          </div>
        </section>
      )}
      emptyText="No next actions recorded for this gate."
      addLabel="Add action"
      onAdd={addAction}
      onRemove={removeAction}
      isRowBlank={(a) => !a.description.trim() && !a.owner && !a.dueDate}
      removeLabel="Remove action"
      footer={
        dirty ? (
          <div className="rt-savebar">
            <div>
              <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
            </div>
          </div>
        ) : null
      }
    />
  );
}
