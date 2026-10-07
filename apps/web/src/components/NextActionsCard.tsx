import { DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { NextAction, NextActionPriority, NextActionStatus, ProjectData } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import {
  NEXT_ACTION_RECORD_LOCK_REASON,
  NEXT_ACTION_REMOVE_LOCK_REASON,
  mayEditNextActionRecord,
  mayRemoveNextAction,
} from '@mbc360/shared/utils/nextActionAccess';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { EMPTY_GRANTS, canDecideGate } from '../utils/permissions';
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
  project,
  projectId,
  gateIds,
  actions,
}: {
  project: ProjectData;
  projectId: string;
  gateIds: string[];
  actions: NextAction[];
}) {
  const setActionsBulk = useAppStore((s) => s.setNextActionsBulk);
  const session = useSession();
  const permissionView = usePermissionView();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const rows = actions.filter((a) => gateIds.includes(a.gateId));
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const openCount = draft.filter((a) => !TERMINAL_STATUSES.includes(a.status)).length;
  const openCriticalCount = draft.filter((a) => !TERMINAL_STATUSES.includes(a.status) && a.priority === 'Critical').length;
  const gateOptions = gateIds.map((id) => {
    const meta = GATES.find((g) => g.id === id);
    return { value: id, label: `Gate ${meta?.number ?? id}` };
  });
  const gateNumber = (id: string) => GATES.find((g) => g.id === id)?.number ?? id;

  // Why Closed / Cancelled are unavailable on this action, mirroring the two
  // closure rules in the API's `guardNextActions`. Both used to be enforced only
  // at Save, so the dropdown offered a status the server then refused — the
  // owner of an action could pick Closed and only learn on Save that F8 forbids
  // verifying your own work (2026-10-05, user-reported).
  //
  // Identity (owner, raiser, gate owner) reads the REAL signed-in person, since
  // that is who the server authorises; the capability leg reads the permission
  // view like every other on-screen capability check.
  const me = session.user?.displayName;
  const committedById = new Map(rows.map((r) => [r.id, r]));
  // Who may edit or remove an action's record: its creator, the project Lead or
  // a System Administrator (same predicate the API applies). A row not yet saved
  // has no committed copy and is the current person's own. Status is not part
  // of this — F8 above decides it. Identity reads the real session, as the server
  // does.
  const actor = {
    displayName: me,
    isProjectLead: !!me && project.identity.projectLead.trim() === me.trim(),
    isAdmin: session.isAdmin,
  };
  const recordLocked = (a: NextAction): boolean => {
    const committed = committedById.get(a.id);
    return !!committed && !mayEditNextActionRecord(committed, actor);
  };
  // Removal is raiser-only [ASSUMPTION: R5-Q58]; a row not yet saved has no
  // committed copy and is yours.
  const removeLocked = (a: NextAction): boolean => {
    const committed = committedById.get(a.id);
    return !!committed && !mayRemoveNextAction(committed, actor);
  };
  const closeBlockedReason = (a: NextAction): string | null => {
    const committed = committedById.get(a.id);
    // The server only checks on ENTERING a terminal status, so an action that is
    // already Closed or Cancelled may still be moved between the two.
    if (committed && TERMINAL_STATUSES.includes(committed.status)) return null;
    if ((a.owner ?? '').trim() !== '' && a.owner === me) {
      return 'You own this action, so you cannot verify its own closure (F8). Set it to "Ready for Verification" and let its raiser, the gate owner or an authorised reviewer close it.';
    }
    // F8: the raiser, the gate owner or an authorised reviewer closes — every
    // priority. A row not yet saved has no raiser on record; the server credits
    // whoever first saves it, which is this person.
    const raisedBy = committed ? committed.raisedBy : me;
    const gateOwner = project.gates.find((g) => g.gateId === a.gateId)?.owner;
    const allowed =
      (!!me && me === raisedBy) ||
      (!!gateOwner && me === gateOwner) ||
      permissionView.roleKeys.some((k) => canDecideGate(grants, k, a.gateId));
    if (!allowed) {
      return `Only the action's raiser, the ${a.gateId} gate owner or an authorised reviewer (someone who may decide ${a.gateId}) can close or cancel it (F8).`;
    }
    return null;
  };
  const statusOptions = (a: NextAction) => {
    const why = closeBlockedReason(a);
    return STATUS_OPTIONS.map((st) => ({
      value: st,
      label: st,
      disabled: !!why && TERMINAL_STATUSES.includes(st),
      title: why && TERMINAL_STATUSES.includes(st) ? why : undefined,
    }));
  };

  const patch = (index: number, p: Partial<NextAction>) => update((prev) => patchArray(prev, index, p));
  // A new action always lands on the first gate this card covers, so that is the
  // gate the rule reads. Once it has passed, its open-action list is part of the
  // evidence its three signatures attest to and the gate can no longer be
  // re-signed — adding one would leave the signatures permanently stale. Editing
  // and closing what is already there stays open, which is what a gate carrying
  // conditions needs. [ASSUMPTION: R5-Q57]
  const addGateId = gateIds[0];
  const addBlocked = isGatePassed(project, addGateId)
    ? `${addGateId} has passed — a new action cannot be added to it. Reopen the gate with Backtrack, or close the actions already listed.`
    : undefined;

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
              disabled={recordLocked(a)}
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
            <Select style={{ width: '100%' }} value={a.status} options={statusOptions(a)} onChange={(v: NextActionStatus) => setStatus(i, v)} />
          ),
        },
      ]}
      drawerTitle={(a) => a.description || 'New action'}
      drawer={(a, i) => (
        <section>
          {recordLocked(a) && <p className="rt-note">{NEXT_ACTION_RECORD_LOCK_REASON}</p>}
          <div className="rt-grid">
            <RecordField label="Description" wide>
              <Input.TextArea autoSize={{ minRows: 2 }} disabled={recordLocked(a)} value={a.description} placeholder="What must be done?" onChange={(e) => patch(i, { description: e.target.value })} />
            </RecordField>
            <RecordField label="Gate">
              <Select style={{ width: '100%' }} disabled={recordLocked(a)} value={a.gateId} options={gateOptions} onChange={(v) => patch(i, { gateId: v })} />
            </RecordField>
            <RecordField label="Owner">
              <UserSelect disabled={recordLocked(a)} value={a.owner} onChange={(v) => patch(i, { owner: v ?? '' })} />
            </RecordField>
            <RecordField label="Due date">
              <DatePicker
                style={{ width: '100%' }}
                disabled={recordLocked(a)}
                value={a.dueDate ? dayjs(a.dueDate) : null}
                onChange={(d) => patch(i, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            </RecordField>
            <RecordField label="Priority">
              <Select
                style={{ width: '100%' }}
                disabled={recordLocked(a)}
                value={a.priority}
                options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                onChange={(v) => patch(i, { priority: v })}
              />
            </RecordField>
            <RecordField label="Status" wide>
              <Select style={{ width: '100%' }} value={a.status} options={statusOptions(a)} onChange={(v: NextActionStatus) => setStatus(i, v)} />
              {/* Written out rather than left in the disabled options' tooltip:
                  the useful part is what to do instead, and nobody hovers a
                  dropdown entry they cannot click. */}
              {closeBlockedReason(a) && <p className="rt-note">{closeBlockedReason(a)}</p>}
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
      addDisabledReason={addBlocked}
      onAdd={addAction}
      onRemove={removeAction}
      removeBlockedReason={(a) => (removeLocked(a) ? NEXT_ACTION_REMOVE_LOCK_REASON : undefined)}
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
