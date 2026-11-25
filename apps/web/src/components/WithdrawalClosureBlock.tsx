import { useState } from 'react';
import { Button, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import type { MarketTrack, ProjectData } from '@mbc360/shared/types';
import { isMarketLaunched, withdrawalClosureGaps } from '@mbc360/shared/utils/postLaunch';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import './MarketTrackingCard.css';

// Round 5 question 19(a): a market the product was SOLD in keeps its Gate 12 obligations after withdrawal until a closure — a period and
// criteria set by Regulatory / Quality from the remaining stock, the last supply and expiry and the applicable obligations — is confirmed.
// A market it never launched in has nothing to follow up: the reason recorded with its withdrawal is the closing reason.
// Shown on the market's tracking card once the withdrawal is SAVED; the closure itself is saved here, apart from the track form,
// because the server writes it (only the project's Regulatory or Quality person, as themselves).
export default function WithdrawalClosureBlock({ project, track }: { project: ProjectData; track: MarketTrack }) {
  const { user } = useSession();
  const setClosure = useAppStore((s) => s.setWithdrawalClosure);
  const confirmClosure = useAppStore((s) => s.confirmWithdrawalClosure);
  const [criteria, setCriteria] = useState(track.withdrawalClosureCriteria ?? '');
  const [until, setUntil] = useState(track.withdrawalClosureUntil ?? '');
  const [busy, setBusy] = useState(false);

  const me = (user?.displayName ?? '').trim().toLowerCase();
  const holders = ['regulatory', 'quality'].map((k) => (project.identity.reviewers?.[k] ?? '').trim()).filter(Boolean);
  const mayAct = holders.some((n) => n.toLowerCase() === me);
  const today = dayjs().format('YYYY-MM-DD');

  if (!isMarketLaunched(track)) {
    // A neutral note, not an alert: nothing is wrong and nothing is asked of anyone.
    return (
      <p className="rt-note" style={{ marginTop: 10 }}>
        <b>{track.market}</b> was never launched, so it has no Gate 12 sign-off to keep. The reason recorded with the withdrawal closes it:{' '}
        {track.withdrawnReason || '(no reason recorded yet)'}.
      </p>
    );
  }

  if (track.withdrawalClosedAt) {
    return (
      <p className="rt-note" style={{ marginTop: 10 }}>
        Gate 12 obligations closed on {track.withdrawalClosedAt}, confirmed by {track.withdrawalClosedBy ?? '—'}. Criteria: {track.withdrawalClosureCriteria ?? '—'}. Period ended{' '}
        {track.withdrawalClosureUntil ?? '—'}.
      </p>
    );
  }

  const gaps = withdrawalClosureGaps(project, track, today);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginTop: 14 }} aria-label="Closure after withdrawal">
      <div className="mt-track-head">
        <span className="mt-label" style={{ fontWeight: 600 }}>Closure after withdrawal</span>
        <span className="mt-track-note">
          Product already sold in {track.market} keeps its Gate 12 sign-off and surveillance until Regulatory / Quality confirm the closure
        </span>
      </div>
      <div className="mt-form">
        <label className="mt-wide">
          <span className="mt-label">
            Closure criteria<span className="as-req">&nbsp;*</span>
          </span>
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 6 }}
            disabled={!mayAct || busy}
            value={criteria}
            placeholder="Remaining stock, last supply and expiry, applicable obligations"
            onChange={(e) => setCriteria(e.target.value)}
          />
        </label>
        <label>
          <span className="mt-label">
            Closure period ends<span className="as-req">&nbsp;*</span>
          </span>
          <DatePicker
            style={{ width: '100%' }}
            disabled={!mayAct || busy}
            value={until ? dayjs(until) : null}
            onChange={(d) => setUntil(d ? d.format('YYYY-MM-DD') : '')}
          />
          {track.withdrawalClosureSetBy && <span className="mt-sub">set by {track.withdrawalClosureSetBy}</span>}
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Button
          loading={busy}
          disabled={!mayAct || criteria.trim() === '' || until === ''}
          onClick={() => void run(() => setClosure(project.identity.id, track.market, criteria, until))}
        >
          Save closure criteria
        </Button>
        <Button
          type="primary"
          loading={busy}
          disabled={!mayAct}
          onClick={() => void run(() => confirmClosure(project.identity.id, track.market))}
        >
          Confirm closure
        </Button>
      </div>
      {!mayAct && (
        <p className="mt-sub" style={{ marginTop: 8 }}>
          Only the project&apos;s Regulatory person or Quality person ({holders.join(' or ') || 'nobody is named'}) sets or confirms the closure.
        </p>
      )}
      {gaps.length > 0 && (
        <div className="rt-note" style={{ marginTop: 8 }}>
          Not ready to close yet:
          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
