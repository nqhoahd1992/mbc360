import { useState } from 'react';
import { Checkbox, DatePicker, Input, Select } from 'antd';
import type { InputRef } from 'antd';
import dayjs from 'dayjs';
import type { AngleRow, YNNA } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import RecordList, { RecordField } from './RecordList';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

// 8 Angles coverage for a phase. Since 2026-10-02 a RecordList: Covered and
// Y/N/NA on the row, date, evidence, initials and comments in the drawer.
export default function EightAnglesTable({
  projectId,
  phase,
  angles,
  locked = false,
}: {
  projectId: string;
  phase: number;
  angles: AngleRow[];
  // A phase signature stands (SW-22): nothing here can change until it is withdrawn.
  locked?: boolean;
}) {
  const setAnglesBulk = useAppStore((s) => s.setAnglesBulk);
  const { draft, dirty, update, markSaved, discard } = useDraft(angles);
  const covered = draft.filter((a) => a.covered).length;

  const patch = (index: number, p: Partial<AngleRow>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setAnglesBulk(projectId, phase, draft);
    markSaved();
  };
  // Same as Key Gate Checks: ticking Covered on an angle with no evidence yet
  // opens its drawer with the cursor in Evidence / reference.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusEvidence, setFocusEvidence] = useState(false);
  const toggleCovered = (i: number, on: boolean) => {
    patch(i, { covered: on, ynna: on ? 'Y' : draft[i].ynna, date: on ? dayjs().format('YYYY-MM-DD') : undefined });
    if (on && !(draft[i].evidenceRef ?? '').trim() && openIndex !== i) {
      setOpenIndex(i);
      setFocusEvidence(true);
    }
  };
  const evidenceRef = (el: InputRef | null) => {
    if (!el || !focusEvidence) return;
    setFocusEvidence(false);
    setTimeout(() => el.focus(), 320);
  };

  return (
    <RecordList
      title="8 Angles Coverage"
      description="Apply to the phase before gate closure — covered, or N/A with a justification in the comments."
      count={`${covered}/8 covered`}
      readOnly={locked}
      rows={draft}
      rowKey={(r) => r.angle}
      rowTitle={(r) => r.angle}
      rowSubtitle={(r) => [r.evidenceRef, r.comments].filter(Boolean).join(' · ')}
      openIndex={openIndex}
      onOpenIndexChange={setOpenIndex}
      inline={[
        {
          label: 'Covered',
          width: 88,
          render: (r, i) => <Checkbox disabled={locked} checked={r.covered} onChange={(e) => toggleCovered(i, e.target.checked)} />,
        },
        {
          label: 'Y/N/NA',
          width: 112,
          render: (r, i) => <Select disabled={locked} style={{ width: 90 }} value={r.ynna} options={YNNA_OPTIONS} onChange={(v: YNNA) => patch(i, { ynna: v })} />,
        },
      ]}
      drawer={(r, i) => (
        <section>
          <div className="rt-grid">
            <RecordField label="Covered">
              <Checkbox disabled={locked} checked={r.covered} onChange={(e) => toggleCovered(i, e.target.checked)}>
                {r.covered ? 'Covered' : 'Not covered'}
              </Checkbox>
            </RecordField>
            <RecordField label="Y/N/NA">
              <Select disabled={locked} style={{ width: '100%' }} value={r.ynna} options={YNNA_OPTIONS} onChange={(v: YNNA) => patch(i, { ynna: v })} />
            </RecordField>
            <RecordField label="Date">
              <DatePicker disabled={locked} style={{ width: '100%' }} value={r.date ? dayjs(r.date) : null} onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })} />
            </RecordField>
            <RecordField label="Initials">
              <Input disabled={locked} value={r.initials} onChange={(e) => patch(i, { initials: e.target.value })} />
            </RecordField>
            <RecordField label="Evidence / reference" wide>
              <Input disabled={locked} ref={evidenceRef} value={r.evidenceRef} onChange={(e) => patch(i, { evidenceRef: e.target.value })} />
            </RecordField>
            <RecordField label="Comments" wide>
              <Input.TextArea disabled={locked} autoSize={{ minRows: 2 }} value={r.comments} onChange={(e) => patch(i, { comments: e.target.value })} />
            </RecordField>
          </div>
        </section>
      )}
      footer={
        dirty ? (
          <div className="rt-savebar">
            <div>
              <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
            </div>
          </div>
        ) : null
      }
    />
  );
}
