import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { GateSignOff, GateSignOffRole, ProjectData } from '@mbc360/shared/types';
import { GATE_SIGNOFF_ROLES } from '@mbc360/shared/types';
import { GATE_DECISIONS } from '@mbc360/shared/config/gates';
import {
  CRITICAL_GATES,
  INDEPENDENT_FUNCTION_BY_GATE,
  findGateSignOff,
  gateSignOffMarkets,
  gateSignOffNeedsComment,
  previousGateSignOffRole,
} from '@mbc360/shared/config/gateSignOff';
import { gateSignOffStaleChanges } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePickerUsers } from '../hooks/useUserOptions';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import GateSignOffStepUpModal from './GateSignOffStepUpModal';
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

  const [drafts, setDrafts] = useState<Record<string, { decision?: string; comment?: string }>>({});
  const [stepUp, setStepUp] = useState<{ market?: string; role: GateSignOffRole } | null>(null);
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
            {rows.map((r) => {
              const stale = r.signedAt ? gateSignOffStaleChanges(project, gateId, market, r.role) : [];
              const why = r.signedAt ? null : blockedReason(market, r.role);
              const draft = draftOf(market, r.role);
              const needsComment = !!draft.decision && gateSignOffNeedsComment(draft.decision);
              return (
                <div key={r.role} className={`gso-row${r.signedAt ? ' gso-signed' : ''}`}>
                  <div className="gso-line">
                    <span className="gso-role">{r.role}</span>
                    <div className="gso-signer">
                      {r.signedAt ? (
                        <>
                          <strong>{r.name}</strong>
                          {r.roleAtSigning && <span className="gso-muted"> · {r.roleAtSigning}</span>}
                        </>
                      ) : isLead ? (
                        <Select
                          style={{ width: '100%', maxWidth: 320 }}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="Nominate a signer"
                          value={r.assignedToUserId}
                          options={users.map((u) => ({
                            value: u.id,
                            label: u.roleName ? `${u.displayName} — ${u.roleName}` : u.displayName,
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
                          {r.signedByUserId === session.user?.id && (
                            <Button danger onClick={() => setWithdrawing({ market, role: r.role })}>
                              Withdraw
                            </Button>
                          )}
                        </>
                      ) : why ? (
                        <Tooltip title={why}>
                          <Button type="primary" disabled>
                            Sign
                          </Button>
                        </Tooltip>
                      ) : (
                        <Button type="primary" onClick={() => setStepUp({ market, role: r.role })}>
                          Sign
                        </Button>
                      )}
                    </div>
                  </div>
                  {r.signedAt ? (
                    <div className="gso-record">
                      <span className={`c-tag c-tag-dot ${r.decision === 'Proceed' ? 'c-tag-ok' : 'c-tag-warn'}`}>{r.decision}</span>
                      {r.comment ? <p className="gso-comment">{r.comment}</p> : <span className="gso-muted">No comment</span>}
                    </div>
                  ) : (
                    <div className="gso-form">
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
                    </div>
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

      <GateSignOffStepUpModal
        open={stepUp !== null}
        projectId={projectId}
        gateId={gateId}
        market={stepUp?.market}
        role={stepUp?.role ?? 'Prepared by'}
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
          });
        }}
      />
    </>
  );
}
