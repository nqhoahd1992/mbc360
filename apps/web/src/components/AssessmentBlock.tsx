import { Fragment, type ReactNode } from 'react';
import { LockOutlined } from '@ant-design/icons';
import { ConfigProvider, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData } from '@mbc360/shared/types';
import {
  ADMINISTRATIVE_ONLY_OPTIONS,
  FAMILY_USE_AGE_GROUPS,
  FORESEEABLE_CONTACT_OPTIONS,
  UNSTRUCTURED_PMS_OPTIONS,
  UNSTRUCTURED_PMS_CONDITIONS,
  HUMAN_STUDY_PLANNED_OPTIONS,
  SCALE_UP_RISK_OPTIONS,
  familyUseAgeGroupList,
} from '@mbc360/shared/types';
import { isGateRefLocked, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import { ASSESSMENT_FIELDS, ASSESSMENT_HOMES, SCALE_UP_REVIEW_AREAS, assessmentAnchor, type AssessmentKey } from '@mbc360/shared/config/assessments';
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
const HINTS: Record<Exclude<AssessmentKey, 'changeControl'>, string> = {
  foreseeableContact:
    'Gates 2 to 10. Leaving either blank blocks the maternal and infant items. A project with no maternal or infant user ticked is not "not applicable" until someone answers No here and says why; Yes switches the pathway on.',
  pmsUnstructured:
    'Gate 12. These four conditions are the ones the application cannot read. Leaving any blank blocks the enhanced-surveillance item; a No needs its reason, and a Yes puts the product under enhanced surveillance.',
  familyUse:
    'Decides the infant pathway at Gates 2, 4, 5, 6, 7, 8-9 and 10. Family use is not a vulnerable population on its own, but leaving this unanswered blocks the pathway from being decided either way. Including Infant 0+ activates it.',
  administrativeOnly: 'Gate 03. Only a confirmed Yes exempts the project from competitor and benchmark review.',
  humanStudy: 'Gate 08. Undecided blocks the gate.',
  scaleUp: 'Gate 09. Pending assessment blocks the gate. A Major formula change counts as identified on its own.',
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

export function isFamilyUseSelected(project: ProjectData): boolean {
  return (project.checklists['targetUsers'] ?? []).some((i) => i.selected && i.label === 'Family use');
}

export default function AssessmentBlock({ project, which }: { project: ProjectData; which: Exclude<AssessmentKey, 'changeControl'> }) {
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
  const adminNeedsConfirmer =
    which === 'administrativeOnly' &&
    (draft.administrativeOnly?.trim() ?? '') === 'Yes' &&
    !draft.administrativeOnlyConfirmedBy?.trim();

  // A No to a foreseeable-contact or surveillance-condition question must say why (the API refuses it too).
  const personQuestions: { answer: Field; rationale: Field; label: string }[] =
    which === 'foreseeableContact'
      ? [
          { answer: 'foreseeableMaternalContact', rationale: 'foreseeableMaternalRationale', label: 'Is contact with a pregnant, breastfeeding or postpartum user reasonably foreseeable?' },
          { answer: 'foreseeableInfantContact', rationale: 'foreseeableInfantRationale', label: 'Is contact with an infant reasonably foreseeable, including by a caregiver or sibling?' },
        ]
      : which === 'pmsUnstructured'
        ? UNSTRUCTURED_PMS_CONDITIONS.map((c) => ({ answer: c.answer, rationale: c.rationale, label: c.label }))
        : [];
  const needsReason = (q: { answer: Field; rationale: Field }) =>
    (draft[q.answer]?.trim() ?? '') === 'No' && !draft[q.rationale]?.trim();
  const missingReason = personQuestions.some(needsReason);

  const blockingReason = adminNeedsConfirmer
    ? 'An administrative-only classification must name the authorised reviewer who confirmed it'
    : missingReason
      ? 'An answer of No needs its reason'
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

  // A reference list, not part of the answer: it sits after the form, and after the record once locked.
  const areasDetails =
    which === 'scaleUp' ? (
      <details className="as-areas">
        <summary>Changes that should prompt a scale-up or pilot review ({SCALE_UP_REVIEW_AREAS.length})</summary>
        <ul>
          {SCALE_UP_REVIEW_AREAS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
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
      case 'foreseeableContact':
      case 'pmsUnstructured':
        return personQuestions.flatMap((q): ReadRow[] => [
          { label: q.label, value: draft[q.answer] || 'Not yet assessed' },
          { label: 'Reason', wide: true, value: draft[q.rationale] },
        ]);
      case 'administrativeOnly':
        return [
          { label: 'Answer', kind: 'answer', value: draft.administrativeOnly },
          { label: 'Confirmed by (authorised reviewer)', value: draft.administrativeOnlyConfirmedBy },
        ];
      case 'familyUse':
        return [
          { label: 'Age groups included', kind: 'tags', wide: true, value: draft.familyUseAgeGroups },
          { label: 'Confirmed by', value: draft.familyUseConfirmedBy },
          { label: 'Confirmed on', value: draft.familyUseConfirmedDate },
        ];
      case 'scaleUp':
        return [
          { label: 'Answer', kind: 'answer', value: draft.scaleUpRiskIdentified },
          { label: 'Assessor', value: draft.scaleUpRiskAssessor },
          { label: 'Assessment date', value: draft.scaleUpRiskAssessmentDate },
          { label: 'Evidence link', kind: 'link', value: draft.scaleUpRiskEvidenceLink },
          { label: 'Risk description', wide: true, value: draft.scaleUpRiskDescription },
          { label: 'Rationale', wide: true, value: draft.scaleUpRiskRationale },
          { label: 'Required pilot or scale-up activity', wide: true, value: draft.scaleUpRiskActivity },
        ];
    }
  })();

  let body: ReactNode;
  switch (which) {
    case 'foreseeableContact':
    case 'pmsUnstructured':
      body = (
        <div className="as-grid">
          {personQuestions.map((q) => (
            <Fragment key={q.answer}>
              <FieldBox label={q.label} wide>
                {answerSelect(q.answer, which === 'foreseeableContact' ? FORESEEABLE_CONTACT_OPTIONS : UNSTRUCTURED_PMS_OPTIONS)}
              </FieldBox>
              <FieldBox label="Reason" wide required={needsReason(q)}>
                <Input.TextArea
                  style={{ width: '100%' }}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  status={needsReason(q) ? 'error' : undefined}
                  placeholder={(draft[q.answer]?.trim() ?? '') === 'No' ? 'Why? Required for No' : 'Optional'}
                  value={draft[q.rationale]}
                  onChange={(e) => set(q.rationale, e.target.value)}
                />
              </FieldBox>
            </Fragment>
          ))}
        </div>
      );
      break;
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
          <FieldBox label="Answer">{answerSelect('administrativeOnly', ADMINISTRATIVE_ONLY_OPTIONS)}</FieldBox>
          <FieldBox label="Confirmed by (authorised reviewer)" required={adminNeedsConfirmer}>
            <SelfAttestField
              status={adminNeedsConfirmer ? 'error' : undefined}
              value={draft.administrativeOnlyConfirmedBy}
              onChange={(v) => set('administrativeOnlyConfirmedBy', v)}
            />
          </FieldBox>
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
    case 'scaleUp':
      body = (
        <div className="as-grid">
          <FieldBox label="Answer" wide>
            {answerSelect('scaleUpRiskIdentified', SCALE_UP_RISK_OPTIONS)}
          </FieldBox>
          {/* Who and when, then where the evidence is: three short fields share one row. */}
          <FieldBox label="Assessor">
            <SelfAttestField
              value={draft.scaleUpRiskAssessor}
              onChange={(v) => set('scaleUpRiskAssessor', v)}
            />
          </FieldBox>
          <FieldBox label="Assessment date">{datePicker('scaleUpRiskAssessmentDate')}</FieldBox>
          <FieldBox label="Evidence link">
            <Input
              placeholder="link / folder"
              value={draft.scaleUpRiskEvidenceLink}
              onChange={(e) => set('scaleUpRiskEvidenceLink', e.target.value)}
            />
          </FieldBox>
          {/* The long answers take the full width. */}
          <FieldBox label="Risk description" wide>
            <Input.TextArea
              style={{ width: '100%' }}
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={draft.scaleUpRiskDescription}
              onChange={(e) => set('scaleUpRiskDescription', e.target.value)}
            />
          </FieldBox>
          <FieldBox label="Rationale" wide>
            <Input.TextArea
              style={{ width: '100%' }}
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={draft.scaleUpRiskRationale}
              onChange={(e) => set('scaleUpRiskRationale', e.target.value)}
            />
          </FieldBox>
          <FieldBox label="Required pilot or scale-up activity" wide>
            <Input value={draft.scaleUpRiskActivity} onChange={(e) => set('scaleUpRiskActivity', e.target.value)} />
          </FieldBox>
          <div className="as-wide">{areasDetails}</div>
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
        {/* C9: answered at this gate; once it has passed the answer is read-only
            (the API refuses changes too) — correcting it goes through Backtrack. */}
        {locked && (
          <span className="c-tag as-lock" title="Withdraw the signature, or Backtrack, to change this answer">
            <LockOutlined /> Locked · {home.gateId}
          </span>
        )}
      </div>
      {locked ? (
        <div className="as-block">
          <p className="as-lock-note">
            {home.gateId} has passed or is signed. To change this answer, withdraw the signature or Backtrack.
          </p>
          <AssessmentRecord rows={readRows} />
          {protocolNotice}
          {areasDetails}
        </div>
      ) : (
        <ConfigProvider componentDisabled={false}>
          <div className="as-block">{body}</div>
        </ConfigProvider>
      )}
      {(dirty || blockingReason) && (
        <div className="as-foot">
          {blockingReason && dirty && <Notice tone="warn" title={blockingReason} />}
          <div className="rt-savebar">
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
