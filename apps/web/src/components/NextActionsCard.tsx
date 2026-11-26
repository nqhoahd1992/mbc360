import { DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { NextAction, NextActionPriority, NextActionStatus, ProjectData } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { isPerMarketGate } from '@mbc360/shared/config/gateSignOff';
import { NEXT_ACTION_FROZEN_REASON, nextActionFreeze } from '@mbc360/shared/utils/nextActionAccess';
import {
  NEXT_ACTION_RECORD_LOCK_REASON,
  NEXT_ACTION_REMOVE_LOCK_REASON,
  mayEditNextActionRecord,
  mayRemoveNextAction,
} from '@mbc360/shared/utils/nextActionAccess';
import { useAppStore } from '../store/useAppStore';
import { useAllowSameSigner } from '../hooks/useAllowSameSigner';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { canDecideGate } from '@mbc360/shared/utils/projectAuthority';
import {
  NEXT_ACTION_TYPES,
  actionCancellationGaps,
  actionClosureRefusal,
  actionIsLowRiskAdministrative,
  actionNeedsIndependentVerification,
  actionVerifierProblem,
} from '@mbc360/shared/utils/actionVerification';
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
  market,
}: {
  project: ProjectData;
  projectId: string;
  gateIds: string[];
  actions: NextAction[];
  // The market chosen on the gate tab (Gates 10-12). The card lists the actions of THIS market and the ones that name no market; the draft
  // still holds every action of the gate, because a save replaces the gate's whole list and must not drop the other markets'.
  market?: string;
}) {
  const setActionsBulk = useAppStore((s) => s.setNextActionsBulk);
  const session = useSession();
  const permissionView = usePermissionView();
  const rows = actions.filter((a) => gateIds.includes(a.gateId));
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const shown = market ? draft.filter((a) => !a.market || a.market === market) : draft;
  const at = (a: NextAction) => draft.indexOf(a);
  const openCount = shown.filter((a) => !TERMINAL_STATUSES.includes(a.status)).length;
  const openCriticalCount = shown.filter((a) => !TERMINAL_STATUSES.includes(a.status) && a.priority === 'Critical').length;
  // Only a gate signed per market can give an action a market: "All markets" or one of the project's.
  const marketOptions = [
    { value: '', label: 'All markets' },
    ...project.identity.markets.map((m) => ({ value: m, label: m })),
  ];
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
  const allowSameSigner = useAllowSameSigner();
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
  // SW-19: once the action's gate has passed, a closed or cancelled action is frozen and an
  // open one (a condition the approval accepted) can be progressed but not rewritten or
  // given a lower priority. The server applies the same function. [ASSUMPTION: R5-Q59]
  const freezeOf = (a: NextAction) => {
    const committed = committedById.get(a.id);
    return nextActionFreeze(committed, !!committed && isGatePassed(project, committed.gateId));
  };
  // Removal is raiser-only (SW-40); a row not yet saved has no
  // committed copy and is yours.
  const removeLocked = (a: NextAction): boolean => {
    const committed = committedById.get(a.id);
    return !!committed && !mayRemoveNextAction(committed, actor);
  };
  // Round 5 question 23(b): who may close or cancel depends on what the action is (utils/actionVerification.ts, the function the server applies).
  const closureRefusal = (a: NextAction, to: 'Closed' | 'Cancelled'): string | null => {
    const committed = committedById.get(a.id);
    // Development only: one account may close its own action; the server says so in a toast when it lets it through.
    if (allowSameSigner && !(to === 'Closed' && actionIsLowRiskAdministrative(a) && !(a.evidenceLink ?? '').trim())) return null;
    // The server only checks on ENTERING a terminal status, so an action that is already Closed or Cancelled may still be moved between the two.
    if (committed && TERMINAL_STATUSES.includes(committed.status)) return null;
    return (
      actionClosureRefusal(a, {
        me: me ?? '',
        // A row not yet saved has no raiser on record; the server credits whoever first saves it, which is this person.
        raisedBy: committed ? committed.raisedBy : me,
        gateOwner: project.gates.find((g) => g.gateId === a.gateId)?.owner,
        authorised: canDecideGate(project, a.gateId, { displayName: session.user?.displayName ?? '', isAdmin: permissionView.isAdmin }),
        to,
      }) ?? null
    );
  };
  const closeBlockedReason = (a: NextAction): string | null => closureRefusal(a, 'Closed') ?? closureRefusal(a, 'Cancelled');
  const statusOptions = (a: NextAction) =>
    STATUS_OPTIONS.map((st) => {
      const why = st === 'Closed' || st === 'Cancelled' ? closureRefusal(a, st) : null;
      return { value: st, label: st, disabled: !!why, title: why ?? undefined };
    });

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
      {
        id: `NA-${Date.now()}`,
        gateId: gateIds[0],
        // A new action starts in the market being worked on.
        ...(market && isPerMarketGate(gateIds[0]) ? { market } : {}),
        description: '',
        status: 'Open' as const,
        priority: 'Medium' as const,
      },
    ]);
    return shown.length;
  };
  // `index` is a place in the rows SHOWN; the action is found by its id in the whole draft.
  const removeAction = (index: number) => {
    const target = shown[index];
    if (target) update((prev) => prev.filter((a) => a.id !== target.id));
  };
  const save = async () => {
    const ok = await setActionsBulk(projectId, gateIds, draft);
    if (ok) markSaved();
    return ok;
  };
  const setStatus = (i: number, v: NextActionStatus) =>
    patch(i, { status: v, dateCompleted: v === 'Closed' ? dayjs().format('YYYY-MM-DD') : undefined });

  return (
    <RecordList
      dirty={dirty}
      onSave={save}
      title="Next Actions"
      description="Open actions block a plain Proceed (allowed only under Proceed with Conditions); a Critical action blocks the gate even under Proceed with Conditions."
      count={
        <>
          {openCount} open / {shown.length} total
          {openCriticalCount > 0 && <span className="rl-req"> · {openCriticalCount} Critical</span>}
        </>
      }
      rows={shown}
      rowKey={(a) => a.id}
      rowBadge={
        gateIds.length > 1 || draft.some((a) => a.market)
          ? (a) => (
              <>
                {gateIds.length > 1 && <span className="c-tag" style={{ flexShrink: 0 }}>{gateNumber(a.gateId)}</span>}
                {a.market && (
                  <span className="c-tag" style={{ flexShrink: 0 }} title={`This action is about ${a.market} alone`}>
                    {a.market}
                  </span>
                )}
              </>
            )
          : undefined
      }
      rowTitle={(a) => a.description || <span className="rt-muted">New action — describe what must be done</span>}
      rowSubtitle={(a) => [a.owner, a.dueDate && `due ${a.dueDate}`].filter(Boolean).join(' · ')}
      rowFlag={(a) => a.priority === 'Critical' && !TERMINAL_STATUSES.includes(a.status)}
      inline={[
        {
          label: 'Priority',
          width: 132,
          render: (a) => (
            <Select
              style={{ width: '100%' }}
              disabled={recordLocked(a) || freezeOf(a).rewrite}
              value={a.priority}
              options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: <span className={`c-tag ${PRIORITY_TONE[p]}`}>{p}</span> }))}
              onChange={(v) => patch(at(a), { priority: v })}
            />
          ),
        },
        {
          label: 'Status',
          width: 184,
          render: (a) => (
            <Select style={{ width: '100%' }} disabled={freezeOf(a).all} value={a.status} options={statusOptions(a)} onChange={(v: NextActionStatus) => setStatus(at(a), v)} />
          ),
        },
      ]}
      drawerTitle={(a) => a.description || 'New action'}
      drawer={(a) => (
        <section>
          {recordLocked(a) && <p className="rt-note">{NEXT_ACTION_RECORD_LOCK_REASON}</p>}
          {freezeOf(a).rewrite && <p className="rt-note">{NEXT_ACTION_FROZEN_REASON}</p>}
          <div className="rt-grid">
            <RecordField label="Description" wide>
              <Input.TextArea autoSize={{ minRows: 2 }} disabled={recordLocked(a) || freezeOf(a).rewrite} value={a.description} placeholder="What must be done?" onChange={(e) => patch(at(a), { description: e.target.value })} />
            </RecordField>
            <RecordField label="Gate">
              <Select style={{ width: '100%' }} disabled={recordLocked(a) || freezeOf(a).rewrite} value={a.gateId} options={gateOptions} onChange={(v) => patch(at(a), { gateId: v })} />
            </RecordField>
            {isPerMarketGate(a.gateId) && (
              <RecordField label="Market">
                <Select
                  style={{ width: '100%' }}
                  disabled={recordLocked(a) || freezeOf(a).rewrite}
                  value={a.market ?? ''}
                  options={marketOptions}
                  onChange={(v: string) => patch(at(a), { market: v || undefined })}
                />
                <p className="rt-note">An action in one market does not hold another; "All markets" holds every market.</p>
              </RecordField>
            )}
            <RecordField label="Owner">
              <UserSelect disabled={recordLocked(a) || freezeOf(a).all} value={a.owner} onChange={(v) => patch(at(a), { owner: v ?? '' })} />
            </RecordField>
            <RecordField label="Due date">
              <DatePicker
                style={{ width: '100%' }}
                disabled={recordLocked(a) || freezeOf(a).all}
                value={a.dueDate ? dayjs(a.dueDate) : null}
                onChange={(d) => patch(at(a), { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            </RecordField>
            <RecordField label="Priority">
              <Select
                style={{ width: '100%' }}
                disabled={recordLocked(a) || freezeOf(a).rewrite}
                value={a.priority}
                options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                onChange={(v) => patch(at(a), { priority: v })}
              />
            </RecordField>
            {/* Round 5 question 23(b): the kind of action decides whether closing it needs someone other than its owner. [ASSUMPTION: R6-Q31] */}
            <RecordField label="Type of action">
              <Select
                style={{ width: '100%' }}
                allowClear
                disabled={recordLocked(a) || freezeOf(a).rewrite}
                placeholder="Choose"
                value={a.actionType || undefined}
                options={NEXT_ACTION_TYPES.map((v) => ({ value: v, label: v }))}
                onChange={(v?: string) => patch(at(a), { actionType: v || undefined })}
              />
              <p className="rt-note">
                {actionNeedsIndependentVerification(a)
                  ? 'Closing this action needs independent verification: Critical and High actions, and actions closing a safety, regulatory, claims, release or material quality risk.'
                  : actionIsLowRiskAdministrative(a)
                    ? 'A low-risk administrative action: its owner may close it with the evidence link filled in.'
                    : 'Choose Administrative for a low-risk administrative action its owner may close with evidence.'}
              </p>
            </RecordField>
            {actionNeedsIndependentVerification(a) && (
              <RecordField label={<>Verifier<span className="as-req">&nbsp;*</span></>}>
                <UserSelect disabled={recordLocked(a) || freezeOf(a).all} value={a.verifier} onChange={(v) => patch(at(a), { verifier: v ?? '' })} />
                {!allowSameSigner && actionVerifierProblem(a) && <p className="rt-note">{actionVerifierProblem(a)}</p>}
                <p className="rt-note">A qualified person other than the owner, who closes the action after checking the evidence.</p>
              </RecordField>
            )}
            {/* Round 5 question 9: a controlled action also holds how completion is judged, when it escalates and the closure
                evidence. A gap can only be carried by an action that has the first two. [ASSUMPTION: R6-Q15] */}
            <RecordField label="Completion criteria" wide>
              <Input.TextArea
                autoSize={{ minRows: 2 }}
                disabled={recordLocked(a) || freezeOf(a).all}
                value={a.completionCriteria ?? ''}
                placeholder="How will we know it is done?"
                onChange={(e) => patch(at(a), { completionCriteria: e.target.value })}
              />
            </RecordField>
            <RecordField label="Escalation trigger" wide>
              <Input
                disabled={recordLocked(a) || freezeOf(a).all}
                value={a.escalationTrigger ?? ''}
                placeholder="What makes this escalate (for example, overdue by a week)?"
                onChange={(e) => patch(at(a), { escalationTrigger: e.target.value })}
              />
            </RecordField>
            <RecordField label="Evidence link" wide>
              <Input
                disabled={recordLocked(a) || freezeOf(a).all}
                value={a.evidenceLink ?? ''}
                placeholder="Link to the closure evidence"
                onChange={(e) => patch(at(a), { evidenceLink: e.target.value })}
              />
            </RecordField>
            <RecordField label="Status" wide>
              <Select style={{ width: '100%' }} disabled={freezeOf(a).all} value={a.status} options={statusOptions(a)} onChange={(v: NextActionStatus) => setStatus(at(a), v)} />
              {/* Written out rather than left in the disabled options' tooltip:
                  the useful part is what to do instead, and nobody hovers a
                  dropdown entry they cannot click. */}
              {closeBlockedReason(a) && <p className="rt-note">{closeBlockedReason(a)}</p>}
            </RecordField>
            {/* F8: verified & closed by someone other than the owner. Recorded by
                the server as whoever moves the action to Closed or Cancelled —
                a name typed here would be the free-text signature D1 rejects. */}
            {a.status === 'Cancelled' && !actionIsLowRiskAdministrative(a) && (
              <>
                <RecordField label={<>Justification for cancelling<span className="as-req">&nbsp;*</span></>} wide>
                  <Input.TextArea autoSize={{ minRows: 2 }} disabled={freezeOf(a).all} value={a.cancellationReason ?? ''} onChange={(e) => patch(at(a), { cancellationReason: e.target.value })} />
                </RecordField>
                <RecordField label={<>Impact review<span className="as-req">&nbsp;*</span></>} wide>
                  <Input.TextArea
                    autoSize={{ minRows: 2 }}
                    disabled={freezeOf(a).all}
                    value={a.cancellationImpact ?? ''}
                    placeholder="What does cancelling leave unaddressed, and who confirmed that is acceptable?"
                    onChange={(e) => patch(at(a), { cancellationImpact: e.target.value })}
                  />
                  {actionCancellationGaps(a).length > 0 && <p className="rt-note">Still needed: {actionCancellationGaps(a).join(' and ')}.</p>}
                </RecordField>
              </>
            )}
            <RecordField label="Raised by">
              <span className="rt-static">{a.raisedBy ?? '—'}</span>
            </RecordField>
            <RecordField label="Verified by">
              <span className="rt-static">{a.verifiedBy ?? 'Recorded when the action is closed'}</span>
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
            <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
          </div>
        ) : null
      }
    />
  );
}
