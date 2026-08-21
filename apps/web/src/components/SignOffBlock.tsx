import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SignOff } from '@mbc360/shared/types';
import { isSignedOff } from '@mbc360/shared/types';
import type { PhaseClosure } from '@mbc360/shared/types';
import type { PhaseCompletionChecklist } from '@mbc360/shared/utils/gateProgress';
import { GATE_DECISIONS, PHASES } from '@mbc360/shared/config/gates';
import { useAppStore } from '../store/useAppStore';
import { canApprovePhase, EMPTY_GRANTS } from '../utils/permissions';
import { useSession } from '../auth/useSession';
import { usePickerUsers } from '../hooks/useUserOptions';
import { useDraft } from '../hooks/useDraft';
import { getMySignature } from '../api/accountApi';
import SaveBar from './SaveBar';
import SignatureStepUpModal from './SignatureStepUpModal';

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
  const setEvidenceSummary = useAppStore((s) => s.setEvidenceSummary);
  const setSignOffAssignees = useAppStore((s) => s.setSignOffAssignees);
  const signSignOff = useAppStore((s) => s.signSignOff);
  const withdrawSignOff = useAppStore((s) => s.withdrawSignOff);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user: me, isAdmin } = useSession();
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

  // Saved-signature + email step-up (2026-08-21). "Attach my saved
  // signature" is opt-in per row and, when checked, replaces the plain
  // Popconfirm-sign with a step-up modal — unchecked, signing behaves
  // exactly as before this feature existed.
  const [hasSignature, setHasSignature] = useState(false);
  useEffect(() => {
    getMySignature()
      .then((r) => setHasSignature(r.hasSignature))
      .catch(() => setHasSignature(false));
  }, []);
  const [attachSignature, setAttachSignature] = useState<Record<string, boolean>>({});
  const [stepUpRole, setStepUpRole] = useState<SignOff['role'] | null>(null);

  const rowDraft = (role: string): RowDraft => rows[role] ?? {};
  const patchRow = (role: string, patch: RowDraft) =>
    setRows((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }));

  // B3: sign-off only becomes available once the phase's other closure
  // conditions are met. N/A items count only when justified.
  const locked = !checklist.canSignOff;
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
  const canApprove = (me?.roles ?? []).some((r) => canApprovePhase(grants, r.key, phase));
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
    const d = rowDraft(row.role);
    if (!d.decision) return 'Choose a decision first';
    if (d.decision !== 'Proceed' && !d.comments?.trim()) {
      return `A comment is required when the decision is "${d.decision}"`;
    }
    return null;
  };

  const sign = (row: SignOff, stepUpToken?: string) => {
    const d = rowDraft(row.role);
    signSignOff(projectId, phase, row.role, {
      decision: d.decision,
      comments: d.comments,
      ...(stepUpToken ? { attachSignature: true, stepUpToken } : {}),
    });
  };

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    withdrawSignOff(projectId, phase, withdrawing, reason);
    setWithdrawing(null);
    setReason('');
  };

  return (
    <Card size="small" title="Evidence Summary, Decision and Sign-Off">
      {locked && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          message="Sign-off locked — closure conditions not yet met"
          description={`Still required before sign-off: ${missing.join('; ')}.`}
        />
      )}
      {isLead && unassigned.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`You are this project's Lead — nominate a signer for: ${unassigned.join(', ')}`}
          description="Only the person nominated for a row can sign it, and they sign as themselves."
        />
      )}
      {!isLead && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Signers are nominated by this project's Lead (${projectLead})`}
          description="You can sign a row nominated to you; you cannot sign for anyone else, and no field here records a signature on somebody's behalf."
        />
      )}
      {sharedSigner && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${sharedSigner.name} has signed more than one role on this phase`}
          description="Rule D1 requires an independent reviewer or approver for safety-, regulatory-, claims- or release-critical decisions. This is not blocked here — it is recorded so it is visible."
        />
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>
          Evidence summary / decision rationale
        </div>
        <Input.TextArea
          rows={3}
          value={draft.evidenceSummary}
          onChange={(e) => update({ evidenceSummary: e.target.value })}
        />
      </div>
      <Table
        size="small"
        rowKey={(r) => r.role}
        dataSource={closure.signOffs}
        pagination={false}
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Role', width: 110, dataIndex: 'role', render: (v) => <b>{v}</b> },
          {
            title: 'Nominated signer',
            width: 200,
            render: (_, r: SignOff) =>
              isSignedOff(r) || !isLead ? (
                <span>{r.assignedToName ?? <Typography.Text type="secondary">Not nominated</Typography.Text>}</span>
              ) : (
                <Select
                  size="small"
                  allowClear
                  showSearch
                  style={{ width: '100%', minWidth: 140 }}
                  placeholder="Select a person"
                  optionFilterProp="label"
                  value={r.assignedToUserId}
                  options={userOptions}
                  optionRender={(opt) => (
                    <span>
                      {opt.data.label}
                      <Tag style={{ marginLeft: 6 }}>{opt.data.roleName}</Tag>
                    </span>
                  )}
                  onChange={(v?: string) => assign(r.role, v)}
                />
              ),
          },
          {
            title: 'Signature',
            width: 260,
            render: (_, r: SignOff) => {
              if (isSignedOff(r)) {
                const mine = r.signedByUserId === me?.id;
                return (
                  <Space direction="vertical" size={0}>
                    <span>
                      <Tag color="green">Signed</Tag>
                      <b>{r.name}</b>
                    </span>
                    {r.signatureImage && (
                      <img
                        src={r.signatureImage}
                        alt={`${r.name}'s signature`}
                        style={{ maxWidth: 160, maxHeight: 50, display: 'block', margin: '2px 0' }}
                      />
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {r.roleAtSigning ?? 'role not recorded'} ·{' '}
                      {r.signedAt ? dayjs(r.signedAt).format('YYYY-MM-DD HH:mm') : '—'} · record v
                      {r.recordVersion ?? '—'}
                    </Typography.Text>
                    {(mine || isAdmin) && (
                      <Button
                        size="small"
                        type="link"
                        danger
                        style={{ paddingLeft: 0 }}
                        onClick={() => setWithdrawing(r.role)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </Space>
                );
              }
              if (!r.assignedToUserId) {
                return <Typography.Text type="secondary">Awaiting nomination</Typography.Text>;
              }
              if (r.assignedToUserId !== me?.id) {
                return (
                  <Typography.Text type="secondary">Awaiting {r.assignedToName}</Typography.Text>
                );
              }
              const why = blockedReason(r);
              const wantsSignature = hasSignature && !!attachSignature[r.role];
              return (
                <Space direction="vertical" size={4}>
                  {hasSignature && (
                    <Checkbox
                      checked={!!attachSignature[r.role]}
                      onChange={(e) =>
                        setAttachSignature((prev) => ({ ...prev, [r.role]: e.target.checked }))
                      }
                    >
                      <Typography.Text style={{ fontSize: 12 }}>
                        Attach my saved signature
                      </Typography.Text>
                    </Checkbox>
                  )}
                  {wantsSignature ? (
                    // Attaching a drawn signature needs a one-time email code
                    // first — the step-up modal takes the place of the plain
                    // Popconfirm below, and calls sign() itself once verified.
                    <Tooltip title={why ?? ''}>
                      <span>
                        <Button
                          size="small"
                          type="primary"
                          disabled={!!why}
                          onClick={() => setStepUpRole(r.role)}
                        >
                          Verify &amp; sign
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={`Sign "${r.role}" as ${me?.displayName}`}
                      description={
                        <div style={{ maxWidth: 320 }}>
                          This records your account, the role you hold now, the server timestamp
                          and the version of this project record. It is not editable afterwards —
                          releasing it requires a withdrawal with a reason.
                        </div>
                      }
                      okText="Sign"
                      disabled={!!why}
                      onConfirm={() => sign(r)}
                    >
                      {/* The tooltip wraps a span: a disabled antd Button emits no
                          mouse events, so a tooltip attached straight to it never
                          shows — and the reason is the whole point here. */}
                      <Tooltip title={why ?? ''}>
                        <span>
                          <Button size="small" type="primary" disabled={!!why}>
                            Sign as me
                          </Button>
                        </span>
                      </Tooltip>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
          {
            title: 'Decision',
            width: 160,
            render: (_, r: SignOff) =>
              isSignedOff(r) ? (
                <span>{r.decision ?? '—'}</span>
              ) : r.assignedToUserId === me?.id ? (
                <Select
                  size="small"
                  allowClear
                  style={{ width: 150 }}
                  value={rowDraft(r.role).decision}
                  disabled={locked}
                  options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
                  onChange={(v?: string) => patchRow(r.role, { decision: v })}
                />
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
          {
            title: 'Comments / conditions',
            width: 260,
            render: (_, r: SignOff) =>
              isSignedOff(r) ? (
                <span>{r.comments ?? '—'}</span>
              ) : r.assignedToUserId === me?.id ? (
                <Input
                  size="small"
                  value={rowDraft(r.role).comments}
                  disabled={locked}
                  placeholder="Required unless the decision is Proceed"
                  onChange={(e) => patchRow(r.role, { comments: e.target.value })}
                />
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
        ]}
      />
      <SaveBar
        dirty={dirty}
        onSave={() => {
          setEvidenceSummary(projectId, phase, draft.evidenceSummary);
          markSaved();
        }}
        onDiscard={discard}
      />
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
      <SignatureStepUpModal
        open={stepUpRole !== null}
        projectId={projectId}
        phase={phase}
        role={stepUpRole ?? 'Prepared by'}
        onClose={() => setStepUpRole(null)}
        onVerified={(token) => {
          const row = closure.signOffs.find((s) => s.role === stepUpRole);
          setStepUpRole(null);
          if (row) sign(row, token);
        }}
      />
    </Card>
  );
}
