import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Card, Input, Modal, Select, Tag, Typography } from 'antd';
import { DownOutlined, LockOutlined, RightOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterClosureRole, RegisterClosureSignOff, RegisterClosureState } from '@mbc360/shared/types';
import { hasStandingClosureSignature, isRegisterClosureSigned, isRegisterClosureStale, isRegisterClosed } from '@mbc360/shared/types';
import type { ReviewOwnerSpec } from '@mbc360/shared/config/reviewers';
import { registerClosureSignerRole } from '@mbc360/shared/config/reviewers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { getMySignature, getMyTotpStatus } from '../api/accountApi';
import RegisterCloseStepUpModal from './RegisterCloseStepUpModal';
import RegisterClosePreviewModal from './RegisterClosePreviewModal';
import { Link } from 'react-router-dom';
import { GATES } from '@mbc360/shared/config/gates';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import {
  closureColumns,
  closureKey,
  closureMembers,
  closureSignersAreNominated,
  registerClosureGateIds,
  registerClosureRoles,
} from '@mbc360/shared/utils/registerClosures';
import { usePickerUsers } from '../hooks/useUserOptions';
import { scrollToRegister, useClosingAside } from './closingAside';
import './RegisterClosurePanel.css';

// A register is closed once PER GATE that needs it (SW-36): one card per gate, each attesting to — and locking — the columns
// settled at that gate. Nothing locks until somebody signs; the readiness list makes the gate wait for it.
export default function RegisterClosurePanel({
  projectId,
  registerKey,
  spec,
  reviewers,
  closures,
}: {
  projectId: string;
  registerKey: string;
  spec: ReviewOwnerSpec;
  reviewers: Record<string, string> | undefined;
  closures: Record<string, RegisterClosureState>;
}) {
  // Inside a <ClosingLayout> the blocks are drawn in its sidebar; anywhere else they stay where they are put.
  const aside = useClosingAside();
  const config = getRegisterConfig(registerKey);
  if (!config) return null;
  const gates = registerClosureGateIds(config);
  const roles = registerClosureRoles(config);
  const isClosedAt = (g: string) => isRegisterClosed(closures[closureKey(registerKey, g)], roles);
  const firstOpen = gates.findIndex((g) => !isClosedAt(g));
  const current = firstOpen === -1 ? gates.length - 1 : firstOpen;
  const blocks = (
    <>
      {gates.map((gateId, index) => {
        const members = closureMembers(config.key);
        // One signature for a whole page: it names the tables, not a column list that would only describe the first of them.
        const columns =
          members.length > 0
            ? `every table of ${config.closureTitle ?? config.title} (${[config, ...members].map((c) => c.title).join('; ')})`
            : closureColumns(config, gateId)
                .map((key) => config.columns.find((c) => c.key === key)?.label ?? key)
                .join(', ');
        return (
          <GateClosureCard
            key={gateId}
            projectId={projectId}
            registerKey={registerKey}
            gateId={gateId}
            gateLabel={GATES.find((g) => g.id === gateId)?.name ?? gateId}
            columns={columns}
            spec={spec}
            reviewers={reviewers}
            closure={closures[closureKey(registerKey, gateId)]}
            defaultOpen={index === current}
            waitingOn={firstOpen !== -1 && index > firstOpen ? `Gate ${gates[firstOpen].replace(/^SG/, '')}` : undefined}
          />
        );
      })}
    </>
  );
  return aside ? createPortal(blocks, aside) : blocks;
}

// Register closing (2026-08-27, user-requested): editing a register stays
// open to anyone (rule A4, untouched) — but a deliberate two-signature act
// (Review owner + Co-sign) makes it read-only independently of its gate.
// Modeled directly on SignOffBlock.tsx's phase sign-off, trimmed to what this
// simpler act actually needs: exactly 2 fixed roles, no Lead-nominated signer
// (the signer is derived straight from the register's own reviewOwner spec —
// see registerClosureSignerRole), and no decision/comment fields (closing IS
// the act; there is nothing else to record).
function GateClosureCard({
  projectId,
  registerKey,
  gateId,
  gateLabel,
  columns,
  spec,
  reviewers,
  closure,
  defaultOpen,
  waitingOn,
}: {
  projectId: string;
  registerKey: string;
  gateId: string;
  gateLabel: string;
  columns: string;
  spec: ReviewOwnerSpec;
  reviewers: Record<string, string> | undefined;
  closure: RegisterClosureState | undefined;
  defaultOpen: boolean;
  waitingOn?: string;
}) {
  const signRegisterClose = useAppStore((s) => s.signRegisterClose);
  const withdrawRegisterClose = useAppStore((s) => s.withdrawRegisterClose);
  const assignRegisterClosureSigner = useAppStore((s) => s.assignRegisterClosureSigner);
  const projectLead = useAppStore((st) => st.projects.find((x) => x.identity.id === projectId)?.identity.projectLead ?? '');
  const users = usePickerUsers();
  const { user: me } = useSession();
  const { isAdmin } = usePermissionView();
  const config = getRegisterConfig(registerKey);
  // A page that carries the workbook's own sign-off block names its roles, and the project's Lead nominates a person for each.
  const roles = config ? registerClosureRoles(config) : [];
  const nominated = !!config && closureSignersAreNominated(config);
  // Matched by displayName, as for the phase sign-off: that is what ProjectIdentity.projectLead stores, and the server checks the same.
  const isLead = !!me && (isAdmin || me.displayName.trim() === projectLead.trim());
  // A closure given for a gate that has passed stands until Backtrack, like the gate's own signatures (SW-36).
  const gatePassed = useAppStore((st) => {
    const project = st.projects.find((x) => x.identity.id === projectId);
    return !!project && isGatePassed(project, gateId);
  });

  const [open, setOpen] = useState(defaultOpen);
  const [withdrawing, setWithdrawing] = useState<RegisterClosureRole | null>(null);
  const [reason, setReason] = useState('');
  // Sign opens the preview first (everything the signature attests to), then the authenticator step.
  const [reviewing, setReviewing] = useState<RegisterClosureRole | null>(null);
  const [stepUp, setStepUp] = useState<{ role: RegisterClosureRole; hash: string } | null>(null);

  // Same precondition as the phase sign-off: closing always attaches the
  // signer's saved signature and always asks for a fresh authenticator code.
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

  const signOffs: RegisterClosureSignOff[] = roles.map(
    (role) => closure?.signOffs.find((s) => s.role === role) ?? { role },
  );
  const roleKeyFor = (role: RegisterClosureRole) => registerClosureSignerRole(spec, role as 'Review owner' | 'Co-sign');
  const nameFor = (role: RegisterClosureRole) =>
    nominated ? signOffs.find((r) => r.role === role)?.assignedToName : reviewers?.[roleKeyFor(role)];
  const assign = (role: string, userId?: string) =>
    assignRegisterClosureSigner(projectId, registerKey, gateId, [{ role, userId: userId ?? null }]);
  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.roleName && u.roleName !== '—' ? `${u.displayName} — ${u.roleName}` : u.displayName,
  }));
  const unassigned = nominated ? signOffs.filter((r) => !r.assignedToUserId).map((r) => r.role) : [];
  // One person nominated for several roles reads as several signatures but is one: a visible warning, not a block (the precedent the
  // phase sign-off sets).
  const nomineeCounts = new Map<string, number>();
  for (const r of signOffs) if (r.assignedToUserId) nomineeCounts.set(r.assignedToUserId, (nomineeCounts.get(r.assignedToUserId) ?? 0) + 1);
  const sharedNominee = signOffs.find((r) => r.assignedToUserId && (nomineeCounts.get(r.assignedToUserId) ?? 0) > 1);

  // A register whose spec declares no distinct Co-sign (falls back to
  // Project Manager per registerClosureSignerRole) AND whose owner already
  // IS Project Manager needs the SAME PERSON to sign both rows — not a
  // second independent signature. Not blocked (same "visible warning, not a
  // block" precedent SignOffBlock already uses for its own D1 independence
  // concern) — just flagged, since a silent 2-signature UI over 1 real
  // signer would misrepresent what actually happened.
  // [ASSUMPTION: R5-Q21](d) — whether this should instead get a distinct
  // Co-sign role assigned is an open question, see
  // docs/rules/F1_Per_Gate_Open_Questions.md.
  const sameSignerForBothRoles = !nominated && roleKeyFor('Review owner') === roleKeyFor('Co-sign');

  const closed = isRegisterClosed(closure, roles);
  const signedCount = signOffs.filter((r) => isRegisterClosureSigned(r)).length;
  const standing = hasStandingClosureSignature(closure);

  const blockedReason = (row: RegisterClosureSignOff): string | null => {
    const assignedName = nameFor(row.role);
    if (nominated) {
      if (!row.assignedToUserId) return `Not nominated yet — the project's Lead (${projectLead}) nominates who signs "${row.role}"`;
      if (!me || me.id !== row.assignedToUserId) return `Nominated to ${assignedName ?? 'somebody else'}`;
    } else {
      if (!assignedName) return `No one is assigned to "${row.role}" for this register yet`;
      if (!me || me.displayName.trim() !== assignedName.trim()) return `Assigned to ${assignedName}`;
    }
    if (!hasSignature) return 'Save a signature in My Account first — closing attaches it';
    if (!totpEnrolled) return 'Set up an authenticator app in My Account first';
    return null;
  };

  // Whether this row is the signed-in person's to sign (the same match blockedReason makes).
  const isMine = (row: RegisterClosureSignOff) =>
    !!me &&
    (nominated ? me.id === row.assignedToUserId : !!nameFor(row.role) && me.displayName.trim() === nameFor(row.role)!.trim());
  const iAmSigner = signOffs.some((r) => isMine(r));

  const sign = (row: RegisterClosureSignOff, stepUpToken: string, expectedHash: string) =>
    signRegisterClose(projectId, registerKey, gateId, row.role, stepUpToken, expectedHash);

  const confirmWithdraw = () => {
    if (!withdrawing) return;
    withdrawRegisterClose(projectId, registerKey, gateId, withdrawing, reason);
    setWithdrawing(null);
    setReason('');
  };

  return (
    <Card
      size="small"
      title={
        <div className="rcp-head">
          <button type="button" className="rcp-fold" aria-expanded={open} aria-label={open ? 'Fold' : 'Unfold'} onClick={() => setOpen(!open)}>
            {open ? <DownOutlined /> : <RightOutlined />}
          </button>
          <button type="button" className="rcp-name" title="Go to this register" onClick={() => scrollToRegister(registerKey)}>
            <span className="rcp-name-text">{config?.closureTitle ?? config?.title ?? registerKey}</span>
            <span className="rcp-name-gate">{`closing for ${gateId} ${gateLabel}`}</span>
          </button>
        </div>
      }
      extra={
        closed ? (
          <Tag color="green">Closed</Tag>
        ) : waitingOn ? (
          <Tag>{`Opens after ${waitingOn}`}</Tag>
        ) : (
          <Tag color="blue">{`${signedCount} of ${roles.length} signed`}</Tag>
        )
      }
    >
      <div hidden={!open}>
      {/* One line of status; what the signature locks is a fold-out, because the list of columns can run to fifteen names. */}
      <div className="rcp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={roles.length} aria-valuenow={signedCount}>
        <i className={closed ? 'rcp-progress-ok' : undefined} style={{ width: `${(signedCount / Math.max(roles.length, 1)) * 100}%` }} />
      </div>
      <div className={`rcp-status ${closed ? 'rcp-status-ok' : ''}`}>
        {closed ? <LockOutlined /> : <UnlockOutlined />}
        <span>
          {closed
            ? `Closed: ${roles.length === 2 ? 'both' : 'all'} ${roles.length} signatures recorded.`
            : `Open: needs ${roles.length === 2 ? 'both' : `all ${roles.length}`} signatures before ${gateId} can pass.`}
        </span>
      </div>
      {iAmSigner && !closed && (!hasSignature || !totpEnrolled) && (
        <div className="rcp-setup">
          <span>
            {!hasSignature ? 'You have no saved signature.' : 'You have no authenticator app set up.'}{' '}
            <Link to="/account">{!hasSignature ? 'Add a signature' : 'Set up an authenticator'} in My Account</Link> to sign.
          </span>
        </div>
      )}
      <details className="rcp-locks">
        <summary>What this signature locks</summary>
        <p>
          {closed
            ? `It locks the columns settled at ${gateId}: ${columns}. To correct them, withdraw a signature, or Backtrack past the gate.`
            : `It attests to, and locks, these columns: ${columns}.`}
        </p>
      </details>
      {sameSignerForBothRoles && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Both roles resolve to the same person (${nameFor('Review owner') ?? 'unassigned'})`}
          description="This register's review-owner spec declares no distinct Co-sign, so closing it needs the same person to sign twice rather than a genuinely independent second signature."
        />
      )}
      {standing && !closed && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Locked while a signature stands"
          description="A signature is in place, so these columns are read-only: every signer must attest to the same content. To change them, the signer withdraws their signature (with a reason)."
        />
      )}
      {nominated && isLead && unassigned.length > 0 && !closed && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Nominate the signers"
          description={`You are this project's Lead — nominate a person for: ${unassigned.join(', ')}. Only the nominated person can sign each role.`}
        />
      )}
      {nominated && sharedNominee && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`${sharedNominee.assignedToName} is nominated for more than one role`}
          description="Each role is its own signature; one person signing several of them is not independent review."
        />
      )}
      <div className="rcp-signers">
        {signOffs.map((r) => {
          const signed = isRegisterClosureSigned(r);
          const name = nameFor(r.role);
          const mine = isMine(r);
          const why = mine ? blockedReason(r) : null;
          return (
            <div key={r.role} className="rcp-who">
              <span className={`rcp-av ${signed ? 'rcp-av-ok' : ''}`} aria-hidden="true">
                {(signed ? r.name : name)?.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="rcp-who-main">
                {nominated && isLead && !signed ? (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Nominate a signer"
                    style={{ width: '100%' }}
                    value={r.assignedToUserId}
                    options={userOptions}
                    onChange={(v?: string) => assign(r.role, v)}
                  />
                ) : (
                  <div className="rcp-who-name">
                    {(signed ? r.name : name) ?? <Typography.Text type="secondary">{nominated ? 'Not nominated yet' : 'Unassigned'}</Typography.Text>}
                    {mine && <span className="rcp-you"> (you)</span>}
                  </div>
                )}
                <div className="rcp-who-role">
                  {r.role}
                  {signed && r.signedAt ? ` · ${dayjs(r.signedAt).format('YYYY-MM-DD HH:mm')}` : ''}
                </div>
                {signed && r.signatureImage && <img className="rcp-sig" src={r.signatureImage} alt={`${r.name}'s signature`} />}
                {signed && (
                  <div className="rcp-who-role">
                    {r.roleAtSigning ?? 'role not recorded'} · record v{r.recordVersion ?? '—'}
                  </div>
                )}
                {!signed && isRegisterClosureStale(r) && (
                  <Typography.Text type="warning" style={{ fontSize: 12 }}>
                    Signed by {r.name} on {r.signedAt ? dayjs(r.signedAt).format('YYYY-MM-DD HH:mm') : '—'}, but the register changed after that, so it no
                    longer counts. Sign again to confirm what it says now.
                  </Typography.Text>
                )}
                {signed && (r.signedByUserId === me?.id || isAdmin) && !gatePassed && (
                  <Button size="small" type="link" danger style={{ paddingLeft: 0, height: 22 }} onClick={() => setWithdrawing(r.role)}>
                    Withdraw
                  </Button>
                )}
              </div>
              <div className="rcp-who-act">
                {signed ? (
                  <Tag color="green" style={{ marginInlineEnd: 0 }}>
                    Signed
                  </Tag>
                ) : mine ? (
                  <Button size="small" type="primary" disabled={!!why} onClick={() => setReviewing(r.role)}>
                    Sign as me
                  </Button>
                ) : (
                  <Tag style={{ marginInlineEnd: 0 }}>Waiting</Tag>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
          The signature is cleared and this register stops counting as closed — it becomes editable
          again unless something else (its gate having passed) still locks it. B4: the reason is
          recorded on the audit trail.
        </p>
        <Input.TextArea
          rows={3}
          value={reason}
          placeholder="Why is this signature being withdrawn?"
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
      <RegisterClosePreviewModal
        open={reviewing !== null}
        projectId={projectId}
        registerKey={registerKey}
        gateId={gateId}
        roleLabel={reviewing ?? ''}
        onCancel={() => setReviewing(null)}
        onContinue={(preview) => {
          if (!reviewing) return;
          setStepUp({ role: reviewing, hash: preview.hash });
          setReviewing(null);
        }}
      />
      <RegisterCloseStepUpModal
        open={stepUp !== null}
        projectId={projectId}
        registerKey={registerKey}
        gateId={gateId}
        role={stepUp?.role ?? 'Review owner'}
        expectedHash={stepUp?.hash ?? ''}
        onClose={() => setStepUp(null)}
        onVerified={(token) => {
          if (!stepUp) return;
          const row = signOffs.find((s) => s.role === stepUp.role);
          const hash = stepUp.hash;
          setStepUp(null);
          if (row) sign(row, token, hash);
        }}
      />
    </Card>
  );
}
