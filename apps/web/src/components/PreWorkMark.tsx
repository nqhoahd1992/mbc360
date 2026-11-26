import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import type { PreWorkEntry } from '@mbc360/shared/types';
import { preWorkStatusTone } from '@mbc360/shared/utils/preWork';
import { useAppStore } from '../store/useAppStore';

// Round 5 question 27: a table saved before its phase opened is visibly marked — who entered it, when, and what its owner decided. Shows nothing for a
// table that was not pre-work. [ASSUMPTION: R6-Q35]
export default function PreWorkMark({ kind, entryKey }: { kind: PreWorkEntry['kind']; entryKey: string }) {
  const { projectId } = useParams();
  const entry = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.preWorkEntries?.find((e) => e.kind === kind && e.key === entryKey));
  if (!entry) return null;
  return (
    <p className="rt-note" style={{ margin: '0 0 8px', padding: '10px 14px 0' }}>
      <span className={`c-tag c-tag-dot ${preWorkStatusTone(entry.status)}`}>{entry.status === 'Pre-work' ? 'Pre-work · waiting for its owner' : `Pre-work · ${entry.status}`}</span> Entered before phase {entry.phase} opened by {entry.enteredBy ?? '—'}
      {entry.enteredAt ? ` on ${dayjs(entry.enteredAt).format('YYYY-MM-DD')}` : ''}
      {entry.reviewedBy ? ` · ${entry.status.toLowerCase()} by ${entry.reviewedBy}${entry.reviewedAt ? ` on ${dayjs(entry.reviewedAt).format('YYYY-MM-DD')}` : ''}` : ''}
      {entry.note ? ` — ${entry.note}` : ''}
    </p>
  );
}
