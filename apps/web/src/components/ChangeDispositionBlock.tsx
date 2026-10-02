import { DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import type { ChangeRecord } from '@mbc360/shared/types';
import { isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import UserSelect from './UserSelect';
import Notice from './Notice';
import { RecordField } from './RecordList';
import './DynamicTable.css';

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
      <p className="rt-muted" style={{ margin: 0, fontSize: 13 }}>
        Still open — the final disposition is recorded once this change reaches Completed, Rejected, Cancelled or
        Superseded.
      </p>
    );
  }

  const missing = missingDispositionFields(change);
  const done = isChangeDispositionRecorded(change);

  return (
    <div className="cc-disp">
      {done ? (
        <div className="cc-disp-ok">Final disposition recorded — this change no longer blocks Gate 11.</div>
      ) : (
        <Notice tone="warn" title="Final disposition incomplete — this change still blocks Gate 11">
          Missing: {missing.map((f) => LABELS[f] ?? f).join(' · ')}
        </Notice>
      )}

      <div className="rt-grid">
        <RecordField label={LABELS.closureOutcome} wide>
          <Input value={change.closureOutcome} onChange={(e) => onChange({ closureOutcome: e.target.value })} />
        </RecordField>
        <RecordField label={LABELS.closureImplementation} wide>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={change.closureImplementation}
            onChange={(e) => onChange({ closureImplementation: e.target.value })}
          />
        </RecordField>
        <RecordField label={LABELS.closureEvidence} wide>
          <Input value={change.closureEvidence} onChange={(e) => onChange({ closureEvidence: e.target.value })} />
        </RecordField>
        <RecordField label={LABELS.closureImpactedVersions} wide>
          <Input
            value={change.closureImpactedVersions}
            onChange={(e) => onChange({ closureImpactedVersions: e.target.value })}
          />
        </RecordField>
        <RecordField label={LABELS.closureVerifier}>
          <UserSelect
            value={change.closureVerifier}
            onChange={(v?: string) => onChange({ closureVerifier: v ?? '' })}
          />
        </RecordField>
        <RecordField label={LABELS.closedDate}>
          <DatePicker
            style={{ width: '100%' }}
            value={change.closedDate ? dayjs(change.closedDate) : null}
            onChange={(d) => onChange({ closedDate: d ? d.format('YYYY-MM-DD') : undefined })}
          />
        </RecordField>
        {/* The one part the answer marks "if any", so it is never in the missing
            list — a change that leaves nothing behind should not be blocked into
            inventing a transition requirement. */}
        <RecordField label="Remaining action or transition requirement (if any)" wide>
          <Input
            value={change.closureRemainingAction}
            onChange={(e) => onChange({ closureRemainingAction: e.target.value })}
          />
        </RecordField>
      </div>
    </div>
  );
}
