import { useState } from 'react';
import { Button, ConfigProvider, DatePicker, Input, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ProjectData, ScaleUpAssessment } from '@mbc360/shared/types';
import { SCALE_UP_TIMINGS } from '@mbc360/shared/types';
import { SCALE_UP_AREA_GROUPS, SCALE_UP_AREA_NONE, SCALE_UP_OPEN_AREA, assessmentAnchor, ASSESSMENT_HOMES } from '@mbc360/shared/config/assessments';
import { isGateRefLocked, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import {
  SCALE_UP_WAIVER_ROLES,
  isNewFormula,
  isNoAffectedArea,
  isScaleUpPending,
  scaleUpAssessmentProblems,
} from '@mbc360/shared/utils/scaleUpAssessments';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import ChoiceSelect from './ChoiceSelect';
import SelfAttestField from './SelfAttestField';
import Notice from './Notice';
import AssessmentStateTag from './AssessmentStateTag';
import AcknowledgementNote from './AcknowledgementNote';
import GeneratedNaAcks from './GeneratedNaAcks';
import '../styles/concept.css';
import './DynamicTable.css';
import './AssessmentsCard.css';
import './ChangeControlAssessments.css';

// The scale-up / pilot assessment of Gate 9 (Round 4 question 12), as a LIST — one entry per affected area (Round 5 question 7). Choosing
// an area TRIGGERS an assessment; it never predetermines a Yes. An entry records what changed (before / after), the Yes / No / Pending
// risk, the reason, the pilot or verification it needs, the evidence, who assessed it and when. A reviewed "no affected area / no scale-up
// activity required" entry is how an assessment that found nothing is recorded; an empty list is incomplete. On a NEW formula a No cannot
// switch the assessment off: waiving a separate pilot needs a justification, the supporting verification, and Quality, Manufacturing and
// R&I. What is wrong with an entry is ONE shared function, also read by the API. Our readings of the details: [ASSUMPTION: R6-Q13].

const newEntry = (): ScaleUpAssessment => ({ id: `new-${Math.random().toString(36).slice(2, 10)}`, area: '', answer: '' });

const ANSWER_HINT: Record<string, string> = {
  '': 'Leaving it open blocks Gate 9. Choosing the area starts the assessment; it does not say the risk is Yes.',
  Yes: 'A scale-up or pilot risk exists — name the pilot or verification it requires, and record who assessed it, when and why.',
  No: 'No scale-up risk for this area — record who assessed it, when and why.',
  'Pending assessment': 'Not decided yet. A Pending entry blocks Gate 9 until it is answered.',
};

export default function ScaleUpAssessments({ project }: { project: ProjectData }) {
  const save = useAppStore((s) => s.setScaleUpAssessments);
  const me = useSession().user?.displayName;
  const { draft, dirty, update, markSaved, discard } = useDraft(project.scaleUpAssessments ?? []);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const home = ASSESSMENT_HOMES.find((h) => h.key === 'scaleUp')!;
  const locked = isGateRefLocked(project, home.gateId.slice(2)) || isGateSignedStanding(project, home.gateId);
  const newFormula = isNewFormula(project);

  const patch = (id: string, change: Partial<ScaleUpAssessment>) => {
    setTouched((prev) => new Set(prev).add(id));
    update((prev) => prev.map((e) => (e.id === id ? { ...e, ...change } : e)));
  };
  const addEntry = () => update((prev) => [...prev, newEntry()]);

  // What stops a SAVE. The waiver's three confirmations come one at a time from three people, so they are not asked for here — they are
  // what keeps Gate 9 blocked (the readiness list says so).
  const problems = scaleUpAssessmentProblems(draft, { changeIds: project.changes.map((c) => c.changeId), newFormula });
  const blockingReason = problems[0] ? (draft.length > 1 ? problems[0] : problems[0].replace(/^Assessment \d+: /, '')) : undefined;

  const holds = (functionKey: string) => {
    const holder = project.identity.reviewers?.[functionKey];
    return !!holder && !!me && holder.trim().toLowerCase() === me.trim().toLowerCase();
  };

  const areaOptions = [
    { value: SCALE_UP_AREA_NONE, label: SCALE_UP_AREA_NONE },
    ...SCALE_UP_AREA_GROUPS.map((g) => ({ label: g.label, options: g.areas.map((a) => ({ value: a, label: a })) })),
  ];

  return (
    <section className="c-card as-card" id={assessmentAnchor('scaleUp')}>
      <div className="as-head">
        <div className="as-head-text">
          <div className="as-kicker">Assessment</div>
          <h2 className="as-title">{home.title}</h2>
          <p className="as-desc">
            One entry for each affected area. Choosing an area starts an assessment — it does not say the risk is Yes. A Pending entry blocks the
            gate, and an empty list is incomplete: if nothing is affected, record one entry for "no affected area", with who assessed it, when and why.
          </p>
        </div>
        <div className="as-head-side">
          <AssessmentStateTag project={project} assessmentKey="scaleUp" />
        </div>
      </div>
      {locked && (
        <Notice
          tone="info"
          title={`${home.gateId} has passed or is signed — these answers are read-only (withdraw the signature, or Backtrack, to change them)`}
        />
      )}
      {newFormula && (
        <Notice tone="info" title="A new formula must have a scale-up or pilot assessment">
          A No can be recorded, but it cannot switch the assessment off: waiving a separate pilot needs the justification (equivalence to a qualified
          process), the supporting verification, and the confirmation of Quality, Manufacturing and R&amp;I.
        </Notice>
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
              Add an entry for each area the change affects. If nothing is affected, add one for "no affected area / no scale-up activity required"
              and answer No.
            </Notice>
          )}
          {draft.map((e, i) => {
            const answer = (e.answer ?? '').trim();
            const worked = touched.has(e.id) || !e.id.startsWith('new-');
            const pending = isScaleUpPending(e);
            const none = isNoAffectedArea(e);
            const open = e.area === SCALE_UP_OPEN_AREA;
            const afterLock = e.timing === 'After formula lock';
            return (
              <div className="cca-entry" key={e.id}>
                <div className="cca-entry-head">
                  <div className="cca-entry-title">
                    <strong>{`Assessment ${i + 1}`}</strong>
                    {e.area && <span className="cca-entry-sub">{e.area}</span>}
                  </div>
                  <div className="cca-entry-tools">
                    <span className={`c-tag c-tag-dot ${pending ? 'c-tag-warn' : answer === 'Yes' ? 'c-tag-bad' : 'c-tag-ok'}`}>
                      {pending ? 'Pending' : answer === 'Yes' ? 'Pilot or verification needed' : 'No scale-up risk'}
                    </span>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Remove assessment ${i + 1}`} onClick={() => update((prev) => prev.filter((x) => x.id !== e.id))} />
                  </div>
                </div>

                <div className="cca-grid">
                  <label className="cca-8">
                    <span className="as-label">
                      Affected area<span className="as-req"> *</span>
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      showSearch={{ optionFilterProp: 'label' }}
                      status={worked && !e.area ? 'error' : undefined}
                      placeholder="Which change prompts the review"
                      value={e.area || undefined}
                      options={areaOptions}
                      onChange={(v: string) => patch(e.id, v === SCALE_UP_AREA_NONE ? { area: v, timing: undefined, linkedChangeId: undefined, linkedIteration: undefined } : { area: v })}
                    />
                  </label>
                  {!none && (
                    <label className="cca-4">
                      <span className="as-label">
                        When did the change happen?{!pending && <span className="as-req"> *</span>}
                      </span>
                      <Select
                        style={{ width: '100%' }}
                        allowClear
                        status={worked && !pending && !e.timing ? 'error' : undefined}
                        placeholder="Before or after the formula lock"
                        value={e.timing || undefined}
                        options={SCALE_UP_TIMINGS.map((t) => ({ value: t, label: t }))}
                        onChange={(v?: string) => patch(e.id, { timing: v, ...(v === 'After formula lock' ? {} : { linkedChangeId: undefined }) })}
                      />
                    </label>
                  )}
                  {(open || !none) && (
                    <label className="cca-12">
                      <span className="as-label">
                        {open ? 'Describe the change' : 'What changed'}
                        {open && <span className="as-req"> *</span>}
                      </span>
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        status={worked && open && !(e.description ?? '').trim() ? 'error' : undefined}
                        placeholder={open ? 'This area is open-ended: say what Manufacturing, Quality or R&I identified' : 'e.g. batch moved to the second factory'}
                        value={e.description}
                        onChange={(ev) => patch(e.id, { description: ev.target.value })}
                      />
                    </label>
                  )}
                  {!none && (
                    <>
                      <label className="cca-6">
                        <span className="as-label">Before</span>
                        <Input placeholder="e.g. 50 kg batch" value={e.before} onChange={(ev) => patch(e.id, { before: ev.target.value })} />
                      </label>
                      <label className="cca-6">
                        <span className="as-label">After</span>
                        <Input placeholder="e.g. 500 kg batch" value={e.after} onChange={(ev) => patch(e.id, { after: ev.target.value })} />
                      </label>
                    </>
                  )}

                  <div className="cca-12 cca-answer">
                    <span className="as-label">Scale-up risk identified?</span>
                    <ChoiceSelect
                      allowClear
                      placeholder="Not yet assessed"
                      value={e.answer || undefined}
                      options={['Yes', 'No', 'Pending assessment']}
                      onChange={(v) => patch(e.id, { answer: v ?? '' })}
                    />
                    <span className="cca-hint">{ANSWER_HINT[answer] ?? ANSWER_HINT['']}</span>
                  </div>

                  <label className="cca-12">
                    <span className="as-label">
                      Reason{!pending && <span className="as-req"> *</span>}
                    </span>
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      status={worked && !pending && !(e.rationale ?? '').trim() ? 'error' : undefined}
                      placeholder={answer === 'No' ? 'Why there is no scale-up risk' : answer === 'Yes' ? 'Why there is a scale-up risk' : 'What is awaited'}
                      value={e.rationale}
                      onChange={(ev) => patch(e.id, { rationale: ev.target.value })}
                    />
                  </label>
                  {!none && (
                    <label className="cca-12">
                      <span className="as-label">
                        Required pilot or verification{answer === 'Yes' && <span className="as-req"> *</span>}
                      </span>
                      <Input
                        status={worked && answer === 'Yes' && !(e.verification ?? '').trim() ? 'error' : undefined}
                        placeholder="e.g. one pilot batch at full scale before release"
                        value={e.verification}
                        onChange={(ev) => patch(e.id, { verification: ev.target.value })}
                      />
                    </label>
                  )}
                  {!none && afterLock && (
                    <label className="cca-12">
                      <span className="as-label">
                        Linked Change Control record<span className="as-req"> *</span>
                      </span>
                      <Select
                        style={{ width: '100%' }}
                        allowClear
                        showSearch={{ optionFilterProp: 'label' }}
                        popupMatchSelectWidth={false}
                        status={worked && !pending && !e.linkedChangeId ? 'error' : undefined}
                        placeholder={project.changes.length === 0 ? 'No record on Change Control & Communication yet' : 'A change after the formula lock links its record'}
                        notFoundContent="No record yet — open one on Change Control & Communication first"
                        value={e.linkedChangeId || undefined}
                        options={project.changes.map((c) => ({ value: c.changeId, label: `${c.changeId} — ${c.trigger || c.affectedArea || 'change'} · ${c.status}` }))}
                        onChange={(v?: string) => patch(e.id, { linkedChangeId: v })}
                      />
                    </label>
                  )}
                  {!none && e.timing === 'Before formula lock' && (
                    <label className="cca-12">
                      <span className="as-label">Development iteration (optional)</span>
                      <Input placeholder="The iteration this change belongs to" value={e.linkedIteration} onChange={(ev) => patch(e.id, { linkedIteration: ev.target.value })} />
                    </label>
                  )}
                  <label className="cca-4">
                    <span className="as-label">
                      Assessor{!pending && <span className="as-req"> *</span>}
                    </span>
                    <SelfAttestField status={worked && !pending && !(e.assessor ?? '').trim() ? 'error' : undefined} value={e.assessor} onChange={(v) => patch(e.id, { assessor: v })} />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">
                      Assessment date{!pending && <span className="as-req"> *</span>}
                    </span>
                    <DatePicker
                      style={{ width: '100%' }}
                      status={worked && !pending && !e.assessedDate ? 'error' : undefined}
                      value={e.assessedDate ? dayjs(e.assessedDate) : null}
                      onChange={(d) => patch(e.id, { assessedDate: d ? d.format('YYYY-MM-DD') : undefined })}
                    />
                  </label>
                  <label className="cca-4">
                    <span className="as-label">Evidence link</span>
                    <Input placeholder="link / folder" value={e.evidenceLink} onChange={(ev) => patch(e.id, { evidenceLink: ev.target.value })} />
                  </label>

                  {newFormula && answer === 'No' && (
                    <div className="cca-12 cca-answer">
                      <span className="as-label">Waiver of a separate pilot (a new formula)</span>
                      <span className="cca-hint">
                        A bare No cannot waive manufacture-readiness evidence. Justify why this is equivalent to a qualified process, link the supporting
                        verification, and have Quality, Manufacturing and R&amp;I each confirm.
                      </span>
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        placeholder="Why this is equivalent to a qualified process"
                        value={e.waiverJustification}
                        onChange={(ev) => patch(e.id, { waiverJustification: ev.target.value })}
                      />
                      <Input placeholder="Link to the supporting verification" value={e.waiverEvidenceLink} onChange={(ev) => patch(e.id, { waiverEvidenceLink: ev.target.value })} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {SCALE_UP_WAIVER_ROLES.map((r) => {
                          const by = (e[r.field] ?? '').trim();
                          return (
                            <span key={r.field} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <b>{r.label}</b>
                              {by ? (
                                <span className="c-tag c-tag-ok">Confirmed by {by}</span>
                              ) : (
                                <Button
                                  size="small"
                                  disabled={!holds(r.functionKey) || !(e.waiverJustification ?? '').trim() || !(e.waiverEvidenceLink ?? '').trim()}
                                  title={holds(r.functionKey) ? undefined : `Only the person the project's Lead assigned as ${r.label} confirms this`}
                                  onClick={() => me && patch(e.id, { [r.field]: me } as Partial<ScaleUpAssessment>)}
                                >
                                  Confirm as {r.label}
                                </Button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {draft.length > 0 && (
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addEntry}>
              Add another assessment
            </Button>
          )}
          <GeneratedNaAcks home="scaleUp" />
          <AcknowledgementNote assessmentKey="scaleUp" />
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
