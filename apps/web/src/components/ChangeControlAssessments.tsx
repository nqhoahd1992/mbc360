import { useState } from 'react';
import { Button, ConfigProvider, DatePicker, Input, Popconfirm, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ChangeControlAssessment, ProjectData } from '@mbc360/shared/types';
import { CHANGE_CONTROL_REQUIRED_OPTIONS } from '@mbc360/shared/types';
import { isGateRefLocked, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import { assessmentAnchor, ASSESSMENT_HOMES } from '@mbc360/shared/config/assessments';
import { changeControlAssessmentProblems, isPendingAnswer } from '@mbc360/shared/utils/changeControlAssessments';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import ChoiceSelect from './ChoiceSelect';
import SelfAttestField from './SelfAttestField';
import Notice from './Notice';
import '../styles/concept.css';
import './DynamicTable.css';
import './AssessmentsCard.css';
import './ChangeControlAssessments.css';

// The Change Control assessment of post-market findings (Round 4 question 8), at Gate 12: ONE ENTRY PER
// FINDING, not one answer for the project (project owner, 2026-10-13 — the SME wrote "the post-market
// finding" but never said one per project, so the finer granularity is the default) [ASSUMPTION: R5-Q11].
//
// The linked Change Control record is the FIRST field of an entry: a record that already exists is the
// answer on its own (it names who opened it), so the question this block asks — is one needed? — only
// matters when there is nothing to link. Choosing a record therefore sets the answer to Yes.
//
// Empty is not "nothing to assess": a review that found nothing needing a change control is recorded as
// one entry answered No, with the reason, so "nobody has looked" and "looked, found nothing" differ.
// What is wrong with an entry is decided by ONE shared function, also used by the API.
//
// Layout (2026-10-13 UI pass): what the entry is about (record, market, finding) → the decision (answer,
// on its own full-width row so its three buttons never wrap and knock the neighbours out of line) → the
// review (who, when, evidence, why). A field only turns red once the person has worked on THAT entry —
// a just-added entry is not an error — and each problem is said once, in the footer.

const newEntry = (): ChangeControlAssessment => ({
  id: `new-${Math.random().toString(36).slice(2, 10)}`,
  finding: '',
  answer: '',
});

// What the chosen answer asks for, said where the answer is chosen.
const ANSWER_HINT: Record<string, string> = {
  '': 'Yes needs the linked record. No needs a reviewer and the reason. Leaving it open blocks Gate 12.',
  Yes: 'A change control is needed — link the record that was opened for it.',
  No: 'No change control is needed — record who decided and why.',
  'Pending assessment': 'Not decided yet. This blocks Gate 12 until it is answered.',
};

export default function ChangeControlAssessments({ project }: { project: ProjectData }) {
  const save = useAppStore((s) => s.setChangeControlAssessments);
  const { draft, dirty, update, markSaved, discard } = useDraft(project.changeControlAssessments ?? []);
  // Entries the person has already worked on in this session. A saved entry is always "worked on"; a brand
  // new one stays calm until something in it changes.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const home = ASSESSMENT_HOMES.find((h) => h.key === 'changeControl')!;
  const locked = isGateRefLocked(project, home.gateId.slice(2)) || isGateSignedStanding(project, home.gateId);

  const patch = (id: string, change: Partial<ChangeControlAssessment>) => {
    setTouched((prev) => new Set(prev).add(id));
    update((prev) => prev.map((e) => (e.id === id ? { ...e, ...change } : e)));
  };
  const addEntry = () => update((prev) => [...prev, newEntry()]);

  const problems = changeControlAssessmentProblems(draft, {
    changeIds: project.changes.map((c) => c.changeId),
    markets: project.identity.markets,
  });
  // Said once, in the footer. With several entries the entry number stays so the person can find it.
  const blockingReason = problems[0] ? (draft.length > 1 ? problems[0] : problems[0].replace(/^Assessment \d+: /, '')) : undefined;

  return (
    <section className="c-card as-card" id={assessmentAnchor('changeControl')}>
      <div className="as-head">
        <div className="as-kicker">Assessment</div>
        <h2 className="as-title">{home.title}</h2>
        <p className="as-desc">
          Gate 12. One entry for each post-market finding. A Pending (or unanswered) entry blocks the gate. If nothing from this
          review needs a change control, record one entry answered No, with the reviewer and the reason.
        </p>
      </div>
      {locked && (
        <Notice
          tone="info"
          title={`${home.gateId} has passed or is signed — these answers are read-only (withdraw the signature, or Backtrack, to change them)`}
        />
      )}
      <ConfigProvider componentDisabled={locked}>
        <div className="as-block">
          {draft.length === 0 && (
            <Notice
              tone="warn"
              title="No assessment recorded yet"
              action={
                <Button type="primary" icon={<PlusOutlined />} onClick={addEntry}>
                  Add assessment
                </Button>
              }
            >
              Add one even if nothing needs a change control: answer No, with the reviewer and the reason. That is the record that
              this review was looked at.
            </Notice>
          )}
          {draft.map((e, i) => {
            const answer = (e.answer ?? '').trim();
            const worked = touched.has(e.id) || !e.id.startsWith('new-');
            const findingMissing = !(e.finding ?? '').trim();
            const hasContent = !!(findingMissing ? '' : e.finding) || !!answer || !!(e.rationale ?? '').trim() || !!e.linkedRecordId;
            const pending = isPendingAnswer(e);
            return (
              <div className="cca-entry" key={e.id}>
                <div className="cca-entry-head">
                  <div className="cca-entry-title">
                    <strong>Assessment {i + 1}</strong>
                    {!findingMissing && <span className="cca-entry-sub">{e.finding}</span>}
                  </div>
                  <div className="cca-entry-tools">
                    <span className={`c-tag c-tag-dot ${pending ? 'c-tag-warn' : answer === 'Yes' ? 'c-tag-bad' : 'c-tag-ok'}`}>
                      {pending ? 'Pending' : answer === 'Yes' ? 'Change control needed' : 'No change control needed'}
                    </span>
                    <Popconfirm
                      title="Remove this assessment?"
                      okText="Remove"
                      okButtonProps={{ danger: true }}
                      disabled={!hasContent}
                      onConfirm={() => update((prev) => prev.filter((x) => x.id !== e.id))}
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Remove assessment ${i + 1}`}
                        onClick={hasContent ? undefined : () => update((prev) => prev.filter((x) => x.id !== e.id))}
                      />
                    </Popconfirm>
                  </div>
                </div>

                <div className="cca-grid">
                  <label className="cca-8">
                    <span className="as-label">
                      Linked Change Control record{answer === 'Yes' && <span className="as-req"> *</span>}
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      popupMatchSelectWidth={false}
                      status={worked && answer === 'Yes' && !e.linkedRecordId ? 'error' : undefined}
                      placeholder={project.changes.length === 0 ? 'No change record on this project yet' : 'Pick the record opened for it, if any'}
                      notFoundContent="Open one on the Change Control page first"
                      value={e.linkedRecordId || undefined}
                      options={project.changes.map((c) => ({
                        value: c.changeId,
                        label: `${c.changeId} — ${c.trigger || c.affectedArea || 'change'} · ${c.status}`,
                      }))}
                      onChange={(v?: string) => patch(e.id, v ? { linkedRecordId: v, answer: 'Yes' } : { linkedRecordId: undefined })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Market (optional)</span>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      placeholder="All / not market-specific"
                      value={e.market || undefined}
                      options={project.identity.markets.map((m) => ({ value: m, label: m }))}
                      onChange={(v?: string) => patch(e.id, { market: v })}
                    />
                  </label>
                  <label className="cca-12">
                    <span className="as-label">
                      Finding<span className="as-req"> *</span>
                    </span>
                    <Input
                      status={worked && findingMissing ? 'error' : undefined}
                      placeholder="What this assessment is about, e.g. rising irritation complaints, Vietnam, 3-month review"
                      value={e.finding}
                      onChange={(ev) => patch(e.id, { finding: ev.target.value })}
                    />
                  </label>

                  <div className="cca-12 cca-answer">
                    <span className="as-label">Change control required?</span>
                    <ChoiceSelect
                      allowClear
                      placeholder="Not yet assessed"
                      value={e.answer || undefined}
                      options={[...CHANGE_CONTROL_REQUIRED_OPTIONS]}
                      onChange={(v) => patch(e.id, v === 'Yes' ? { answer: v } : { answer: v ?? '', linkedRecordId: undefined })}
                    />
                    <span className="cca-hint">{ANSWER_HINT[answer] ?? ANSWER_HINT['']}</span>
                  </div>

                  <label className="cca-4">
                    <span className="as-label">
                      Reviewer{answer === 'No' && <span className="as-req"> *</span>}
                    </span>
                    <SelfAttestField
                      status={worked && answer === 'No' && !(e.reviewer ?? '').trim() ? 'error' : undefined}
                      value={e.reviewer}
                      onChange={(v) => patch(e.id, { reviewer: v })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Review date</span>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={e.reviewDate ? dayjs(e.reviewDate) : null}
                      onChange={(d) => patch(e.id, { reviewDate: d ? d.format('YYYY-MM-DD') : undefined })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Evidence link</span>
                    <Input placeholder="link / folder" value={e.evidenceLink} onChange={(ev) => patch(e.id, { evidenceLink: ev.target.value })} />
                  </label>
                  <label className="cca-12">
                    <span className="as-label">
                      Rationale{answer === 'No' && <span className="as-req"> *</span>}
                    </span>
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      status={worked && answer === 'No' && !(e.rationale ?? '').trim() ? 'error' : undefined}
                      placeholder={answer === 'No' ? 'Why no change control is needed' : 'Optional'}
                      value={e.rationale}
                      onChange={(ev) => patch(e.id, { rationale: ev.target.value })}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          {draft.length > 0 && (
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addEntry}>
              Add another assessment
            </Button>
          )}
        </div>
      </ConfigProvider>
      {(dirty || blockingReason) && (
        <div className="as-foot">
          {blockingReason && dirty && <Notice tone="warn" title={`Cannot save yet — ${blockingReason}`} />}
          <div className="rt-savebar">
            <SaveBar
              dirty={dirty}
              onSave={async () => {
                if (blockingReason) return;
                await save(project.identity.id, draft);
                markSaved();
              }}
              onDiscard={discard}
              disabled={!!blockingReason}
              disabledReason={blockingReason}
            />
          </div>
        </div>
      )}
    </section>
  );
}
