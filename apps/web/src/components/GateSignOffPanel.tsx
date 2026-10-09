import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Tooltip } from 'antd';
import { CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  GateContentChangedBody,
  GateSignOff,
  GateSignOffRole,
  GateSigningPreview,
  ProjectData,
} from '@mbc360/shared/types';
import { GATE_SIGNOFF_ROLES } from '@mbc360/shared/types';
import { GATE_DECISIONS, GATES } from '@mbc360/shared/config/gates';
import { openChangesAffectingGate } from '@mbc360/shared/config/changeTriggers';
import {
  CRITICAL_GATES,
  GATE_PASSING_DECISIONS,
  INDEPENDENT_FUNCTION_BY_GATE,
  findGateSignOff,
  gateSignOffMarkets,
  gateSignOffNeedsComment,
  previousGateSignOffRole,
} from '@mbc360/shared/config/gateSignOff';
import {
  currentGateIndex,
  gateIndex,
  gateSignOffStaleChanges,
  isGatePassed,
  isGateUnlocked,
} from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { useSession } from '../auth/useSession';
import { usePickerUsers } from '../hooks/useUserOptions';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import GateSignOffStepUpModal from './GateSignOffStepUpModal';
import GateSignPreviewModal from './GateSignPreviewModal';
import '../styles/concept.css';
import './GateSignOffPanel.css';

// Per-gate sign-off (Round 4 questions 18 and 29, 2026-08-29). One panel per
// gate, rendered inside the Phase Gate Flow row's existing full-width expansion —
// the same place the "What's blocking this gate" checklist lives, because a
// signature and the evidence it attests to are one subject.
//
// Gates 10-12 render one lane per market (question 18: "each market may differ in
// dossier status, regulatory decision, claims, artwork, formula version and
// launch date"); every other gate renders a single lane.
export default function GateSignOffPanel({
  project,
  gateId,
}: {
  project: ProjectData;
  gateId: string;
}) {
  const projectId = project.identity.id;
  const session = useSession();
  const users = usePickerUsers();
  const setAssignees = useAppStore((s) => s.setGateSignOffAssignees);
  const sign = useAppStore((s) => s.signGateSignOff);
  const withdraw = useAppStore((s) => s.withdrawGateSignOff);

  const allChanges = useAppStore((st) => st.changes);
  const openChanges = useMemo(
    () => openChangesAffectingGate(allChanges, projectId, GATES.find((g) => g.id === gateId)?.number ?? ''),
    [allChanges, projectId, gateId],
  );
  // The stage status is part of the snapshot every signature attests to
  // (GateEvidenceSnapshot.status), so a passing signature taken before the work
  // is marked Complete goes stale the moment it is — after three people have
  // signed. Holding the signature until then is the project owner's decision
  // (2026-10-05) and is deliberately UI-only: the API still accepts it, because
  // question 29(1) names the status as signed evidence without saying it must be
  // Complete first. [ASSUMPTION: R5-Q55]
  // Question 29(4)'s critical-gate rule reads a nominee's CAPABILITY, so the
  // panel needs the same permission grid the rest of the app uses. Admin
  // short-circuits inside `hasCapability`, exactly as it does on the server.
  const grants = useAppStore((st) => st.permissionGrid?.grants ?? EMPTY_GRANTS);
  // B4: once the gate has PASSED its signatures are frozen — withdrawing one
  // would un-pass the gate with no Backtrack and no reopened range, which the
  // API refuses. The button used to render anyway and only failed on the click.
  const gatePassed = isGatePassed(project, gateId);
  // B4: the server refuses a signature on any gate that is not the one open for
  // work, and refuses every write at all on an archived project. The panel used
  // to render the decision form, the comment box and a live Sign button on those
  // gates anyway, so a future gate offered a whole signing form that the API
  // would have rejected — and the reason it printed was the stage status, which
  // is not why it was refused. (2026-10-05, user-reported.)
  const archived = !!project.identity.archived;
  const canSign = isGateUnlocked(project, gateId) && !archived;
  const notOpenReason = archived
    ? 'This project is archived and read-only — restore it before signing anything.'
    : gateIndex(gateId) > currentGateIndex(project)
      ? `${gateId} is not open for work yet — every gate before it has to pass first.`
      : `${gateId} is no longer the gate open for work — reopen it with Backtrack to change its sign-off.`;
  const stageStatus = project.gates.find((g) => g.gateId === gateId)?.status ?? 'Not Started';
  const stageIncomplete = stageStatus !== 'Complete';
  const [drafts, setDrafts] = useState<Record<string, { decision?: string; comment?: string }>>({});
  // Sign opens the preview first (everything the signature attests to), then the authenticator step.
  const [reviewing, setReviewing] = useState<{ market?: string; role: GateSignOffRole } | null>(null);
  const [stepUp, setStepUp] = useState<{ market?: string; role: GateSignOffRole; preview: GateSigningPreview } | null>(null);
  const [changed, setChanged] = useState<GateContentChangedBody | null>(null);
  const [withdrawing, setWithdrawing] = useState<{ market?: string; role: GateSignOffRole } | null>(null);
  const [reason, setReason] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [totpEnrolled, setTotpEnrolled] = useState(false);

  useEffect(() => {
    void getMySignature().then((s) => setHasSignature(!!s?.imageData));
    void getMyTotpStatus().then((s) => setTotpEnrolled(!!s?.enrolled));
  }, []);

  const lanes = useMemo(() => gateSignOffMarkets(project, gateId), [project, gateId]);
  const isLead = project.identity.projectLead === session.user?.displayName;
  const critical = CRITICAL_GATES.includes(gateId);
  const independent = INDEPENDENT_FUNCTION_BY_GATE[gateId];

  const key = (market: string | undefined, role: GateSignOffRole) => `${market ?? ''}|${role}`;
  const draftOf = (market: string | undefined, role: GateSignOffRole) => drafts[key(market, role)] ?? {};
  const patchDraft = (market: string | undefined, role: GateSignOffRole, p: { decision?: string; comment?: string }) =>
    setDrafts((prev) => ({ ...prev, [key(market, role)]: { ...prev[key(market, role)], ...p } }));

  // Why the Sign button is unavailable, as a tooltip rather than an unexplained
  // disabled button. Mirrors the server's guards — it does not replace them.
  const blockedReason = (market: string | undefined, role: GateSignOffRole): string | null => {
    if (!canSign) return notOpenReason;
    const row = findGateSignOff(project, gateId, market, role);
    if (!row?.assignedToUserId) return "No signer nominated yet — the project's Lead nominates one";
    if (row.assignedToUserId !== session.user?.id) return `Nominated to ${row.assignedToName ?? 'somebody else'}`;
    const previous = previousGateSignOffRole(role);
    if (previous && !findGateSignOff(project, gateId, market, previous)?.signedAt) {
      return `"${previous}" must be signed first — the sequence is fixed`;
    }
    if (!hasSignature) return 'Save a signature in My Account first';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    const d = draftOf(market, role);
    if (!d.decision) return 'Choose a decision first';
    if (GATE_PASSING_DECISIONS.includes(d.decision) && stageIncomplete) {
      return `Save the stage status as Complete first — it is currently "${stageStatus}", and a signature attests the gate's work is done`;
    }
    if (gateSignOffNeedsComment(d.decision) && !d.comment?.trim()) {
      return `A comment is required when the decision is "${d.decision}"`;
    }
    return null;
  };

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    void withdraw(projectId, gateId, withdrawing.market, withdrawing.role, reason);
    setWithdrawing(null);
    setReason('');
  };

  if (lanes.length === 0) {
    return (
      <Alert
        type="warning"
        showIcon
        message={`${gateId} is signed off per market, and this project has no market recorded`}
        description="Add the Countries / Markets on Phase 1 first — there is nothing to sign off for anywhere until then."
      />
    );
  }

  return (
    <>
      {/* Once, above the lanes. The lock comes first: while the gate is not open
          for work the stage status is not what is holding the signature up, and
          printing that instead sends someone to fix the wrong field. */}
      {!canSign ? (
        <div className="concept-tokens gso-gate-hold">
          <ClockCircleOutlined />
          <span>{notOpenReason}</span>
        </div>
      ) : (
        stageIncomplete && (
        <div className="concept-tokens gso-gate-hold">
          <ClockCircleOutlined />
          <span>
            Signing is held until the <strong>saved</strong> stage status is Complete — it is currently "{stageStatus}".
            Save the gate first if you have just changed it. Hold, Backtrack and Reject/Stop can still be signed.
          </span>
        </div>
        )
      )}
      {lanes.map((market) => {
        const rows = GATE_SIGNOFF_ROLES.map(
          (role) => findGateSignOff(project, gateId, market, role) ?? ({ gateId, market, role } as GateSignOff),
        );
        return (
          // 2026-10-02 (user-reported): one block per role instead of a table
          // row. As a table the Comment column was a few characters wide, so a
          // typed comment wrapped one word per line and a signed one was hard to
          // read. Now the comment gets the full width, grows with its content,
          // and a signed comment keeps the line breaks it was written with.
          <div key={market ?? '_'} className="concept-tokens c-card gso">
            <div className="gso-head">
              <span className="gso-title">Gate sign-off</span>
              {market && <span className="c-tag">{market}</span>}
              {critical && (
                <Tooltip
                  title={`A critical gate: the reviewer must be a different person from the preparer, and at least one reviewer or approver must represent ${independent?.label}.`}
                >
                  <span className="c-tag c-tag-warn">Critical gate</span>
                </Tooltip>
              )}
            </div>
            {/* A WARNING, not a block: the rule is about a SET ("at least one
                reviewer or approver"), so until both are nominated the Lead may
                still satisfy it with the other one. Refusing a half-finished
                nomination would refuse a state that is on its way to valid. The
                hard refusal stays at the approver's signature. */}
            {independent &&
              (() => {
                const pick = (role: GateSignOffRole) => {
                  const row = rows.find((x) => x.role === role);
                  const id = row?.signedByUserId ?? row?.assignedToUserId ?? null;
                  return id ? users.find((u) => u.id === id) : undefined;
                };
                const rev = pick('Reviewed by');
                const app = pick('Approved by');
                if (!rev || !app) return null;
                const holds = (u: { roleKeys?: string[] }) =>
                  independent.anyOf.some((cap) => hasCapability(grants, u.roleKeys ?? [], cap));
                if (holds(rev) || holds(app)) return null;
                return (
                  <div className="gso-gate-warn">
                    <ExclamationCircleOutlined />
                    <span>
                      Neither {rev.displayName} nor {app.displayName} represents <strong>{independent.label}</strong>,
                      which this critical gate requires of the reviewer or the approver. The approval will be refused
                      until one of them does.
                    </span>
                  </div>
                );
              })()}
            {/* Question 29(4): the reviewer must differ from the preparer. Shown
                in the picker rather than only when the nominee reaches the
                authenticator prompt — the server refuses it at nomination too. */}
            {rows.map((r, i) => {
              const conflictWith: GateSignOffRole | null =
                r.role === 'Reviewed by' ? 'Prepared by' : r.role === 'Prepared by' ? 'Reviewed by' : null;
              const conflictRow = conflictWith ? rows.find((x) => x.role === conflictWith) : undefined;
              const conflictUserId = conflictRow?.signedByUserId ?? conflictRow?.assignedToUserId ?? null;
              const stale = r.signedAt ? gateSignOffStaleChanges(project, gateId, market, r.role) : [];
              const why = r.signedAt ? null : blockedReason(market, r.role);
              const draft = draftOf(market, r.role);
              const needsComment = !!draft.decision && gateSignOffNeedsComment(draft.decision);
              // Question 29(5) fixes the order, so only one step is ever
              // actionable. Showing three identical decision forms at once said
              // the opposite; the two that cannot be signed are now one line.
              const isTurn = !r.signedAt && rows.slice(0, i).every((p) => p.signedAt);
              const mine = r.assignedToUserId === session.user?.id;
              return (
                <div key={r.role} className={`gso-row${r.signedAt ? ' gso-row-done' : ''}`}>
                  <div className="gso-line">
                    <span
                      className={`gso-step${r.signedAt ? ' gso-step-done' : isTurn ? ' gso-step-now' : ''}`}
                      aria-hidden
                    >
                      {r.signedAt ? <CheckOutlined /> : i + 1}
                    </span>
                    <span className="gso-role">{r.role}</span>
                    <div className="gso-signer">
                      {r.signedAt ? (
                        <>
                          <strong>{r.name}</strong>
                          {r.roleAtSigning && <span className="gso-muted"> · {r.roleAtSigning}</span>}
                        </>
                      ) : isLead && !archived ? (
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="Nominate a signer"
                          value={r.assignedToUserId}
                          options={users.map((u) => ({
                            value: u.id,
                            label: u.roleName ? `${u.displayName} — ${u.roleName}` : u.displayName,
                            disabled: !!conflictUserId && u.id === conflictUserId,
                            title:
                              !!conflictUserId && u.id === conflictUserId
                                ? `Already on "${conflictWith}" — the reviewer must be a different person`
                                : undefined,
                          }))}
                          onChange={(v?: string) => setAssignees(projectId, gateId, market, [{ role: r.role, userId: v ?? null }])}
                        />
                      ) : (
                        <span className="gso-muted">{r.assignedToName ?? 'Not nominated yet'}</span>
                      )}
                    </div>
                    <div className="gso-action">
                      {r.signedAt ? (
                        <>
                          <span className="gso-muted">Signed {dayjs(r.signedAt).format('YYYY-MM-DD HH:mm')}</span>
                          {stale.length > 0 && (
                            <Tooltip title={stale.join(' · ')}>
                              <span className="c-tag c-tag-bad">Stale — re-sign ({stale.length})</span>
                            </Tooltip>
                          )}
                          {r.signedByUserId === session.user?.id &&
                            (archived ? (
                              <span className="gso-muted">Project archived — restore it to change this</span>
                            ) : gatePassed ? (
                              <span className="gso-muted">Gate passed — reopen with Backtrack to change this</span>
                            ) : (
                              <Button size="small" danger onClick={() => setWithdrawing({ market, role: r.role })}>
                                Withdraw
                              </Button>
                            ))}
                        </>
                      ) : (
                        <span className="c-tag">{isTurn ? (mine ? 'Your turn' : 'Waiting to be signed') : 'Not yet'}</span>
                      )}
                    </div>
                  </div>

                  {r.signedAt ? (
                    <div className="gso-record">
                      <span className={`c-tag c-tag-dot ${r.decision === 'Proceed' ? 'c-tag-ok' : 'c-tag-warn'}`}>{r.decision}</span>
                      {r.comment ? <p className="gso-comment">{r.comment}</p> : <span className="gso-muted">No comment</span>}
                    </div>
                  ) : isTurn && mine && canSign ? (
                    <div className="gso-form">
                      {r.role === 'Approved by' && openChanges.length > 0 && (
                        // C10: F9's acknowledgement — recorded on this signature.
                        <Alert
                          type="warning"
                          showIcon
                          title={`Open change control affects this gate: ${openChanges.map((c) => c.changeId).join(', ')}. A plain Proceed is refused; signing Proceed with Conditions records that you accept ${openChanges.length > 1 ? 'them' : 'it'}.`}
                        />
                      )}
                      <label>
                        <span className="gso-label">Decision</span>
                        <Select
                          style={{ width: '100%' }}
                          allowClear
                          placeholder="Decision"
                          value={draft.decision}
                          options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
                          onChange={(v?: string) => patchDraft(market, r.role, { decision: v })}
                        />
                      </label>
                      <label>
                        <span className="gso-label">
                          Comment{needsComment && <span className="gso-req"> * required for "{draft.decision}"</span>}
                        </span>
                        <Input.TextArea
                          autoSize={{ minRows: 2, maxRows: 10 }}
                          status={needsComment && !draft.comment?.trim() ? 'warning' : undefined}
                          placeholder="Required for anything other than a clean Proceed"
                          value={draft.comment}
                          onChange={(e) => patchDraft(market, r.role, { comment: e.target.value })}
                        />
                      </label>
                      <div className="gso-submit">
                        {why ? (
                          <Tooltip title={why}>
                            <span>
                              <Button type="primary" disabled>
                                Sign
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Button
                            type="primary"
                            onClick={() => {
                              setChanged(null);
                              setReviewing({ market, role: r.role });
                            }}
                          >
                            Sign
                          </Button>
                        )}
                        {why && <span className="gso-muted">{why}</span>}
                      </div>
                    </div>
                  ) : (
                    // Not repeated per row while the gate is locked: the reason is the
                    // same for all three and the banner above already carries it.
                    why &&
                    canSign && (
                      <div className="gso-wait">
                        <ClockCircleOutlined />
                        <span>{why}</span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <Modal
        open={withdrawing !== null}
        title="Withdraw this signature"
        okText="Withdraw"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={confirmWithdraw}
        onCancel={() => {
          setWithdrawing(null);
          setReason('');
        }}
      >
        <Input.TextArea
          rows={3}
          value={reason}
          placeholder="Why is this signature being withdrawn?"
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>

      <GateSignPreviewModal
        open={reviewing !== null}
        projectId={projectId}
        gateId={gateId}
        market={reviewing?.market}
        roleLabel={reviewing?.role ?? ''}
        changed={changed}
        onCancel={() => {
          setReviewing(null);
          setChanged(null);
        }}
        onContinue={(preview) => {
          if (!reviewing) return;
          setStepUp({ ...reviewing, preview });
          setReviewing(null);
        }}
      />

      <GateSignOffStepUpModal
        open={stepUp !== null}
        projectId={projectId}
        gateId={gateId}
        market={stepUp?.market}
        role={stepUp?.role ?? 'Prepared by'}
        expectedHash={stepUp?.preview.hash ?? ''}
        onClose={() => setStepUp(null)}
        onVerified={(token) => {
          const target = stepUp;
          setStepUp(null);
          if (!target) return;
          const d = draftOf(target.market, target.role);
          void sign(projectId, gateId, target.market, target.role, {
            decision: d.decision,
            comment: d.comment,
            stepUpToken: token,
            expectedHash: target.preview.hash,
            seen: { snapshot: target.preview.snapshot, previewedAt: target.preview.previewedAt },
          }).then((refusal) => {
            // The evidence changed while the signer was reading: show what, and let them review again.
            if (refusal) {
              setChanged(refusal);
              setReviewing({ market: target.market, role: target.role });
            }
          });
        }}
      />
    </>
  );
}
