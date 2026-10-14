import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Spin, Table, Tooltip } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined, HistoryOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PhaseSignedContent, PhaseSignOffEvent, SignOff } from '@mbc360/shared/types';
import { isSignedOff } from '@mbc360/shared/types';
import type { PhaseClosure } from '@mbc360/shared/types';
import type { PhaseCompletionChecklist } from '@mbc360/shared/utils/gateProgress';
import { PHASES } from '@mbc360/shared/config/gates';
import { gateSignOffNeedsComment } from '@mbc360/shared/config/gateSignOff';
import { useAppStore } from '../store/useAppStore';
import { canApprovePhase, EMPTY_GRANTS } from '../utils/permissions';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { usePickerUsers } from '../hooks/useUserOptions';
import { useDraft } from '../hooks/useDraft';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import { getPhaseSignedContent } from '../api/projectsApi';
import SaveBar from './SaveBar';
import SignatureStepUpModal from './SignatureStepUpModal';
import FormDrawer from './FormDrawer';
import PhaseSignPreviewModal, { PhaseContentSections } from './PhaseSignPreviewModal';
import { Link } from 'react-router-dom';
import './GateSignOffPanel.css';
import './SignOffBlock.css';

// Phase sign-off, rebuilt 2026-08-20 around rule D1's requirement that a
// sign-off record an AUTHENTICATED user, the role held, date/time, decision,
// record version and a comment.
//
// What it replaced: `Name` was a free-text/any-user picker and `Signature /
// initials` a free-text box, so the row could name one person while the server
// (which already took `signedByUserId` from the session) recorded another — and
// no screen showed the mismatch. Nothing here writes those fields any more:
//
//   · the project's Lead nominates a signer for each of the three roles
//   · only that person can sign, and they sign as themselves
//   · who / which role / when / against which record version comes from the
//     server; only the decision and the comment are typed
//   · a signature is released by its own signer (or an admin), with a reason
//
// Everything is enforced again server-side (projects.service.ts) — the buttons
// below only avoid offering an action the API would refuse.
//
// Deliberately keyed on the REAL signed-in session, never the "View as"
// simulator: a signature is real data, so a demo role switch must not produce
// one (same principle as project archive/delete).

interface RowDraft {
  decision?: string;
  comments?: string;
}

export default function SignOffBlock({
  projectId,
  phase,
  closure,
  checklist,
  projectLead,
}: {
  projectId: string;
  phase: number;
  closure: PhaseClosure;
  checklist: PhaseCompletionChecklist;
  projectLead: string;
}) {
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const historyEvents = (project?.phaseSignOffLog ?? []).filter((e) => e.phase === phase).slice().reverse();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewing, setViewing] = useState<PhaseSignOffEvent | null>(null);
  const [viewed, setViewed] = useState<PhaseSignedContent | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  useEffect(() => {
    if (!viewing?.signedAt) return;
    let cancelled = false;
    setViewLoading(true);
    setViewed(null);
    setViewError(null);
    getPhaseSignedContent(projectId, phase, viewing.role, viewing.signedAt)
      .then((c) => {
        if (!cancelled) setViewed(c);
      })
      .catch((e) => {
        if (!cancelled) setViewError(e instanceof Error ? e.message : 'Could not load the signed content');
      })
      .finally(() => {
        if (!cancelled) setViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewing, projectId, phase]);
  const setEvidenceSummary = useAppStore((s) => s.setEvidenceSummary);
  const setSignOffAssignees = useAppStore((s) => s.setSignOffAssignees);
  const signSignOff = useAppStore((s) => s.signSignOff);
  const withdrawSignOff = useAppStore((s) => s.withdrawSignOff);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user: me } = useSession();
  const { isAdmin, roleKeys } = usePermissionView();
  const users = usePickerUsers();

  // Only the evidence summary is a free-text field with a draft; a decision and
  // a comment are submitted WITH the signature (one act), not saved separately.
  const committed = useMemo(
    () => ({ evidenceSummary: closure.evidenceSummary ?? '' }),
    [closure.evidenceSummary],
  );
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);

  const [rows, setRows] = useState<Record<string, RowDraft>>({});
  const [withdrawing, setWithdrawing] = useState<SignOff['role'] | null>(null);
  const [reason, setReason] = useState('');

  // Saved signature + authenticator step-up. MANDATORY as of 2026-08-22
  // (project owner): a sign-off attaches the signer's saved signature and needs
  // a fresh authenticator code every time, so the second factor now protects
  // the signing ACT rather than just the image. It was opt-in via a checkbox
  // for one day; that made a plain no-image signature possible, which is the
  // weaker of the two paths and had no reason to exist beside the other.
  // Consequence to keep in mind: a nominated signer with no saved signature or
  // no authenticator cannot sign at all — the button says which one is missing
  // and links to My Account.
  const [hasSignature, setHasSignature] = useState(false);
  const [totpEnrolled, setTotpEnrolled] = useState(false);
  useEffect(() => {
    getMySignature()
      .then((r) => setHasSignature(r.hasSignature))
      .catch(() => setHasSignature(false));
    getMyTotpStatus()
      .then((r) => setTotpEnrolled(r.enrolled))
      .catch(() => setTotpEnrolled(false));
  }, []);
  // Sign opens the preview first (everything the phase page shows, which the signature attests to), then
  // the authenticator step.
  const [reviewingRole, setReviewingRole] = useState<SignOff['role'] | null>(null);
  const [contentChanged, setContentChanged] = useState(false);
  const [stepUp, setStepUp] = useState<{ role: SignOff['role']; hash: string } | null>(null);

  const rowDraft = (role: string): RowDraft => rows[role] ?? {};
  const patchRow = (role: string, patch: RowDraft) =>
    setRows((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }));

  // B3: sign-off only becomes available once the phase's other closure
  // conditions are met. N/A items count only when justified.
  const locked = !checklist.canSignOff;
  // SW-22: a standing phase signature freezes the evidence summary along with the angles and pre-work.
  const dataLocked = closure.signOffs.some((s) => isSignedOff(s));
  const missing = [
    !checklist.gatesPassed && 'all gates passed',
    !checklist.keyChecksDone && 'key gate checks done (or justified N/A)',
    !checklist.anglesCovered && 'all 8 angles covered (or justified N/A)',
    !checklist.actionsClosed && 'next actions closed (unless Proceed with Conditions)',
    !checklist.preWorkAccepted && 'pre-work reviewed and accepted',
  ].filter(Boolean) as string[];

  // The Lead nominates the signers. Matched by displayName because that is what
  // ProjectIdentity.projectLead stores (the Create form's user picker writes the
  // picked user's displayName) — the server checks the same thing.
  const isLead = !!me && (isAdmin || me.displayName.trim() === projectLead.trim());
  const canApprove = roleKeys.some((k) => canApprovePhase(grants, k, phase));
  const phaseDept = PHASES.find((p) => p.phase === phase)?.department;

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName,
    roleName: u.roleName ?? '—',
  }));

  // D1 requires an independent reviewer/approver for safety-, regulatory-,
  // claims- or release-critical decisions — written for GATE sign-off, so this
  // is a visible warning rather than a block at phase level. Silence would be
  // worse: three signatures from one person read as three people.
  const signedByCounts = new Map<string, number>();
  for (const row of closure.signOffs) {
    if (isSignedOff(row) && row.signedByUserId) {
      signedByCounts.set(row.signedByUserId, (signedByCounts.get(row.signedByUserId) ?? 0) + 1);
    }
  }
  const sharedSigner = closure.signOffs.find(
    (r) => r.signedByUserId && (signedByCounts.get(r.signedByUserId) ?? 0) > 1,
  );

  const unassigned = closure.signOffs.filter((r) => !r.assignedToUserId).map((r) => r.role);

  const assign = (role: SignOff['role'], userId?: string) =>
    setSignOffAssignees(projectId, phase, [{ role, userId: userId ?? null }]);

  // Why the Sign button is unavailable — shown as a tooltip instead of an
  // unexplained disabled button.
  const blockedReason = (row: SignOff): string | null => {
    if (locked) return `Phase ${phase} closure conditions are not met yet`;
    if (row.role === 'Approved by' && !canApprove) {
      return `Approving Phase ${phase} needs the phase:${phase}|approve capability (${phaseDept})`;
    }
    if (!hasSignature) return 'Save a signature in My Account first — every sign-off attaches it';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    return null;
  };

  // What the signer has not given yet; read in the signing preview, where the decision and comment are entered.
  const decisionProblem = (role: string): string | null => {
    const d = rowDraft(role);
    if (!d.decision) return 'Choose a decision first';
    if (gateSignOffNeedsComment(d.decision) && !d.comments?.trim()) {
      return `A comment is required when the decision is "${d.decision}"`;
    }
    return null;
  };

  // Always signed WITH the signature and a verified step-up — there is no
  // second, weaker path any more.
  const sign = (row: SignOff, stepUpToken: string, expectedHash: string) => {
    const d = rowDraft(row.role);
    void signSignOff(projectId, phase, row.role, {
      decision: d.decision,
      comments: d.comments,
      stepUpToken,
      expectedHash,
    }).then((refusal) => {
      // The phase changed while the signer was reading: nothing was recorded; show the new content and let them read again.
      if (refusal) {
        setContentChanged(true);
        setReviewingRole(row.role);
      }
    });
  };

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    withdrawSignOff(projectId, phase, withdrawing, reason);
    setWithdrawing(null);
    setReason('');
  };

  const signedCount = closure.signOffs.filter((x) => isSignedOff(x)).length;
  const hold = (icon: React.ReactNode, body: React.ReactNode) => (
    <div className="concept-tokens gso-gate-hold gso-notice">
      {icon}
      <span>{body}</span>
    </div>
  );

  return (
    <>
      {/* The same shape as the gate sign-off card (GateSignOffPanel): a titled card, one numbered step per role, and
          the person, the action and the record of each step on its own line. */}
      <div className="concept-tokens c-card gso">
        <div className="gso-head">
          <span className="gso-title">Phase {phase} sign-off</span>
          <span className="gso-progress">
            {signedCount} of {closure.signOffs.length} signed
          </span>
          <Button size="small" type="text" disabled={false} icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
            History ({historyEvents.length})
          </Button>
        </div>
        {locked &&
          hold(
            <LockOutlined />,
            <>
              <strong>Sign-off locked</strong> — closure conditions not yet met. Still required: {missing.join('; ')}.
            </>,
          )}
        {isLead &&
          unassigned.length > 0 &&
          hold(
            <ClockCircleOutlined />,
            <>
              You are this project's Lead — nominate a signer for: <strong>{unassigned.join(', ')}</strong>. Only the nominated person
              can sign, as themselves.
            </>,
          )}
        {!isLead &&
          hold(
            <ClockCircleOutlined />,
            <>
              Signers are nominated by this project's Lead ({projectLead}). You can sign a row nominated to you, never for anyone else.
            </>,
          )}
        {sharedSigner && (
          <div className="gso-gate-warn gso-notice">
            <ExclamationCircleOutlined />
            <span>
              <strong>{sharedSigner.name}</strong> has signed more than one role on this phase. Rule D1 requires an independent
              reviewer or approver for safety-, regulatory-, claims- or release-critical decisions. This is not blocked here — it is
              recorded so it is visible.
            </span>
          </div>
        )}

        <div className="pso-summary">
          <div className="pso-label">Evidence summary / decision rationale</div>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 10 }}
            disabled={dataLocked}
            value={draft.evidenceSummary}
            onChange={(e) => update({ evidenceSummary: e.target.value })}
          />
          <SaveBar
            dirty={dirty}
            onSave={() => {
              setEvidenceSummary(projectId, phase, draft.evidenceSummary);
              markSaved();
            }}
            onDiscard={discard}
          />
        </div>

        {closure.signOffs.map((r, i) => {
          const signed = isSignedOff(r);
          const mine = !!me && r.assignedToUserId === me.id;
          const why = signed ? null : blockedReason(r);
          // A fixed order, as on a gate: only the step whose turn it is can be signed.
          const isTurn = !signed && closure.signOffs.slice(0, i).every((p) => isSignedOff(p));
          const laterStanding = closure.signOffs.slice(i + 1).some((p) => isSignedOff(p));
          const previous = closure.signOffs[i - 1];
          return (
            <div key={r.role} className={`gso-row${signed ? ' gso-row-done' : ''}`}>
              <div className="gso-line">
                <span className={`gso-step${signed ? ' gso-step-done' : isTurn && !locked ? ' gso-step-now' : ''}`} aria-hidden>
                  {signed ? <CheckOutlined /> : i + 1}
                </span>
                <span className="gso-role">{r.role}</span>
                <div className="gso-signer">
                  {signed ? (
                    <>
                      <strong>{r.name}</strong>
                      {r.roleAtSigning && <span className="gso-muted"> · {r.roleAtSigning}</span>}
                    </>
                  ) : isLead ? (
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Nominate a signer"
                      value={r.assignedToUserId}
                      options={userOptions.map((o) => ({
                        value: o.value,
                        label: o.roleName && o.roleName !== '—' ? `${o.label} — ${o.roleName}` : o.label,
                      }))}
                      onChange={(v?: string) => assign(r.role, v)}
                    />
                  ) : (
                    <span className="gso-muted">{r.assignedToName ?? 'Not nominated yet'}</span>
                  )}
                </div>
                <div className="gso-action">
                  {signed ? (
                    <>
                      <span className="gso-muted">
                        Signed {r.signedAt ? dayjs(r.signedAt).format('YYYY-MM-DD HH:mm') : '—'} · record v{r.recordVersion ?? '—'}
                      </span>
                      {(r.signedByUserId === me?.id || isAdmin) &&
                        (laterStanding ? (
                          <span className="gso-muted">Withdraw the later signature first</span>
                        ) : (
                          <Button size="small" danger onClick={() => setWithdrawing(r.role)}>
                            Withdraw
                          </Button>
                        ))}
                    </>
                  ) : mine && isTurn ? (
                    <Tooltip title={why ?? ''}>
                      <span>
                        <Button type="primary" disabled={!!why} onClick={() => setReviewingRole(r.role)}>
                          Review & sign
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="c-tag">{!r.assignedToUserId ? 'Not nominated' : isTurn ? 'Waiting to be signed' : 'Not yet'}</span>
                  )}
                </div>
              </div>

              {signed ? (
                <div className="gso-record">
                  <span className={`c-tag c-tag-dot ${r.decision === 'Proceed' ? 'c-tag-ok' : 'c-tag-warn'}`}>{r.decision ?? '—'}</span>
                  {r.comments ? <p className="gso-comment">{r.comments}</p> : <span className="gso-muted">No comment</span>}
                  {r.signatureImage && <img className="pso-signature" src={r.signatureImage} alt={`${r.name}'s signature`} />}
                </div>
              ) : (
                // One short line, only when there is something to do or wait for.
                <div className="gso-wait">
                  <ClockCircleOutlined />
                  <span>
                    {!r.assignedToUserId
                      ? isLead
                        ? 'Nominate a signer above'
                        : `Waiting for the project Lead (${projectLead}) to nominate a signer`
                      : !isTurn
                        ? `Waiting for "${previous?.role}" to be signed first — the order is fixed`
                        : mine
                          ? (why ?? 'Review the phase, record your decision and sign with your saved signature and a fresh authenticator code.')
                          : `Nominated to ${r.assignedToName ?? 'somebody else'} — waiting for them to sign`}
                    {mine && isTurn && (!hasSignature || !totpEnrolled) && (
                      <>
                        {' '}
                        <Link to="/account">{!hasSignature ? 'Add a signature' : 'Set up an authenticator'} in My Account</Link>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Modal
        open={withdrawing !== null}
        title={`Withdraw the "${withdrawing}" signature`}
        okText="Withdraw signature"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={confirmWithdraw}
        onCancel={() => {
          setWithdrawing(null);
          setReason('');
        }}
      >
        <p>
          The signature is cleared and this phase stops counting as approved. The nomination stays,
          so the same person can sign again. B4: the reason is recorded on the audit trail.
        </p>
        <Input.TextArea
          rows={3}
          value={reason}
          placeholder="Why is this signature being withdrawn?"
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
      <PhaseSignPreviewModal
        open={reviewingRole !== null}
        projectId={projectId}
        phase={phase}
        roleLabel={reviewingRole ?? ''}
        decision={reviewingRole ? rowDraft(reviewingRole).decision : undefined}
        comment={reviewingRole ? rowDraft(reviewingRole).comments : undefined}
        onChange={(patch) => reviewingRole && patchRow(reviewingRole, patch)}
        problem={reviewingRole ? decisionProblem(reviewingRole) : null}
        earlier={closure.signOffs
          .filter((x) => isSignedOff(x) && x.role !== reviewingRole)
          .map((x) => ({ role: x.role, name: x.name ?? '', decision: x.decision ?? '', comment: x.comments ?? '' }))}
        changed={contentChanged}
        onCancel={() => {
          setReviewingRole(null);
          setContentChanged(false);
        }}
        onContinue={(preview) => {
          setContentChanged(false);
          if (!reviewingRole) return;
          setStepUp({ role: reviewingRole, hash: preview.hash });
          setReviewingRole(null);
        }}
      />
      <SignatureStepUpModal
        open={stepUp !== null}
        projectId={projectId}
        phase={phase}
        role={stepUp?.role ?? 'Prepared by'}
        expectedHash={stepUp?.hash ?? ''}
        onClose={() => setStepUp(null)}
        onVerified={(token) => {
          if (!stepUp) return;
          const row = closure.signOffs.find((s) => s.role === stepUp.role);
          const hash = stepUp.hash;
          setStepUp(null);
          if (row) sign(row, token, hash);
        }}
      />
      <FormDrawer
        title={`Sign-off history — Phase ${phase}`}
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false);
          setViewing(null);
        }}
        footer={null}
        width={980}
      >
        {viewing ? (
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={() => setViewing(null)}>
              Back to history
            </Button>
            <h3 style={{ margin: '4px 0 8px', fontSize: 16 }}>
              Signed content — {viewing.role}, Phase {phase}
            </h3>
            <p className="gso-muted" style={{ marginTop: 0 }}>
              Exactly what this signature attested to, as it stood when it was given
              {viewing.signedAt ? ` (${viewing.signedAt.slice(0, 16).replace('T', ' ')})` : ''}
              {viewed ? ` · fingerprint ${viewed.hash.slice(0, 12)}` : ''}.
              {viewing.kind === 'withdrawn' ? ' The signature has since been withdrawn.' : ''}
            </p>
            {viewLoading && <Spin />}
            {viewError && <Alert type="info" showIcon title={viewError} />}
            {viewed && <PhaseContentSections sections={viewed.sections} />}
          </div>
        ) : historyEvents.length === 0 ? (
          <p className="gso-muted">Nothing has been signed or withdrawn on this phase yet.</p>
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey={(e) => e.id}
            dataSource={historyEvents}
            columns={[
              { title: 'Date', width: 140, dataIndex: 'date' },
              {
                title: 'Act',
                width: 170,
                render: (_, e) => (
                  <span className={`c-tag ${e.kind === 'signed' ? 'c-tag-ok' : 'c-tag-warn'}`}>
                    {e.kind === 'signed' ? 'Signed' : 'Withdrawn'} · {e.role}
                  </span>
                ),
              },
              { title: 'By', width: 140, render: (_, e) => e.by ?? '—' },
              {
                title: 'Detail',
                render: (_, e) => (
                  <>
                  <span className="gso-muted">
                    {[
                      e.decision ? `Decision: ${e.decision}` : e.kind === 'signed' ? 'Decision not recorded' : undefined,
                      e.comment ? `Comment: “${e.comment}”` : undefined,
                      e.kind === 'withdrawn' && e.signedAt ? `Had signed: ${e.signedAt.slice(0, 16).replace('T', ' ')}` : undefined,
                      e.reason ? `Reason: ${e.reason}` : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {e.signedAt && (
                    <div>
                      <Button type="link" size="small" disabled={false} style={{ paddingInline: 0 }} onClick={() => setViewing(e)}>
                        View what was {e.kind === 'signed' ? 'signed' : 'signed and withdrawn'}
                      </Button>
                    </div>
                  )}
                  </>
                ),
              },
            ]}
          />
        )}
      </FormDrawer>
    </>
  );
}
