import { useState } from 'react';
import { Button, Input } from 'antd';
import dayjs from 'dayjs';
import type { MarketTrack, PifRevision, ProjectData } from '@mbc360/shared/types';
import { isApprovalSuspended, openPifRevision, pifRevisionNextStatuses } from '@mbc360/shared/utils/pifRevisions';
import { canChangeMarketTracks } from '@mbc360/shared/utils/projectAuthority';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import ChangeRefSelect from './ChangeRefSelect';
import './MarketTrackingCard.css';

const TONE: Record<PifRevision['status'], string> = { Draft: '', 'Under Review': 'c-tag-warn', Approved: 'c-tag-ok', Withdrawn: '' };
const ACTION_LABEL: Record<string, string> = { 'Under Review': 'Submit for review', Approved: 'Approve revision', Draft: 'Back to draft', Withdrawn: 'Withdraw' };

// Round 5 question 25: updating the PIF of a market already on sale does not withdraw what is approved. The approved PIF and the launch decision stay
// in force while a separate DRAFT revision, raised under a Change Control record, is prepared; it matters only once it is approved. And if new information
// undermines the version on sale, Regulatory or Quality SUSPEND its approval and record why. [ASSUMPTION: R6-Q33]
export default function PifRevisionBlock({ project, track }: { project: ProjectData; track: MarketTrack }) {
  const { user } = useSession();
  const view = usePermissionView();
  const open = useAppStore((s) => s.openPifRevision);
  const setStatus = useAppStore((s) => s.setPifRevisionStatus);
  const suspend = useAppStore((s) => s.suspendMarketApproval);
  const [changeId, setChangeId] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [busy, setBusy] = useState(false);

  const id = project.identity.id;
  const mayEdit = canChangeMarketTracks(project, { displayName: user?.displayName ?? '', isAdmin: view.isAdmin });
  const me = (user?.displayName ?? '').trim().toLowerCase();
  const holders = ['regulatory', 'quality'].map((k) => (project.identity.reviewers?.[k] ?? '').trim()).filter(Boolean);
  const maySuspend = holders.some((n) => n.toLowerCase() === me);
  const revisions = (project.pifRevisions ?? []).filter((r) => r.market === track.market && r.formulaVersion === track.formulaVersion);
  const inProgress = openPifRevision(project, track.market, track.formulaVersion);
  const canOpen = track.pifStatus === 'Approved' && !inProgress;
  const suspended = isApprovalSuspended(track);
  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--c-border, #e5e7eb)' }} aria-label="PIF revisions and suspension">
      <div className="mt-track-head">
        <span className="mt-label" style={{ fontWeight: 600 }}>PIF revisions</span>
        <span className="mt-track-note">The approved PIF and the launch approval stay in force while a revision is drafted</span>
      </div>

      {suspended && (
        <p className="rt-note">
          The launch approval was <b>suspended</b> by {track.approvalSuspendedBy ?? '—'} on {track.approvalSuspendedAt ?? '—'}: {track.approvalSuspendedReason ?? '—'}. It is given
          again by setting the launch approval back to Approved.
        </p>
      )}

      {revisions.length === 0 ? (
        <p className="mt-sub">No revision of this PIF has been raised.</p>
      ) : (
        <ul className="mt-revisions" style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'grid', gap: 8 }}>
          {[...revisions].reverse().map((r) => (
            <li key={r.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span className={`c-tag c-tag-dot ${TONE[r.status]}`}>{r.status}</span>
              <span>
                {r.changeId} — {r.reason}
              </span>
              <span className="mt-sub">
                opened by {r.openedBy ?? '—'} {r.openedAt ? dayjs(r.openedAt).format('YYYY-MM-DD') : ''}
                {r.approvedBy ? ` · approved by ${r.approvedBy} ${r.approvedAt ? dayjs(r.approvedAt).format('YYYY-MM-DD') : ''}` : ''}
              </span>
              {mayEdit &&
                pifRevisionNextStatuses(r.status).map((next) => (
                  <Button key={next} size="small" disabled={busy} type={next === 'Approved' ? 'primary' : 'default'} onClick={() => void run(() => setStatus(id, r.id, { status: next }))}>
                    {ACTION_LABEL[next]}
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {canOpen && mayEdit && (
        <div className="mt-form">
          <label>
            <span className="mt-label">
              Change Control record<span className="as-req">&nbsp;*</span>
            </span>
            <ChangeRefSelect purpose="reference" value={changeId} onChange={setChangeId} />
          </label>
          <label className="mt-wide">
            <span className="mt-label">
              Reason for the revision<span className="as-req">&nbsp;*</span>
            </span>
            <Input value={reason} placeholder="What changes in the PIF, and why" onChange={(e) => setReason(e.target.value)} />
          </label>
          <div>
            <Button loading={busy} disabled={!changeId || reason.trim() === ''} onClick={() => void run(async () => (await open(id, track.market, { formulaVersion: track.formulaVersion, changeId: changeId!, reason: reason.trim() })) && (setReason(''), setChangeId(undefined), true))}>
              Open draft revision
            </Button>
          </div>
        </div>
      )}
      {track.pifStatus !== 'Approved' && <p className="mt-sub">A revision can be raised once this market's PIF is Approved.</p>}

      {track.launchApproval === 'Approved' && (
        <div style={{ marginTop: 14 }}>
          <span className="mt-label" style={{ fontWeight: 600 }}>Suspend the approval</span>
          <p className="mt-sub">
            If new information undermines the safety or compliance of the version on sale, Regulatory or Quality suspend its approval and record why. The launch approval then
            reads Blocked.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Input style={{ flex: '1 1 260px' }} disabled={!maySuspend} value={suspendReason} placeholder="Reason (required)" onChange={(e) => setSuspendReason(e.target.value)} />
            <Button danger loading={busy} disabled={!maySuspend || suspendReason.trim() === ''} onClick={() => void run(async () => (await suspend(id, track.market, { formulaVersion: track.formulaVersion, reason: suspendReason.trim() })) && (setSuspendReason(''), true))}>
              Suspend approval
            </Button>
          </div>
          {!maySuspend && (
            <p className="mt-sub" style={{ marginTop: 6 }}>
              Only the project&apos;s Regulatory person or Quality person ({holders.join(' or ') || 'nobody is named'}) suspends an approval.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
