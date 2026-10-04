import type { ReactNode } from 'react';
import { ConfigProvider, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData } from '@mbc360/shared/types';
import {
  ADMINISTRATIVE_ONLY_OPTIONS,
  CHANGE_CONTROL_REQUIRED_OPTIONS,
  FAMILY_USE_AGE_GROUPS,
  HUMAN_STUDY_PLANNED_OPTIONS,
  SCALE_UP_RISK_OPTIONS,
  familyUseAgeGroupList,
} from '@mbc360/shared/types';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { ASSESSMENT_FIELDS, ASSESSMENT_HOMES, assessmentAnchor, type AssessmentKey } from '@mbc360/shared/config/assessments';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
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
const HINTS: Record<AssessmentKey, string> = {
  familyUse:
    'Decides the infant pathway at Gates 2, 4, 5, 6, 7, 8-9 and 10. Family use is not a vulnerable population on its own, but leaving this unanswered blocks the pathway from being decided either way. Including Infant 0+ activates it.',
  administrativeOnly: 'Gate 03. Only a confirmed Yes exempts the project from competitor and benchmark review.',
  humanStudy: 'Gate 08. Undecided blocks the gate.',
  scaleUp: 'Gate 09. Pending assessment blocks the gate. A Major formula change counts as identified on its own.',
  changeControl: 'Gate 12. Pending assessment blocks closure. An already-open change control counts as Yes on its own.',
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

export function isFamilyUseSelected(project: ProjectData): boolean {
  return (project.checklists['targetUsers'] ?? []).some((i) => i.selected && i.label === 'Family use');
}

export default function AssessmentBlock({ project, which }: { project: ProjectData; which: AssessmentKey }) {
  const setAssessments = useAppStore((s) => s.setAssessments);
  const keys = FIELDS[which];
  const { draft, dirty, update, markSaved, discard } = useDraft(pick(project.assessments, keys));
  const set = <K extends Field>(key: K, value: Assessments[K]) => update((prev) => ({ ...prev, [key]: value }));
  const home = ASSESSMENT_HOMES.find((h) => h.key === which)!;
  const locked = isGateRefLocked(project, home.gateId.slice(2));

  // Question 25(c): the family-use question exists only for a family-use
  // product — an always-visible unanswered field reads as an obligation, and
  // here blank means "not applicable", not "not done". Mirrors the
  // `infantContact` limb in evaluateTrigger.
  if (which === 'familyUse' && !isFamilyUseSelected(project)) return null;

  // Question 8: "If Yes, a valid Change Control record must be linked. If No, the
  // rationale and reviewer must be recorded." Both are enforced before Save so a
  // half-recorded answer never reaches the engine as though it were complete.
  const ccAnswer = draft.changeControlRequired?.trim() ?? '';
  const ccNeedsRecord = which === 'changeControl' && ccAnswer === 'Yes' && !draft.changeControlRecordId?.trim();
  const ccRecordUnknown =
    which === 'changeControl' &&
    !!draft.changeControlRecordId?.trim() &&
    !project.changes.some((c) => c.changeId === draft.changeControlRecordId?.trim());
  const ccNeedsRationale =
    which === 'changeControl' &&
    ccAnswer === 'No' &&
    (!draft.changeControlRationale?.trim() || !draft.changeControlReviewer?.trim());
  // Question 11: "The classification must be confirmed by an authorised
  // reviewer." An unconfirmed Yes is not an exemption.
  const adminNeedsConfirmer =
    which === 'administrativeOnly' &&
    (draft.administrativeOnly?.trim() ?? '') === 'Yes' &&
    !draft.administrativeOnlyConfirmedBy?.trim();

  const blockingReason = ccNeedsRecord
    ? 'Change Control required = Yes needs a linked Change Control record'
    : ccNeedsRationale
      ? 'Change Control required = No needs both a reviewer and a rationale'
      : adminNeedsConfirmer
        ? 'An administrative-only classification must name the authorised reviewer who confirmed it'
        : undefined;

  // Mirrors the `humanStudyPlanned` limb in evaluateTrigger — a started protocol
  // counts as Yes on its own. Read here only to say so on screen.
  const protocolStarted = (project.registers['studyProtocolSetup'] ?? []).some(
    (r) => String(r.plannedValue ?? '').trim() !== '',
  );

  const answerSelect = (field: Field, options: readonly string[]) => (
    <Select
      style={{ width: '100%' }}
      allowClear
      placeholder="Not yet assessed"
      value={draft[field] || undefined}
      options={options.map((o) => ({ value: o, label: o }))}
      onChange={(v?: string) => set(field, v ?? '')}
    />
  );
  const datePicker = (field: Field) => (
    <DatePicker
      style={{ width: '100%' }}
      value={draft[field] ? dayjs(draft[field]) : null}
      onChange={(d) => set(field, d ? d.format('YYYY-MM-DD') : '')}
    />
  );

  let body: ReactNode;
  switch (which) {
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
          <FieldBox label="Answer">{answerSelect('scaleUpRiskIdentified', SCALE_UP_RISK_OPTIONS)}</FieldBox>
          <FieldBox label="Assessor">
            <SelfAttestField
              value={draft.scaleUpRiskAssessor}
              onChange={(v) => set('scaleUpRiskAssessor', v)}
            />
          </FieldBox>
          <FieldBox label="Assessment date">{datePicker('scaleUpRiskAssessmentDate')}</FieldBox>
          <FieldBox label="Risk description" wide>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={draft.scaleUpRiskDescription}
              onChange={(e) => set('scaleUpRiskDescription', e.target.value)}
            />
          </FieldBox>
          <FieldBox label="Rationale" wide>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={draft.scaleUpRiskRationale}
              onChange={(e) => set('scaleUpRiskRationale', e.target.value)}
            />
          </FieldBox>
          <FieldBox label="Required pilot or scale-up activity">
            <Input value={draft.scaleUpRiskActivity} onChange={(e) => set('scaleUpRiskActivity', e.target.value)} />
          </FieldBox>
          <FieldBox label="Evidence link">
            <Input
              placeholder="link / folder"
              value={draft.scaleUpRiskEvidenceLink}
              onChange={(e) => set('scaleUpRiskEvidenceLink', e.target.value)}
            />
          </FieldBox>
        </div>
      );
      break;
    case 'changeControl':
      body = (
        <div className="as-grid">
          <FieldBox label="Answer">{answerSelect('changeControlRequired', CHANGE_CONTROL_REQUIRED_OPTIONS)}</FieldBox>
          <FieldBox label="Reviewer" required={ccAnswer === 'No'}>
            <SelfAttestField
              status={ccAnswer === 'No' && !draft.changeControlReviewer?.trim() ? 'error' : undefined}
              value={draft.changeControlReviewer}
              onChange={(v) => set('changeControlReviewer', v)}
            />
          </FieldBox>
          <FieldBox label="Review date">{datePicker('changeControlReviewDate')}</FieldBox>
          <FieldBox label="Rationale" wide required={ccAnswer === 'No'}>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              status={ccNeedsRationale && !draft.changeControlRationale?.trim() ? 'error' : undefined}
              value={draft.changeControlRationale}
              onChange={(e) => set('changeControlRationale', e.target.value)}
            />
          </FieldBox>
          <FieldBox label="Linked Change Control record" required={ccAnswer === 'Yes'}>
            {/* A picker over this project's change records, not a text box:
                question 8 asks for a VALID record, and the server refuses an id
                that is not one of them. */}
            <Select
              style={{ width: '100%' }}
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              popupMatchSelectWidth={false}
              status={ccNeedsRecord || ccRecordUnknown ? 'error' : undefined}
              placeholder={project.changes.length === 0 ? 'No change record on this project yet' : 'Required when Yes'}
              notFoundContent="Open one on the Change Control page first"
              value={draft.changeControlRecordId || undefined}
              options={[
                ...(ccRecordUnknown
                  ? [
                      {
                        value: draft.changeControlRecordId as string,
                        label: `${draft.changeControlRecordId} — not a change record of this project`,
                      },
                    ]
                  : []),
                ...project.changes.map((c) => ({
                  value: c.changeId,
                  label: `${c.changeId} — ${c.trigger || c.affectedArea || 'change'} · ${c.status}`,
                })),
              ]}
              onChange={(v?: string) => set('changeControlRecordId', v ?? '')}
            />
          </FieldBox>
          <FieldBox label="Evidence link">
            <Input
              placeholder="link / folder"
              value={draft.changeControlEvidenceLink}
              onChange={(e) => set('changeControlEvidenceLink', e.target.value)}
            />
          </FieldBox>
        </div>
      );
      break;
  }

  return (
    <section className="c-card as-card" id={assessmentAnchor(which)}>
      <div className="as-head">
        <div className="as-kicker">Assessment</div>
        <h2 className="as-title">{home.title}</h2>
        <p className="as-desc">{HINTS[which]}</p>
      </div>
      {/* C9: answered at this gate; once it has passed the answer is read-only
          (the API refuses changes too) — correcting it goes through Backtrack. */}
      {locked && <Notice tone="info" title={`${home.gateId} has passed — this answer is read-only (use Backtrack to change it)`} />}
      <ConfigProvider componentDisabled={locked}>
        <div className="as-block">{body}</div>
      </ConfigProvider>
      {(dirty || blockingReason) && (
        <div className="as-foot">
          {blockingReason && dirty && <Notice tone="warn" title={blockingReason} />}
          <div className="rt-savebar">
            <div>
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
        </div>
      )}
    </section>
  );
}
