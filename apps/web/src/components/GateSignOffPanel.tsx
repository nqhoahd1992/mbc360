import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Tooltip } from 'antd';
import { CheckCircleOutlined, CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined, HistoryOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  GateContentChangedBody,
  GateSignOff,
  GateSignOffRole,
  ProjectData,
} from '@mbc360/shared/types';
import { GATE_SIGNOFF_ROLES } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { openChangesAffectingGate } from '@mbc360/shared/config/changeTriggers';
import {
  CRITICAL_GATES,
  GATE_PASSING_DECISIONS,
  INDEPENDENT_FUNCTION_BY_GATE,
  findGateSignOff,
  gateFlowMissing,
  gateSignOffMarkets,
  gateSignOffNeedsComment,
  previousGateSignOffRole,
} from '@mbc360/shared/config/gateSignOff';
import {
  currentGateIndex,
  gateIndex,
  gateBlockers,
  gateReadinessChecklist,
  gateSignOffStaleChanges,
  hardGateBlockers,
  isGatePassed,
  isGateUnlocked,
} from '@mbc360/shared/utils/gateProgress';
import { gapBlocksDecision } from '@mbc360/shared/utils/gapCriticality';
import { isPerMarketGate } from '@mbc360/shared/config/gateSignOff';
import { useAppStore } from '../store/useAppStore';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { useSession } from '../auth/useSession';
import { usePickerUsers } from '../hooks/useUserOptions';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import GateSignPreviewModal from './GateSignPreviewModal';
import GateSignOffHistoryTable from './GateSignOffHistoryTable';
import FormDrawer from './FormDrawer';
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
  // The Phase Gate Flow card above must be complete (SW-26): owner, due date and evidence link, as SAVED.
  const flowMissing = gateFlowMissing(project, gateId);
  // Everything else that still blocks this gate. The sign-off item is left out: it can only be satisfied BY signing.
  const openBlockers = gateReadinessChecklist(project, gateId).filter(
    (i) => !i.satisfied && i.hardBlock && i.id !== `${gateId.toLowerCase()}-signoff`,
  ).length;
  const [drafts, setDrafts] = useState<Record<string, { decision?: string; comment?: string }>>({});
  // Sign opens the preview first (everything the signature attests to), then the authenticator step.
  // Whose history is open: a lane (a market, or '' for the single lane of a gate without markets).
  const [historyLane, setHistoryLane] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ market?: string; role: GateSignOffRole } | null>(null);
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
  // Signatures given and withdrawn on this gate (for a per-market gate, on that market's lane), newest first.
  const laneEvents = (market: string | undefined) =>
    [...(project.gateSignOffLog ?? [])]
      .filter((e) => e.gateId === gateId && (market ? e.market === market : true))
      .reverse();
  const anySigned = project.gateSignOffs.some((s) => s.gateId === gateId && !!s.signedAt);
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
    // Nobody signs while the gate is still blocked: the readiness list has to be clear first.
    if (stageIncomplete || flowMissing.length > 0 || openBlockers > 0) {
      return "Signing opens once the Phase Gate Flow is saved as complete and nothing else is blocking this gate — see the readiness list.";
    }
    const row = findGateSignOff(project, gateId, market, role);
    if (!row?.assignedToUserId) return "No signer nominated yet — the project's Lead nominates one";
    if (row.assignedToUserId !== session.user?.id) return `Nominated to ${row.assignedToName ?? 'somebody else'}`;
    const previous = previousGateSignOffRole(role);
    if (previous && !findGateSignOff(project, gateId, market, previous)?.signedAt) {
      return `"${previous}" must be signed first — the sequence is fixed`;
    }
    if (!hasSignature) return 'Save a signature in My Account first';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    return null;
  };

  // What is wrong with the decision itself, shown in the review modal where it is entered.
  const decisionProblem = (market: string | undefined, role: GateSignOffRole): string | null => {
    const d = draftOf(market, role);
    if (!d.decision) return 'Choose a decision to continue.';
    if (GATE_PASSING_DECISIONS.includes(d.decision) && stageIncomplete) {
      return `Save the stage status as Complete first — it is currently "${stageStatus}", and a signature attests the gate's work is done.`;
    }
    if (GATE_PASSING_DECISIONS.includes(d.decision) && flowMissing.length > 0) {
      return `Complete the Phase Gate Flow first and save it: ${flowMissing.join(', ')}.`;
    }
    if (gateSignOffNeedsComment(d.decision) && !d.comment?.trim()) {
      return `A comment is required when the decision is "${d.decision}".`;
    }
    // The approver's decision IS the gate decision, so the same guards a direct decision meets apply here. Said in the
    // modal, before the code is asked for, rather than as a refusal after it (the server states the same reasons).
    if (role === 'Approved by' && GATE_PASSING_DECISIONS.includes(d.decision)) {
      return approverDecisionProblem(market, d.decision as 'Proceed' | 'Proceed with Conditions');
    }
    return null;
  };

  // Mirrors the server's `resolveDecision` for the approver's signature, evaluated against the project AS IT WILL BE
  // once this signature exists (its own sign-off item would otherwise block it by construction).
  const approverDecisionProblem = (market: string | undefined, decision: 'Proceed' | 'Proceed with Conditions'): string | null => {
    const gate = project.gates.find((g) => g.gateId === gateId);
    if (!gate) return null;
    const next = { ...gate, decision };
    const verdict = gapBlocksDecision(next, decision);
    if (verdict) {
      const fix = verdict.missing?.length
        ? `Record ${verdict.missing.join(', ')} on the gap assessment, or choose ${verdict.allowed.map((a) => `"${a}"`).join(' or ')} instead`
        : `Record ${verdict.allowed.map((a) => `"${a}"`).join(' or ')} instead`;
      return `"${decision}" is not valid — ${verdict.reason}. ${fix}.`;
    }
    if (decision === 'Proceed' && openChanges.length > 0) {
      return `An open change control record affects this gate — record "Proceed with Conditions" instead (${openChanges.map((c) => c.changeId).join(', ')}).`;
    }
    const pending = {
      ...project,
      gateSignOffs: [
        ...project.gateSignOffs.filter(
          (x) => !(x.gateId === gateId && (x.market ?? undefined) === market && x.role === 'Approved by'),
        ),
        {
          gateId,
          ...(market ? { market, formulaVersion: project.formulaVersion } : {}),
          role: 'Approved by' as const,
          signedByUserId: session.user?.id,
          signedAt: new Date().toISOString(),
          decision,
        } as GateSignOff,
      ],
    };
    // On a per-market gate the other markets' lanes are not this approver's to sign: their being unsigned must not
    // refuse this lane's approval.
    const otherLanesOpen =
      isPerMarketGate(gateId) &&
      gateSignOffMarkets(pending, gateId).some(
        (m) =>
          m !== market &&
          !GATE_PASSING_DECISIONS.includes(
            (findGateSignOff(pending, gateId, m, 'Approved by')?.signedAt ? findGateSignOff(pending, gateId, m, 'Approved by')?.decision : undefined) ?? '',
          ),
      );
    const signOffItem = `${gateId.toLowerCase()}-signoff`;
    const blockers = (decision === 'Proceed' ? gateBlockers(pending, gateId, decision) : hardGateBlockers(pending, gateId)).filter(
      (b) => !(otherLanesOpen && b.id === signOffItem),
    );
    if (blockers.length > 0) {
      return `"${decision}" is not valid yet — ${blockers.map((b) => b.label).join('; ')}`;
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

  // What is holding the signatures up, said inside each sign-off card (under its title) rather than as a banner
  // above it. The lock comes first: while the gate is not open for work the stage status is not what is holding the
  // signature up, and printing that instead sends someone to fix the wrong field.
  const flowTodo = [...(stageIncomplete ? ['Stage status → Complete'] : []), ...flowMissing];
  const notices = (
    <>
      {anySigned && !gatePassed && (
        <div className="concept-tokens gso-gate-hold gso-notice">
          <LockOutlined />
          <span>
            A signature stands on this gate, so the evidence it signed is <strong>locked</strong>: Prepared, Reviewed and
            Approved must all attest to the same content. Data that belongs to later gates can still be added. To change
            what was signed, withdraw the signatures (latest first, each with a reason).
          </span>
        </div>
      )}
      {!canSign && gatePassed && !archived ? (
        <div className="concept-tokens gso-gate-hold gso-gate-ok gso-notice">
          <CheckCircleOutlined />
          <span>Gate passed — the signatures are locked. Reopen the gate with Backtrack to change them.</span>
        </div>
      ) : !canSign ? (
        <div className="concept-tokens gso-gate-hold gso-notice">
          <ClockCircleOutlined />
          <span>{notOpenReason}</span>
        </div>
      ) : (
        flowTodo.length > 0 && (
          <div className="concept-tokens gso-gate-hold gso-notice">
            <ClockCircleOutlined />
            <span>
              Before anyone can sign, complete the Phase Gate Flow above and <strong>save</strong> it: {flowTodo.join(' · ')}.
            </span>
          </div>
        )
      )}
    </>
  );

  return (
    <>
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
              <span className="gso-progress">
                {new Set(rows.filter((x) => x.signedAt && x.decision).map((x) => x.decision)).size > 1 && (
                  <Tooltip title={rows.filter((x) => x.signedAt).map((x) => `${x.role}: ${x.decision}`).join(' · ')}>
                    <span className="c-tag c-tag-warn" style={{ marginRight: 8 }}>Decisions differ</span>
                  </Tooltip>
                )}
                {rows.filter((x) => x.signedAt).length} of {rows.length} signed
              </span>
              <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => setHistoryLane(market ?? '')}>
                History ({laneEvents(market).length})
              </Button>
              {critical && (
                <Tooltip
                  title={`A critical gate: the reviewer must be a different person from the preparer, and at least one reviewer or approver must represent ${independent?.label}.`}
                >
                  <span className="c-tag c-tag-warn">Critical gate</span>
                </Tooltip>
              )}
            </div>
            {notices}
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
              // Question 29(5) fixes the order, so only one step is ever
              // actionable. Showing three identical decision forms at once said
              // the opposite; the two that cannot be signed are now one line.
              const isTurn = !r.signedAt && rows.slice(0, i).every((p) => p.signedAt);
              const mine = r.assignedToUserId === session.user?.id;
              const waitText = !r.assignedToUserId
                ? isLead && !archived
                  ? null
                  : 'Waiting for the project Lead to nominate a signer'
                : isTurn && mine
                  ? why
                  : r.assignedToUserId !== session.user?.id && isTurn
                    ? `Nominated to ${r.assignedToName ?? 'somebody else'} — waiting for them to sign`
                    : why;
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
                            ) : gatePassed ? null : (
                              <Button size="small" danger onClick={() => setWithdrawing({ market, role: r.role })}>
                                Withdraw
                              </Button>
                            ))}
                        </>
                      ) : (
                        isTurn && mine && canSign ? (
                          why ? (
                            <Tooltip title={why}>
                              <span>
                                <Button type="primary" disabled>
                                  Review & sign
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
                              Review & sign
                            </Button>
                          )
                        ) : (
                          <span className="c-tag">{isTurn ? 'Waiting to be signed' : 'Not yet'}</span>
                        )
                      )}
                    </div>
                  </div>

                  {r.signedAt ? (
                    <div className="gso-record">
                      <span className={`c-tag c-tag-dot ${r.decision === 'Proceed' ? 'c-tag-ok' : 'c-tag-warn'}`}>{r.decision}</span>
                      {r.comment ? <p className="gso-comment">{r.comment}</p> : <span className="gso-muted">No comment</span>}
                    </div>
                  ) : (
                    // One short line, only when there is something to do or wait for. The Lead is told nothing
                    // about "the Lead nominates" — the empty picker above already says it.
                    waitText &&
                    canSign && (
                      <div className="gso-wait">
                        <ClockCircleOutlined />
                        <span>{waitText}</span>
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

      <FormDrawer
        title={`Sign-off history — ${gateId}${historyLane ? ` · ${historyLane}` : ''}`}
        open={historyLane !== null}
        onCancel={() => setHistoryLane(null)}
        footer={null}
        width={820}
      >
        {historyLane !== null && laneEvents(historyLane || undefined).length === 0 ? (
          <p className="gso-muted">Nothing has been signed or withdrawn on this gate yet.</p>
        ) : (
          historyLane !== null && <GateSignOffHistoryTable projectId={projectId} events={laneEvents(historyLane || undefined)} />
        )}
      </FormDrawer>

      <GateSignPreviewModal
        open={reviewing !== null}
        projectId={projectId}
        gateId={gateId}
        market={reviewing?.market}
        roleLabel={reviewing?.role ?? ''}
        role={reviewing?.role ?? 'Prepared by'}
        decision={reviewing ? draftOf(reviewing.market, reviewing.role).decision : undefined}
        comment={reviewing ? draftOf(reviewing.market, reviewing.role).comment : undefined}
        onDecisionChange={(p) => reviewing && patchDraft(reviewing.market, reviewing.role, p)}
        problem={reviewing ? decisionProblem(reviewing.market, reviewing.role) : null}
        earlier={
          reviewing
            ? GATE_SIGNOFF_ROLES.map((role) => findGateSignOff(project, gateId, reviewing.market, role))
                .filter((s): s is GateSignOff => !!s && !!s.signedAt && s.role !== reviewing.role)
                .map((s) => ({ role: s.role, name: s.name ?? '', decision: s.decision ?? '', comment: s.comment ?? '' }))
            : []
        }
        warning={
          reviewing?.role === 'Approved by' && openChanges.length > 0
            ? `Open change control affects this gate: ${openChanges.map((c) => c.changeId).join(', ')}. A plain Proceed is refused; signing Proceed with Conditions records that you accept ${openChanges.length > 1 ? 'them' : 'it'}.`
            : null
        }
        changed={changed}
        onCancel={() => {
          setReviewing(null);
          setChanged(null);
        }}
        onSign={(preview, token) => {
          const target = reviewing;
          if (!target) return;
          setReviewing(null);
          const d = draftOf(target.market, target.role);
          void sign(projectId, gateId, target.market, target.role, {
            decision: d.decision,
            comment: d.comment,
            stepUpToken: token,
            expectedHash: preview.hash,
            seen: { snapshot: preview.snapshot, previewedAt: preview.previewedAt },
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
