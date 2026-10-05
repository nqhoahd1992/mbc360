import { useState } from 'react';
import { Checkbox, DatePicker, Input, Select, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GateCheck, YNNA } from '@mbc360/shared/types';
import { isMandatoryGateCheck } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import RecordList, { RecordField } from './RecordList';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

// Key Gate Checks. Since 2026-10-02 laid out as a RecordList (compact rows +
// detail drawer) instead of a 9-column table: Done and Y/N/NA stay on the row,
// date, evidence, method, initials and notes open in the drawer. Same draft,
// same Save (addressed by each row's global index), same per-row gate lock.
export default function GateChecksTable({
  projectId,
  title,
  checks,
  isRowLocked,
}: {
  projectId: string;
  title: string;
  checks: { check: GateCheck; index: number }[];
  // Gate `number` (e.g. '01') currently open for work — still-required rows of
  // that gate are flagged.
  currentGateNumber?: string;
  // Gate-level edit lock: a row whose gate has passed is read-only.
  isRowLocked?: (check: GateCheck) => boolean;
}) {
  const setChecksBulk = useAppStore((s) => s.setGateChecksBulk);
  // Draft holds the mutable GateCheck values in the order of `checks` — each
  // row's global store index (checks[i].index) never changes locally.
  const { draft, dirty, update, markSaved, discard } = useDraft(checks.map((c) => c.check));
  const doneCount = draft.filter((c) => c.done).length;

  const patch = (index: number, p: Partial<GateCheck>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setChecksBulk(
      projectId,
      checks.map((c, i) => ({ index: c.index, patch: draft[i] })),
    );
    markSaved();
  };
  const required = (r: GateCheck) => isMandatoryGateCheck(r.gate, r.check) && !r.done;
  // Ticking Done is half the record: the workbook asks every checked item for
  // its evidence/reference, method and initials. So ticking a row that has no
  // evidence yet opens its drawer with the cursor in Evidence (2026-10-02).
  // Un-ticking never opens it, and neither does a row that already has evidence.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusEvidence, setFocusEvidence] = useState(false);
  const toggleDone = (i: number, done: boolean) => {
    patch(i, { done, ynna: done ? 'Y' : 'NA', date: done ? dayjs().format('YYYY-MM-DD') : undefined });
    if (done && !(draft[i].evidenceRef ?? '').trim() && openIndex !== i) {
      setOpenIndex(i);
      setFocusEvidence(true);
    }
  };
  // Focus after the drawer's open animation; once only.
  const evidenceRef = (el: InputRef | null) => {
    if (!el || !focusEvidence) return;
    setFocusEvidence(false);
    setTimeout(() => el.focus(), 320);
  };

  return (
    <RecordList
      // Every row's gate has passed: nothing here can change, so the drawer
      // drops its "changes stay in the draft" hint.
      readOnly={draft.length > 0 && draft.every((r) => !!isRowLocked?.(r))}
      title={title}
      count={`${doneCount}/${checks.length} done`}
      rows={draft}
      rowKey={(r) => `${r.gate}-${r.check}`}
      rowBadge={(r) => (
        <span className="c-tag" style={{ flexShrink: 0 }}>
          {isRowLocked?.(r) && <LockOutlined />}
          {r.gate}
        </span>
      )}
      rowTitle={(r) => (
        <>
          {r.check}
          {required(r) && (
            <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
              <span className="c-tag c-tag-bad" style={{ marginLeft: 8 }}>Required</span>
            </Tooltip>
          )}
        </>
      )}
      rowSubtitle={(r) => (r.done ? [r.date, r.evidenceRef].filter(Boolean).join(' · ') : undefined)}
      openIndex={openIndex}
      onOpenIndexChange={setOpenIndex}
      inline={[
        {
          label: 'Done',
          width: 72,
          render: (r, i) => <Checkbox checked={r.done} disabled={isRowLocked?.(r)} onChange={(e) => toggleDone(i, e.target.checked)} />,
        },
        {
          label: 'Y/N/NA',
          width: 112,
          render: (r, i) => (
            <Select
              style={{ width: 90 }}
              value={r.ynna}
              disabled={isRowLocked?.(r)}
              options={YNNA_OPTIONS}
              onChange={(v: YNNA) => patch(i, { ynna: v })}
            />
          ),
        },
      ]}
      drawer={(r, i) => {
        const locked = isRowLocked?.(r);
        return (
          <section>
            <div className="rt-grid">
              <RecordField label="Done">
                <Checkbox checked={r.done} disabled={locked} onChange={(e) => toggleDone(i, e.target.checked)}>
                  {r.done ? 'Done' : 'Not done'}
                </Checkbox>
              </RecordField>
              <RecordField label="Y/N/NA">
                <Select style={{ width: '100%' }} value={r.ynna} disabled={locked} options={YNNA_OPTIONS} onChange={(v: YNNA) => patch(i, { ynna: v })} />
              </RecordField>
              <RecordField label="Date">
                <DatePicker
                  style={{ width: '100%' }}
                  value={r.date ? dayjs(r.date) : null}
                  disabled={locked}
                  onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
                />
              </RecordField>
              <RecordField label="Initials">
                <Input value={r.initials} disabled={locked || !r.done} onChange={(e) => patch(i, { initials: e.target.value })} />
              </RecordField>
              <RecordField label="Evidence / reference" wide>
                <Input
                  ref={evidenceRef}
                  value={r.evidenceRef}
                  disabled={locked || !r.done}
                  placeholder={r.done ? 'Link or reference' : 'Tick Done to record evidence'}
                  onChange={(e) => patch(i, { evidenceRef: e.target.value })}
                />
              </RecordField>
              <RecordField label="Method ref" wide>
                <Input value={r.methodRef} disabled={locked || !r.done} onChange={(e) => patch(i, { methodRef: e.target.value })} />
              </RecordField>
              <RecordField label="Notes / action" wide>
                <Input.TextArea autoSize={{ minRows: 2 }} value={r.notes} disabled={locked} onChange={(e) => patch(i, { notes: e.target.value })} />
              </RecordField>
            </div>
          </section>
        );
      }}
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
