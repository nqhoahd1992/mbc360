import { Alert, Input, Space } from 'antd';
import type { ChangeRecord } from '@mbc360/shared/types';
import { isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import UserSelect from './UserSelect';
import { TEXT } from '../theme/tokens';

// Round 4 question 34(c) (2026-08-24): "A closing date or short note alone is
// insufficient. Final disposition includes: Final status · Outcome · What was
// implemented or why no implementation was required · Verification evidence ·
// Impacted formula/artwork/claim/market versions · Responsible verifier · Closure
// date · Remaining action or transition requirement, if any."
//
// This block exists because the fields had nowhere to be entered. `closureEvidence`
// was displayed read-only in the table and set by nothing at all, so before this
// the disposition test was satisfied purely by the closing date the Status dropdown
// fills in automatically — which is exactly the "closing date alone" the answer
// rejects, and it means requiring seven fields without adding these inputs would
// have made Gate 11 permanently unpassable.
//
// Only shown once a change reaches a terminal status: a disposition describes how a
// change CLOSED, so asking for it while the change is still being worked would be
// asking for a conclusion nobody has yet.
const LABELS: Record<string, string> = {
  status: 'Final status',
  closureOutcome: 'Outcome',
  closureImplementation: 'What was implemented (or why none was required)',
  closureEvidence: 'Verification evidence',
  closureImpactedVersions: 'Impacted formula / artwork / claim / market versions',
  closureVerifier: 'Responsible verifier',
  closedDate: 'Closure date',
};

export default function ChangeDispositionBlock({
  change,
  onChange,
}: {
  change: ChangeRecord;
  onChange: (patch: Partial<ChangeRecord>) => void;
}) {
  if (isChangeOpen(change.status)) {
    return (
      <div style={{ fontSize: 12, color: TEXT.secondary }}>
        Still open — the final disposition is recorded once this change reaches Completed, Rejected, Cancelled or
        Superseded.
      </div>
    );
  }

  const missing = missingDispositionFields(change);
  const done = isChangeDispositionRecorded(change);

  return (
    <div style={{ display: 'grid', gap: 6, padding: '6px 0' }}>
      {done ? (
        <div style={{ fontSize: 12, color: '#389e0d' }}>
          Final disposition recorded — this change no longer blocks Gate 11.
        </div>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="Final disposition incomplete — this change still blocks Gate 11"
          description={`Missing: ${missing.map((f) => LABELS[f] ?? f).join(' · ')}`}
        />
      )}

      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Input
          size="small"
          placeholder={LABELS.closureOutcome}
          value={change.closureOutcome}
          onChange={(e) => onChange({ closureOutcome: e.target.value })}
        />
        <Input.TextArea
          size="small"
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder={LABELS.closureImplementation}
          value={change.closureImplementation}
          onChange={(e) => onChange({ closureImplementation: e.target.value })}
        />
        <Input
          size="small"
          placeholder={LABELS.closureEvidence}
          value={change.closureEvidence}
          onChange={(e) => onChange({ closureEvidence: e.target.value })}
        />
        <Input
          size="small"
          placeholder={LABELS.closureImpactedVersions}
          value={change.closureImpactedVersions}
          onChange={(e) => onChange({ closureImpactedVersions: e.target.value })}
        />
        <Space wrap style={{ width: '100%' }}>
          <UserSelect
            style={{ width: 200 }}
            placeholder={LABELS.closureVerifier}
            value={change.closureVerifier}
            onChange={(v?: string) => onChange({ closureVerifier: v ?? '' })}
          />
          <Input
            size="small"
            type="date"
            style={{ width: 150 }}
            value={change.closedDate}
            onChange={(e) => onChange({ closedDate: e.target.value })}
          />
        </Space>
        {/* The one part the answer marks "if any", so it is never in the missing
            list — a change that leaves nothing behind should not be blocked into
            inventing a transition requirement. */}
        <Input
          size="small"
          placeholder="Remaining action or transition requirement (if any)"
          value={change.closureRemainingAction}
          onChange={(e) => onChange({ closureRemainingAction: e.target.value })}
        />
      </Space>
    </div>
  );
}
