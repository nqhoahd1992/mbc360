import { validChangeRefs } from '@mbc360/shared/utils/changeLinks';
import { useState } from 'react';
import { Button, ConfigProvider, DatePicker, Input, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ChangeControlAssessment, ProjectData } from '@mbc360/shared/types';
import { CHANGE_CONTROL_REQUIRED_OPTIONS, POST_MARKET_FINDING_CATEGORIES, RISK_LEVELS } from '@mbc360/shared/types';
import { evaluateTrigger, isGateRefLocked, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import { reviewCycleOptions } from '@mbc360/shared/utils/postLaunch';
import { assessmentAnchor, ASSESSMENT_HOMES } from '@mbc360/shared/config/assessments';
import { assessmentMarkets, changeControlAssessmentProblems, isPendingAnswer } from '@mbc360/shared/utils/changeControlAssessments';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import ChoiceSelect from './ChoiceSelect';
import SelfAttestField from './SelfAttestField';
import Notice from './Notice';
import AssessmentStateTag from './AssessmentStateTag';
import AcknowledgementNote from './AcknowledgementNote';
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
  '': 'Every answer carries the reviewer, the date and the rationale; Yes also links the record. Leaving it open blocks Gate 12.',
  Yes: 'A change control is needed — link the record that was opened for it, and record who decided, when and why.',
  No: 'No change control is needed — record who decided, when and why.',
  'Pending assessment': 'Not decided yet — record who is assessing it, when and what is awaited. This blocks the review and Gate 12 until answered.',
};

export default function ChangeControlAssessments({ project, market }: { project: ProjectData; market?: string }) {
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
  // With a market chosen on the gate tab, only that market's findings are listed; the others stay in the draft untouched. A finding
  // that names no market, and one just added, are always listed. A new one starts with the chosen market.
  const listed = (e: ChangeControlAssessment) =>
    !market || e.id.startsWith('new-') || assessmentMarkets(e).length === 0 || assessmentMarkets(e).includes(market);
  const visible = draft.filter(listed);
  const addEntry = () => update((prev) => [...prev, { ...newEntry(), ...(market ? { markets: market } : {}) }]);

  // The review cycles a finding can be tied to: each milestone the schedule generates for a launched market, plus reviews on record.
  const cycles = reviewCycleOptions(project, {
    enhanced: evaluateTrigger(project, 'pvPmsRequired') === 'applies',
    asOf: dayjs().format('YYYY-MM-DD'),
    profiles: project.reference.marketProfiles,
  });
  const problems = changeControlAssessmentProblems(draft, {
    changeIds: validChangeRefs(project, 'assessment'),
    markets: project.identity.markets,
    reviewCycles: cycles.map((c) => c.key),
  });
  // Said once, in the footer. With several entries the entry number stays so the person can find it.
  const blockingReason = problems[0] ? (draft.length > 1 ? problems[0] : problems[0].replace(/^Assessment \d+: /, '')) : undefined;

  return (
    <section className="c-card as-card" id={assessmentAnchor('changeControl')}>
      <div className="as-head">
        <div className="as-head-text">
          <div className="as-kicker">Assessment</div>
          <h2 className="as-title">{home.title}</h2>
          <p className="as-desc">
            One entry for each post-market finding. A Pending (or unanswered) entry blocks the gate. If nothing from this review needs a
            change control, record one entry answered No, with the reviewer, the date and the reason.
          </p>
        </div>
        <div className="as-head-side">
          <AssessmentStateTag project={project} assessmentKey="changeControl" />
        </div>
      </div>
      {locked && (
        <Notice
          tone="info"
          title={`${home.gateId} has passed or is signed — these answers are read-only (withdraw the signature, or Backtrack, to change them)`}
        />
      )}
      <ConfigProvider componentDisabled={locked}>
        <div className="as-block">
          {visible.length === 0 && (
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
          {visible.map((e, i) => {
            const answer = (e.answer ?? '').trim();
            const worked = touched.has(e.id) || !e.id.startsWith('new-');
            const findingMissing = !(e.finding ?? '').trim();
            const pending = isPendingAnswer(e);
            return (
              <div className="cca-entry" key={e.id}>
                <div className="cca-entry-head">
                  <div className="cca-entry-title">
                    <strong>{e.findingId ?? `Assessment ${i + 1}`}</strong>
                    {!findingMissing && <span className="cca-entry-sub">{e.finding}</span>}
                  </div>
                  <div className="cca-entry-tools">
                    <span className={`c-tag c-tag-dot ${pending ? 'c-tag-warn' : answer === 'Yes' ? 'c-tag-bad' : 'c-tag-ok'}`}>
                      {pending ? 'Pending' : answer === 'Yes' ? 'Change control needed' : 'No change control needed'}
                    </span>
                    {/* Only the draft changes; Discard brings the entry back. */}
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Remove assessment ${i + 1}`}
                      onClick={() => update((prev) => prev.filter((x) => x.id !== e.id))}
                    />
                  </div>
                </div>

                <div className="cca-grid">
                  <label className="cca-12">
                    <span className="as-label">
                      Finding<span className="as-req"> *</span>
                    </span>
                    <Input
                      status={worked && findingMissing ? 'error' : undefined}
                      placeholder="What this finding is, e.g. rising irritation complaints, 3-month review"
                      value={e.finding}
                      onChange={(ev) => patch(e.id, { finding: ev.target.value })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Source / category<span className="as-req"> *</span>
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      status={worked && !(e.category ?? '').trim() ? 'error' : undefined}
                      placeholder="What kind of finding"
                      value={e.category || undefined}
                      options={POST_MARKET_FINDING_CATEGORIES.map((c) => ({ value: c, label: c }))}
                      onChange={(v?: string) => patch(e.id, { category: v })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Date identified</span>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={e.dateIdentified ? dayjs(e.dateIdentified) : null}
                      onChange={(d) => patch(e.id, { dateIdentified: d ? d.format('YYYY-MM-DD') : undefined })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Severity / priority</span>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      placeholder="Not rated"
                      value={e.severity || undefined}
                      options={RISK_LEVELS.map((l) => ({ value: l, label: l }))}
                      onChange={(v?: string) => patch(e.id, { severity: v })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Affected market(s)<span className="as-req"> *</span>
                    </span>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      status={worked && assessmentMarkets(e).length === 0 && project.identity.markets.length > 0 ? 'error' : undefined}
                      placeholder="One finding may affect several"
                      value={assessmentMarkets(e)}
                      options={project.identity.markets.map((m) => ({ value: m, label: m }))}
                      onChange={(v: string[]) => patch(e.id, { markets: v.join(', ') })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Review cycle{cycles.length > 0 && <span className="as-req"> *</span>}
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      popupMatchSelectWidth={false}
                      status={worked && cycles.length > 0 && !(e.reviewCycle ?? '').trim() ? 'error' : undefined}
                      placeholder={cycles.length === 0 ? 'No market has launched yet' : 'The review it belongs to'}
                      notFoundContent="No review cycle yet"
                      value={e.reviewCycle || undefined}
                      options={cycles.map((c) => ({ value: c.key, label: c.label }))}
                      onChange={(v?: string) => patch(e.id, { reviewCycle: v })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Affected SKU / formula / batch</span>
                    <Input
                      placeholder="e.g. SKU, formula version or batch number"
                      value={e.affected}
                      onChange={(ev) => patch(e.id, { affected: ev.target.value })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Source record link</span>
                    <Input
                      placeholder="complaint, report or request"
                      value={e.sourceRecord}
                      onChange={(ev) => patch(e.id, { sourceRecord: ev.target.value })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Disposition</span>
                    <Input
                      placeholder="What was done about it"
                      value={e.disposition}
                      onChange={(ev) => patch(e.id, { disposition: ev.target.value })}
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

                  <label className="cca-12">
                    <span className="as-label">
                      Linked Change Control record{answer === 'Yes' && <span className="as-req"> *</span>}
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      popupMatchSelectWidth={false}
                      status={worked && answer === 'Yes' && !e.linkedRecordId ? 'error' : undefined}
                      placeholder={project.changes.length === 0 ? 'No record on Change Control & Communication yet' : 'Choose from Change Control & Communication'}
                      notFoundContent="No record yet — open one on Change Control & Communication first"
                      value={e.linkedRecordId || undefined}
                      options={project.changes.map((c) => ({
                        value: c.changeId,
                        label: `${c.changeId} — ${c.trigger || c.affectedArea || 'change'} · ${c.status}`,
                      }))}
                      onChange={(v?: string) => patch(e.id, v ? { linkedRecordId: v, answer: 'Yes' } : { linkedRecordId: undefined })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Reviewer{answer !== '' && <span className="as-req"> *</span>}
                    </span>
                    <SelfAttestField
                      status={worked && answer !== '' && !(e.reviewer ?? '').trim() ? 'error' : undefined}
                      value={e.reviewer}
                      onChange={(v) => patch(e.id, { reviewer: v })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Review date{answer !== '' && <span className="as-req"> *</span>}
                    </span>
                    <DatePicker
                      style={{ width: '100%' }}
                      status={worked && answer !== '' && !e.reviewDate ? 'error' : undefined}
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
                      Rationale{answer !== '' && <span className="as-req"> *</span>}
                    </span>
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      status={worked && answer !== '' && !(e.rationale ?? '').trim() ? 'error' : undefined}
                      placeholder={answer === 'No' ? 'Why no change control is needed' : answer === 'Pending assessment' ? 'What is awaited' : answer === 'Yes' ? 'Why a change control is needed' : 'Required once answered'}
                      value={e.rationale}
                      onChange={(ev) => patch(e.id, { rationale: ev.target.value })}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          {visible.length > 0 && (
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addEntry}>
              Add another assessment
            </Button>
          )}
          <AcknowledgementNote assessmentKey="changeControl" />
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
