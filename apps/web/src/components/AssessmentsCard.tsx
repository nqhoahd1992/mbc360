import { DatePicker, Input, Select } from 'antd';
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
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import Notice from './Notice';
import '../styles/concept.css';
import './DynamicTable.css';
import './AssessmentsCard.css';

// The explicit assessments Round 4 questions 8, 9, 11, 12 and 25(c) asked for
// (2026-08-24). They sit on one card because they share a purpose rather than a
// gate: each records a judgement the app used to infer, so that "nobody has
// decided yet" becomes visible instead of silently passing a gate.
//
// Every field starts EMPTY on purpose. Empty is not a missing value here — it is
// the answer "not yet assessed", which blocks the Conditional item that reads it.
// That is question 7's rule, and it is why nothing on this card has a default.

type Assessments = ProjectData['assessments'];

// One assessment: its question and the gate it feeds — shown next to it so the
// cost of leaving it blank is on screen rather than discoverable only from the
// readiness panel — then its answer and follow-up fields in a labelled grid.
function Block({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="as-block">
      <div className="as-block-head">
        <div className="as-block-title">{label}</div>
        <div className="as-block-hint">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  wide,
  required,
  children,
}: {
  label: string;
  wide?: boolean;
  // Marks a field the current answer makes mandatory (the Save guard below).
  required?: boolean;
  children: React.ReactNode;
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

export default function AssessmentsCard({ project }: { project: ProjectData }) {
  const setAssessments = useAppStore((s) => s.setAssessments);
  const { draft, dirty, update, markSaved, discard } = useDraft(project.assessments);

  const set = <K extends keyof Assessments>(key: K, value: Assessments[K]) =>
    update((prev) => ({ ...prev, [key]: value }));

  // Mirrors the `humanStudyPlanned` limb in evaluateTrigger — a started protocol
  // counts as Yes on its own. Read here only to say so on screen; the engine does
  // not depend on this.
  const protocolStarted = (project.registers['studyProtocolSetup'] ?? []).some(
    (r) => String(r.plannedValue ?? '').trim() !== '',
  );

  // Question 25(c): the family-use question exists only for a family-use product,
  // and mirrors the `infantContact` limb in evaluateTrigger.
  const familyUseSelected = (project.checklists['targetUsers'] ?? []).some(
    (i) => i.selected && i.label === 'Family use',
  );
  const familyGroups = familyUseAgeGroupList(draft);

  // Question 8: "If Yes, a valid Change Control record must be linked. If No, the
  // rationale and reviewer must be recorded." Both are enforced before Save
  // rather than after, so a half-recorded answer never reaches the engine — which
  // would read it as a complete one.
  const ccAnswer = draft.changeControlRequired?.trim() ?? '';
  const ccNeedsRecord = ccAnswer === 'Yes' && !draft.changeControlRecordId?.trim();
  const projectChanges = project.changes;
  const ccRecordUnknown =
    !!draft.changeControlRecordId?.trim() && !projectChanges.some((c) => c.changeId === draft.changeControlRecordId?.trim());
  const ccNeedsRationale =
    ccAnswer === 'No' && (!draft.changeControlRationale?.trim() || !draft.changeControlReviewer?.trim());

  // Question 11: "The classification must be confirmed by an authorised
  // reviewer." An unconfirmed Yes is not an exemption, so it must not be savable
  // as though it were.
  const adminNeedsConfirmer =
    (draft.administrativeOnly?.trim() ?? '') === 'Yes' && !draft.administrativeOnlyConfirmedBy?.trim();

  const blockingReason = ccNeedsRecord
    ? 'Change Control required = Yes needs a linked Change Control record'
    : ccNeedsRationale
      ? 'Change Control required = No needs both a reviewer and a rationale'
      : adminNeedsConfirmer
        ? 'An administrative-only classification must name the authorised reviewer who confirmed it'
        : undefined;

  return (
    <section className="c-card as-card">
      <div className="as-head">
        <h2 className="as-title">Assessments</h2>
        <p className="as-desc">
          Four judgements the review team asked to be recorded rather than inferred. Leaving one blank does not mean it
          does not apply — it means it has not been assessed, and the gate that reads it stays blocked.
        </p>
      </div>

      <div className="as-blocks">
        <Block label="Human-participant study planned?" hint="Gate 08. Undecided blocks the gate.">
          <div className="as-grid">
            <Field label="Answer">
              <Select
                style={{ width: '100%' }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.humanStudyPlanned || undefined}
                options={HUMAN_STUDY_PLANNED_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('humanStudyPlanned', v ?? '')}
              />
            </Field>
          </div>
          {/* "Creating a Study Protocol automatically sets the answer to Yes."
              The engine already treats a started protocol as Yes, but the field
              itself stays as the person left it — so without this line the card
              would show blank while Gate 8 behaves as though it said Yes, which
              reads as a bug rather than a rule. */}
          {protocolStarted && (
            <Notice
              tone="info"
              title="A Study Protocol has been started, so this already counts as Yes whatever is selected here."
            />
          )}
        </Block>

        <Block
          label="Administrative-only change?"
          hint="Gate 03. Only a confirmed Yes exempts the project from competitor and benchmark review."
        >
          <div className="as-grid">
            <Field label="Answer">
              <Select
                style={{ width: '100%' }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.administrativeOnly || undefined}
                options={ADMINISTRATIVE_ONLY_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('administrativeOnly', v ?? '')}
              />
            </Field>
            <Field label="Confirmed by (authorised reviewer)" required={adminNeedsConfirmer}>
              <UserSelect
                style={{ width: '100%' }}
                status={adminNeedsConfirmer && !draft.administrativeOnlyConfirmedBy?.trim() ? 'error' : undefined}
                value={draft.administrativeOnlyConfirmedBy}
                onChange={(v?: string) => set('administrativeOnlyConfirmedBy', v ?? '')}
              />
            </Field>
          </div>
        </Block>

        {/* Round 4 question 25(c), 2026-08-29. Only shown when it is actually
            being asked — this is not a field every project has to answer, it is a
            question that "Family use" raises. Hiding it elsewhere is deliberate:
            an always-visible unanswered field reads as an obligation, and here
            blank means "not applicable", not "not done". */}
        {familyUseSelected && (
          <Block
            label="Family use — which age groups does this product include?"
            hint="Gates 2, 4, 5, 6, 7, 8-9 and 10. Family use is not a vulnerable population on its own, but leaving this unanswered blocks the infant pathway from being decided either way. Including Infant 0+ activates it."
          >
            <div className="as-grid">
              <Field label="Age groups included" wide>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  allowClear
                  placeholder="Not yet confirmed"
                  value={familyGroups}
                  options={FAMILY_USE_AGE_GROUPS.map((o) => ({ value: o, label: o }))}
                  onChange={(v: string[]) => set('familyUseAgeGroups', v.join(', '))}
                />
              </Field>
              <Field label="Confirmed by">
                <UserSelect
                  style={{ width: '100%' }}
                  value={draft.familyUseConfirmedBy}
                  onChange={(v?: string) => set('familyUseConfirmedBy', v ?? '')}
                />
              </Field>
              <Field label="Confirmed on">
                <DatePicker
                  style={{ width: '100%' }}
                  value={draft.familyUseConfirmedDate ? dayjs(draft.familyUseConfirmedDate) : null}
                  onChange={(d) => set('familyUseConfirmedDate', d ? d.format('YYYY-MM-DD') : '')}
                />
              </Field>
            </div>
          </Block>
        )}

        <Block
          label="Scale-up risk identified?"
          hint="Gate 09. Pending assessment blocks the gate. A Major formula change counts as identified on its own."
        >
          <div className="as-grid">
            <Field label="Answer">
              <Select
                style={{ width: '100%' }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.scaleUpRiskIdentified || undefined}
                options={SCALE_UP_RISK_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('scaleUpRiskIdentified', v ?? '')}
              />
            </Field>
            <Field label="Assessor">
              <UserSelect
                style={{ width: '100%' }}
                value={draft.scaleUpRiskAssessor}
                onChange={(v?: string) => set('scaleUpRiskAssessor', v ?? '')}
              />
            </Field>
            <Field label="Assessment date">
              <DatePicker
                style={{ width: '100%' }}
                value={draft.scaleUpRiskAssessmentDate ? dayjs(draft.scaleUpRiskAssessmentDate) : null}
                onChange={(d) => set('scaleUpRiskAssessmentDate', d ? d.format('YYYY-MM-DD') : '')}
              />
            </Field>
            <Field label="Risk description" wide>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={draft.scaleUpRiskDescription}
                onChange={(e) => set('scaleUpRiskDescription', e.target.value)}
              />
            </Field>
            <Field label="Rationale" wide>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={draft.scaleUpRiskRationale}
                onChange={(e) => set('scaleUpRiskRationale', e.target.value)}
              />
            </Field>
            <Field label="Required pilot or scale-up activity">
              <Input
                value={draft.scaleUpRiskActivity}
                onChange={(e) => set('scaleUpRiskActivity', e.target.value)}
              />
            </Field>
            <Field label="Evidence link">
              <Input
                placeholder="link / folder"
                value={draft.scaleUpRiskEvidenceLink}
                onChange={(e) => set('scaleUpRiskEvidenceLink', e.target.value)}
              />
            </Field>
          </div>
        </Block>

        <Block
          label="Change Control required for the post-market finding?"
          hint="Gate 12. Pending assessment blocks closure. An already-open change control counts as Yes on its own."
        >
          <div className="as-grid">
            <Field label="Answer">
              <Select
                style={{ width: '100%' }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.changeControlRequired || undefined}
                options={CHANGE_CONTROL_REQUIRED_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('changeControlRequired', v ?? '')}
              />
            </Field>
            <Field label="Reviewer" required={ccAnswer === 'No'}>
              <UserSelect
                style={{ width: '100%' }}
                status={ccAnswer === 'No' && !draft.changeControlReviewer?.trim() ? 'error' : undefined}
                value={draft.changeControlReviewer}
                onChange={(v?: string) => set('changeControlReviewer', v ?? '')}
              />
            </Field>
            <Field label="Review date">
              <DatePicker
                style={{ width: '100%' }}
                value={draft.changeControlReviewDate ? dayjs(draft.changeControlReviewDate) : null}
                onChange={(d) => set('changeControlReviewDate', d ? d.format('YYYY-MM-DD') : '')}
              />
            </Field>
            <Field label="Rationale" wide required={ccAnswer === 'No'}>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                status={ccNeedsRationale && !draft.changeControlRationale?.trim() ? 'error' : undefined}
                value={draft.changeControlRationale}
                onChange={(e) => set('changeControlRationale', e.target.value)}
              />
            </Field>
            <Field label="Linked Change Control record" required={ccAnswer === 'Yes'}>
              {/* A picker over this project's change records, not a text box:
                  question 8 asks for a VALID record, and the server now refuses
                  an id that is not one of them. */}
              <Select
                style={{ width: '100%' }}
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                popupMatchSelectWidth={false}
                status={ccNeedsRecord || ccRecordUnknown ? 'error' : undefined}
                placeholder={projectChanges.length === 0 ? 'No change record on this project yet' : 'Required when Yes'}
                notFoundContent="Open one on the Change Control page first"
                value={draft.changeControlRecordId || undefined}
                options={[
                  ...(ccRecordUnknown
                    ? [{ value: draft.changeControlRecordId as string, label: `${draft.changeControlRecordId} — not a change record of this project` }]
                    : []),
                  ...projectChanges.map((c) => ({
                    value: c.changeId,
                    label: `${c.changeId} — ${c.trigger || c.affectedArea || 'change'} · ${c.status}`,
                  })),
                ]}
                onChange={(v?: string) => set('changeControlRecordId', v ?? '')}
              />
            </Field>
            <Field label="Evidence link">
              <Input
                placeholder="link / folder"
                value={draft.changeControlEvidenceLink}
                onChange={(e) => set('changeControlEvidenceLink', e.target.value)}
              />
            </Field>
          </div>
        </Block>
      </div>

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
