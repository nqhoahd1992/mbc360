import type { ReactNode } from 'react';
import { ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';
import { ConfigProvider, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData } from '@mbc360/shared/types';
import {
  ADMINISTRATIVE_ONLY_OPTIONS,
  FAMILY_USE_AGE_GROUPS,
  UNSTRUCTURED_PMS_OPTIONS,
  UNSTRUCTURED_PMS_CONDITIONS,
  HUMAN_STUDY_PLANNED_OPTIONS,
  familyUseAgeGroupList,
} from '@mbc360/shared/types';
import { BENCHMARK_GATE_CHECK, isGateRefLocked, isGateSignedStanding, personAnswer } from '@mbc360/shared/utils/gateProgress';
import { isFamilyUseSelected } from './assessmentStatus';
import AssessmentStateTag from './AssessmentStateTag';
import AcknowledgementNote from './AcknowledgementNote';
import { ASSESSMENT_FIELDS, ASSESSMENT_HOMES, assessmentAnchor, type AssessmentKey } from '@mbc360/shared/config/assessments';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import ChoiceSelect from './ChoiceSelect';
import SelfAttestField from './SelfAttestField';
import Notice from './Notice';
import '../styles/concept.css';
import './DynamicTable.css';
import './AssessmentsCard.css';

// One explicit assessment (Round 4 questions 8, 9, 11, 12 and 25(c)), rendered
// on the tab of the gate that reads it (config/assessments.ts says which). These
// used to be five blocks on one "Assessments" card on the Project Overview,
// moved 2026-10-03 at the project owner's request: each judgement is made at
// its own gate, and the overview only summarises their state.
//
// Every field starts EMPTY on purpose. Empty is not a missing value here — it is
// the answer "not yet assessed", which blocks the Conditional item that reads it.
// That is question 7's rule, and it is why nothing here has a default.
//
// Each block keeps its own draft of ONLY its own fields and saves only those —
// the server merges a partial patch — so two blocks edited on one page cannot
// overwrite each other with stale values.

type Assessments = ProjectData['assessments'];
type Field = keyof Assessments;

// Which fields belong to which assessment — shared with the API, which locks
// them once the assessment's gate has passed.
const FIELDS: Record<AssessmentKey, readonly Field[]> = ASSESSMENT_FIELDS;

// What leaving it blank costs — shown with the question rather than only in the
// readiness panel.
// (The Change Control assessment is a LIST with its own component, ChangeControlAssessments.)
// (The foreseeable-contact question is not a block of its own: it sits inside the Target Users card, see ChecklistSection.)
// The scale-up assessment and the Change Control assessment are lists with a component of their own.
type BlockKey = Exclude<AssessmentKey, 'changeControl' | 'foreseeableContact' | 'scaleUp'>;
const HINTS: Record<BlockKey, string> = {
  pmsUnstructured:
    'Four conditions the application cannot read. A No needs its reason and the person who confirmed it; a Yes puts the product under enhanced surveillance. Any left blank blocks the enhanced-surveillance item.',
  familyUse:
    'Decides the infant pathway at Gates 2, 4, 5, 6, 7, 8-9 and 10. Family use is not a vulnerable population on its own, but leaving this unanswered blocks the pathway from being decided either way. Including Infant 0+ activates it.',
  administrativeOnly: 'Only a confirmed Yes exempts the project from competitor and benchmark review.',
  humanStudy: 'Undecided blocks the gate.',
};

function pick(source: Assessments, keys: readonly Field[]): Assessments {
  const out: Assessments = {};
  for (const k of keys) out[k] = source[k];
  return out;
}

function FieldBox({
  label,
  wide,
  required,
  children,
}: {
  label: string;
  wide?: boolean;
  // Marks a field the current answer makes mandatory (the Save guard below).
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? 'as-wide' : undefined}>
      <span className="as-label">
        {label}
        {required && <span className="as-req"> *</span>}
      </span>
      {children}
    </label>
  );
}

interface ReadRow {
  label: string;
  value?: string;
  wide?: boolean;
  kind?: 'answer' | 'link' | 'tags';
}

// The locked answer, read as a record rather than a form switched off: disabled inputs grey the very
// content a reader came for.
function AssessmentRecord({ rows }: { rows: ReadRow[] }) {
  const answer = rows.find((r) => r.kind === 'answer');
  const facts = rows.filter((r) => r.kind !== 'answer');
  const none = <span className="as-none">—</span>;
  const render = (r: ReadRow) => {
    const v = (r.value ?? '').trim();
    if (!v) return none;
    if (r.kind === 'tags') {
      return (
        <span className="as-tags">
          {v.split(',').map((t) => (
            <span key={t.trim()} className="c-tag">
              {t.trim()}
            </span>
          ))}
        </span>
      );
    }
    if (r.kind === 'link' && /^https?:\/\//i.test(v)) {
      return (
        <a href={v} target="_blank" rel="noreferrer">
          {v}
        </a>
      );
    }
    return v;
  };
  const answered = !!(answer?.value ?? '').trim() && !/pending/i.test(answer?.value ?? '');
  return (
    <div className="as-record">
      {answer && (
        <div className="as-answer">
          <span className="as-label">{answer.label}</span>
          <span className={`as-answer-tag${answered ? '' : ' as-answer-pending'}`}>{answer.value?.trim() || 'Not yet assessed'}</span>
        </div>
      )}
      {facts.length > 0 && (
        <dl className="as-facts">
          {facts.map((r) => (
            <div key={r.label} className={`as-fact${r.wide ? ' as-fact-wide' : ''}`}>
              <dt>{r.label}</dt>
              <dd>{render(r)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AssessmentBlock({ project, which }: { project: ProjectData; which: BlockKey }) {
  const setAssessments = useAppStore((s) => s.setAssessments);
  const keys = FIELDS[which];
  const { draft, dirty, update, markSaved, discard } = useDraft(pick(project.assessments, keys));
  const set = <K extends Field>(key: K, value: Assessments[K]) => update((prev) => ({ ...prev, [key]: value }));
  const home = ASSESSMENT_HOMES.find((h) => h.key === which)!;
  // Answered at this gate: read-only once it has passed, or while a signature stands on it (SW-24).
  const locked = isGateRefLocked(project, home.gateId.slice(2)) || isGateSignedStanding(project, home.gateId);

  // Question 25(c): the family-use question exists only for a family-use
  // product — an always-visible unanswered field reads as an obligation, and
  // here blank means "not applicable", not "not done". Mirrors the
  // `infantContact` limb in evaluateTrigger.
  if (which === 'familyUse' && !isFamilyUseSelected(project)) return null;

  // Question 11: "The classification must be confirmed by an authorised
  // reviewer." An unconfirmed Yes is not an exemption.
  const adminYes = which === 'administrativeOnly' && (draft.administrativeOnly?.trim() ?? '') === 'Yes';
  const adminNeedsReason = adminYes && !draft.administrativeOnlyRationale?.trim();
  const adminNeedsConfirmer = adminYes && !draft.administrativeOnlyConfirmedBy?.trim();

  // A No to a foreseeable-contact or surveillance-condition question must say why (the API refuses it too).
  const personQuestions: { answer: Field; rationale: Field; confirmer: Field; label: string }[] =
    which === 'pmsUnstructured'
      ? UNSTRUCTURED_PMS_CONDITIONS.map((c) => ({ answer: c.answer, rationale: c.rationale, confirmer: c.confirmer, label: c.label }))
      : [];
  const isNo = (q: { answer: Field }) => (draft[q.answer]?.trim() ?? '') === 'No';
  const needsReason = (q: { answer: Field; rationale: Field }) => isNo(q) && !draft[q.rationale]?.trim();
  // A No is a claim that something does not apply, so someone stands behind it (same as Administrative-only).
  const needsConfirmer = (q: { answer: Field; rationale: Field; confirmer: Field }) =>
    isNo(q) && !!draft[q.rationale]?.trim() && !draft[q.confirmer]?.trim();
  const missingReason = personQuestions.some(needsReason);
  const missingConfirmer = personQuestions.some(needsConfirmer);

  const blockingReason = adminNeedsReason
    ? 'An administrative-only Yes needs the reason the reviewer is confirming'
    : adminNeedsConfirmer
      ? 'An administrative-only classification must name the authorised reviewer who confirmed it'
      : missingReason
        ? 'An answer of No needs its reason'
        : missingConfirmer
          ? 'An answer of No needs the person who confirmed it: record yourself under Confirmed by'
          : undefined;

  // Mirrors the `humanStudyPlanned` limb in evaluateTrigger — a started protocol
  // counts as Yes on its own. Read here only to say so on screen.
  const protocolStarted = (project.registers['studyProtocolSetup'] ?? []).some(
    (r) => String(r.plannedValue ?? '').trim() !== '',
  );

  const answerSelect = (field: Field, options: readonly string[]) => (
    <ChoiceSelect
      allowClear
      placeholder="Not yet assessed"
      value={draft[field] || undefined}
      options={[...options]}
      onChange={(v) => set(field, v ?? '')}
    />
  );
  const datePicker = (field: Field) => (
    <DatePicker
      style={{ width: '100%' }}
      value={draft[field] ? dayjs(draft[field]) : null}
      onChange={(d) => set(field, d ? d.format('YYYY-MM-DD') : '')}
    />
  );

  // The Gate 03 row that carries the benchmark review may already have been done. Confirming administrative-only then says the review
  // was not needed, which contradicts what is recorded — shown to whoever is about to confirm it, not blocked: they may have a
  // reason, and the Reason box is where it goes (project owner, 2026-11-09).
  const benchmarkRow =
    which === 'administrativeOnly'
      ? project.gateChecks.find((c) => c.gate === BENCHMARK_GATE_CHECK.gate && c.check === BENCHMARK_GATE_CHECK.check)
      : undefined;
  const benchmarkAlreadyDone = !!benchmarkRow?.done && benchmarkRow.ynna === 'Y';
  const benchmarkDoneNote =
    benchmarkAlreadyDone && adminYes ? (
      <p className="as-note as-wide" role="note">
        <ExclamationCircleOutlined />
        <span>
          A benchmark/competitor review is already recorded on the Gate 03 check{benchmarkRow?.date ? ` (done ${benchmarkRow.date})` : ''}.
          Confirm administrative-only only if that review was not needed.
        </span>
      </p>
    ) : null;
  const protocolNotice =
    which === 'humanStudy' && protocolStarted ? (
      <Notice tone="info" title="A Study Protocol has been started, so this already counts as Yes whatever is selected here." />
    ) : null;
  const readRows: ReadRow[] = (() => {
    switch (which) {
      case 'humanStudy':
        return [{ label: 'Answer', kind: 'answer', value: draft.humanStudyPlanned }];
      // One row per question, then its reason: a record can hold several answers, which the single "answer" row cannot.
      case 'pmsUnstructured':
        return personQuestions.flatMap((q): ReadRow[] => [
          { label: q.label, value: draft[q.answer] || 'Not yet assessed' },
          { label: 'Reason', wide: true, value: draft[q.rationale] },
          ...(isNo(q) ? [{ label: 'Confirmed by', value: draft[q.confirmer] }] : []),
        ]);
      case 'administrativeOnly':
        return [
          { label: 'Answer', kind: 'answer', value: draft.administrativeOnly },
          { label: 'Reason', wide: true, value: draft.administrativeOnlyRationale },
          { label: 'Confirmed by (authorised reviewer)', value: draft.administrativeOnlyConfirmedBy },
        ];
      case 'familyUse':
        return [
          { label: 'Age groups included', kind: 'tags', wide: true, value: draft.familyUseAgeGroups },
          { label: 'Confirmed by', value: draft.familyUseConfirmedBy },
          { label: 'Confirmed on', value: draft.familyUseConfirmedDate },
        ];
    }
  })();

  let body: ReactNode;
  switch (which) {
    case 'pmsUnstructured': {
      // Said once at the top, so four questions read as one task with a count rather than four unrelated boxes.
      const answered = personQuestions.filter((q) => personAnswer(draft[q.answer], draft[q.rationale], draft[q.confirmer]) !== 'open').length;
      body = (
        <>
          <p className="as-q-progress">
            {answered} of {personQuestions.length} answered
          </p>
          <ol className="as-q-list">
            {personQuestions.map((q, i) => {
              const picked = (draft[q.answer]?.trim() ?? '') !== '';
              return (
                <li key={q.answer} className="as-q">
                  {/* Changing the answer or the reason withdraws a confirmation: the person confirmed those words, not the next ones. */}
                  <div className="as-q-head">
                    <span className="as-q-n" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="as-q-text">{q.label}</span>
                    <div className="as-q-choice">
                      <ChoiceSelect
                        allowClear
                        placeholder="Not yet assessed"
                        value={draft[q.answer] || undefined}
                        options={[...UNSTRUCTURED_PMS_OPTIONS]}
                        onChange={(v) => update((prev) => ({ ...prev, [q.answer]: v ?? '', [q.confirmer]: '' }))}
                      />
                    </div>
                  </div>
                  {/* The reason and the confirmer only matter once there is an answer: until then they are not asked for. */}
                  {picked && (
                    <div className={`as-q-detail${isNo(q) ? ' as-q-detail-2' : ''}`}>
                      <FieldBox label="Reason" required={needsReason(q)}>
                        <Input.TextArea
                          style={{ width: '100%' }}
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          placeholder={isNo(q) ? 'Why? Required for No' : 'Optional'}
                          value={draft[q.rationale]}
                          onChange={(e) => update((prev) => ({ ...prev, [q.rationale]: e.target.value, [q.confirmer]: '' }))}
                        />
                      </FieldBox>
                      {isNo(q) && (
                        <FieldBox label="Confirmed by" required={needsConfirmer(q)}>
                          <SelfAttestField
                            disabled={!draft[q.rationale]?.trim()}
                            value={draft[q.confirmer]}
                            onChange={(v) => set(q.confirmer, v)}
                          />
                        </FieldBox>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      );
      break;
    }
    case 'humanStudy':
      body = (
        <>
          <div className="as-grid">
            <FieldBox label="Answer">{answerSelect('humanStudyPlanned', HUMAN_STUDY_PLANNED_OPTIONS)}</FieldBox>
          </div>
          {/* "Creating a Study Protocol automatically sets the answer to Yes." The
              engine already treats a started protocol as Yes while the field
              stays as the person left it — without this line the block would
              show blank while Gate 8 behaves as though it said Yes. */}
          {protocolStarted && (
            <Notice
              tone="info"
              title="A Study Protocol has been started, so this already counts as Yes whatever is selected here."
            />
          )}
        </>
      );
      break;
    case 'administrativeOnly':
      body = (
        <div className="as-grid">
          {/* Editing the answer or the reason withdraws a confirmation: the reviewer confirmed those words, not the next ones. */}
          <FieldBox label="Answer" wide>
            <ChoiceSelect
              allowClear
              placeholder="Not yet assessed"
              value={draft.administrativeOnly || undefined}
              options={[...ADMINISTRATIVE_ONLY_OPTIONS]}
              onChange={(v) => update((prev) => ({ ...prev, administrativeOnly: v ?? '', administrativeOnlyConfirmedBy: '' }))}
            />
          </FieldBox>
          {benchmarkDoneNote}
          {adminYes && (
            <div className="as-wide as-q-detail as-q-detail-2 as-q-detail-flush">
            <FieldBox label="Reason" required={adminNeedsReason}>
              <p className="as-condition">
                Confirm that no claim, formula, market positioning, product performance, packaging function or
                customer-facing meaning changes, and say what the change is.
              </p>
              <Input.TextArea
                style={{ width: '100%' }}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="What is changing, and why nothing in the list above is affected"
                value={draft.administrativeOnlyRationale}
                onChange={(e) =>
                  update((prev) => ({ ...prev, administrativeOnlyRationale: e.target.value, administrativeOnlyConfirmedBy: '' }))
                }
              />
            </FieldBox>
            <FieldBox label="Confirmed by (authorised reviewer)" required={adminNeedsConfirmer}>
              <SelfAttestField
                value={draft.administrativeOnlyConfirmedBy}
                onChange={(v) => set('administrativeOnlyConfirmedBy', v)}
              />
            </FieldBox>
            </div>
          )}
        </div>
      );
      break;
    case 'familyUse':
      body = (
        <div className="as-grid">
          <FieldBox label="Age groups included" wide>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              allowClear
              placeholder="Not yet confirmed"
              value={familyUseAgeGroupList(draft)}
              options={FAMILY_USE_AGE_GROUPS.map((o) => ({ value: o, label: o }))}
              onChange={(v: string[]) => set('familyUseAgeGroups', v.join(', '))}
            />
          </FieldBox>
          <FieldBox label="Confirmed by">
            <SelfAttestField
              value={draft.familyUseConfirmedBy}
              onChange={(v) => set('familyUseConfirmedBy', v)}
            />
          </FieldBox>
          <FieldBox label="Confirmed on">{datePicker('familyUseConfirmedDate')}</FieldBox>
        </div>
      );
      break;
  }

  return (
    <section className="c-card as-card" id={assessmentAnchor(which)}>
      <div className="as-head">
        <div className="as-head-text">
          <div className="as-kicker">Assessment</div>
          <h2 className="as-title">{home.title}</h2>
          <p className="as-desc">{HINTS[which]}</p>
        </div>
        <div className="as-head-side">
          <AssessmentStateTag project={project} assessmentKey={which} />
          {/* C9: answered at this gate; once it has passed the answer is read-only
              (the API refuses changes too) — correcting it goes through Backtrack. */}
          {locked && (
            <span className="c-tag as-lock" title="Withdraw the signature, or Backtrack, to change this answer">
              <LockOutlined /> Locked
            </span>
          )}
        </div>
      </div>
      {locked ? (
        <div className="as-block">
          <p className="as-lock-note">
            {home.gateId} has passed or is signed. To change this answer, withdraw the signature or Backtrack.
          </p>
          <AssessmentRecord rows={readRows} />
          {protocolNotice}
          <AcknowledgementNote assessmentKey={which} />
        </div>
      ) : (
        <ConfigProvider componentDisabled={false}>
          <div className="as-block">
            {body}
            <AcknowledgementNote assessmentKey={which} />
          </div>
        </ConfigProvider>
      )}
      {(dirty || blockingReason) && (
        <div className="as-foot">
          <div className="rt-savebar as-save">
            {blockingReason && dirty && <span className="as-why">{blockingReason}</span>}
            <SaveBar
              dirty={dirty}
              onSave={() => {
                if (blockingReason) return;
                setAssessments(project.identity.id, draft);
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
