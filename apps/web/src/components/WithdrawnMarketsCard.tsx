import { Card } from 'antd';
import type { ProjectData } from '@mbc360/shared/types';
import { currentMarketTracks, isMarketLaunched, isMarketWithdrawn, withdrawalClosureOpen } from '@mbc360/shared/utils/postLaunch';
import WithdrawalClosureBlock from './WithdrawalClosureBlock';
import '../styles/concept.css';
import './MarketTrackingCard.css';

// Round 5 question 19(a): where a market the product has been withdrawn from is closed out at Gate 12. The closure block used to live inside
// the Gate 10 / 11 market-tracking card, which no withdrawn market can reach (a withdrawn market is no lane of Gates 10-11), so the closure
// had no screen. Every withdrawn market of the current formula version is listed here with its state: the closure still open (the product was
// sold there), already confirmed, or "never launched" (nothing to close). Nothing shows when no market has been withdrawn.
export default function WithdrawnMarketsCard({ project }: { project: ProjectData }) {
  const withdrawn = currentMarketTracks(project).filter(isMarketWithdrawn);
  if (withdrawn.length === 0) return null;
  return (
    <Card size="small" className="ph-card" title="Withdrawn markets" extra={<span className="mt-track-note">What is still owed after a withdrawal</span>}>
      {withdrawn.map((t) => (
        <section key={t.market} className="mt-track">
          <div className="mt-track-head">
            <b>{t.market}</b>
            <span className="c-tag">withdrawn {t.withdrawnDate}</span>
            {withdrawalClosureOpen(t) && <span className="c-tag c-tag-dot c-tag-warn">Gate 12 closure open</span>}
            {isMarketLaunched(t) && t.withdrawalClosedAt && <span className="c-tag c-tag-ok">closed {t.withdrawalClosedAt}</span>}
          </div>
          <WithdrawalClosureBlock project={project} track={t} />
        </section>
      ))}
    </Card>
  );
}
