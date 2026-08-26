import { Alert, Card, DatePicker, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData } from '@mbc360/shared/types';
import {
  ADMINISTRATIVE_ONLY_OPTIONS,
  CHANGE_CONTROL_REQUIRED_OPTIONS,
  HUMAN_STUDY_PLANNED_OPTIONS,
  SCALE_UP_RISK_OPTIONS,
} from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import { TEXT } from '../theme/tokens';

// The four explicit assessments Round 4 questions 8, 9, 11 and 12 asked for
// (2026-08-24). They sit on one card because they share a purpose rather than a
// gate: each records a judgement the app used to infer, so that "nobody has
// decided yet" becomes visible instead of silently passing a gate.
//
// Every field starts EMPTY on purpose. Empty is not a missing value here — it is
// the answer "not yet assessed", which blocks the Conditional item that reads it.
// That is question 7's rule, and it is why nothing on this card has a default.

type Assessments = ProjectData['assessments'];

// The gate each answer feeds, shown next to it so the cost of leaving it blank is
// on screen rather than discoverable only from the readiness panel.
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{label}</div>
      {children}
      <div style={{ fontSize: 11, color: TEXT.secondary, marginTop: 4 }}>{hint}</div>
    </div>
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

  // Question 8: "If Yes, a valid Change Control record must be linked. If No, the
  // rationale and reviewer must be recorded." Both are enforced before Save
  // rather than after, so a half-recorded answer never reaches the engine — which
  // would read it as a complete one.
  const ccAnswer = draft.changeControlRequired?.trim() ?? '';
  const ccNeedsRecord = ccAnswer === 'Yes' && !draft.changeControlRecordId?.trim();
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
    <Card size="small" title="Assessments">
      <div style={{ color: TEXT.secondary, fontSize: 12, marginBottom: 12 }}>
        Four judgements the review team asked to be recorded rather than inferred. Leaving one blank does not mean it
        does not apply — it means it has not been assessed, and the gate that reads it stays blocked.
      </div>

      <Space orientation="vertical" style={{ width: '100%' }} size={14}>
        <Field
          label="Human-participant study planned?"
          hint="Gate 08. Undecided blocks the gate."
        >
          <Space orientation="vertical" style={{ width: '100%' }} size={6}>
            <Select
              style={{ width: 280 }}
              allowClear
              placeholder="Not yet assessed"
              value={draft.humanStudyPlanned || undefined}
              options={HUMAN_STUDY_PLANNED_OPTIONS.map((o) => ({ value: o, label: o }))}
              onChange={(v?: string) => set('humanStudyPlanned', v ?? '')}
            />
            {/* "Creating a Study Protocol automatically sets the answer to Yes."
                The engine already treats a started protocol as Yes, but the field
                itself stays as the person left it — so without this line the card
                would show blank while Gate 8 behaves as though it said Yes, which
                reads as a bug rather than a rule. */}
            {protocolStarted && (
              <Alert
                type="info"
                showIcon
                title="A Study Protocol has been started, so this already counts as Yes whatever is selected here."
              />
            )}
          </Space>
        </Field>

        <Field
          label="Administrative-only change?"
          hint="Gate 03. Only a confirmed Yes exempts the project from competitor and benchmark review."
        >
          <Space wrap>
            <Select
              style={{ width: 160 }}
              allowClear
              placeholder="Not yet assessed"
              value={draft.administrativeOnly || undefined}
              options={ADMINISTRATIVE_ONLY_OPTIONS.map((o) => ({ value: o, label: o }))}
              onChange={(v?: string) => set('administrativeOnly', v ?? '')}
            />
            <UserSelect
              style={{ width: 220 }}
              placeholder="Confirmed by (authorised reviewer)"
              value={draft.administrativeOnlyConfirmedBy}
              onChange={(v?: string) => set('administrativeOnlyConfirmedBy', v ?? '')}
            />
          </Space>
        </Field>

        <Field
          label="Scale-up risk identified?"
          hint="Gate 09. Pending assessment blocks the gate. A Major formula change counts as identified on its own."
        >
          <Space orientation="vertical" style={{ width: '100%' }} size={6}>
            <Space wrap>
              <Select
                style={{ width: 200 }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.scaleUpRiskIdentified || undefined}
                options={SCALE_UP_RISK_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('scaleUpRiskIdentified', v ?? '')}
              />
              <UserSelect
                style={{ width: 200 }}
                placeholder="Assessor"
                value={draft.scaleUpRiskAssessor}
                onChange={(v?: string) => set('scaleUpRiskAssessor', v ?? '')}
              />
              <DatePicker
                style={{ width: 150 }}
                value={draft.scaleUpRiskAssessmentDate ? dayjs(draft.scaleUpRiskAssessmentDate) : null}
                onChange={(d) => set('scaleUpRiskAssessmentDate', d ? d.format('YYYY-MM-DD') : '')}
              />
            </Space>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="Risk description"
              value={draft.scaleUpRiskDescription}
              onChange={(e) => set('scaleUpRiskDescription', e.target.value)}
            />
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="Rationale"
              value={draft.scaleUpRiskRationale}
              onChange={(e) => set('scaleUpRiskRationale', e.target.value)}
            />
            <Space wrap style={{ width: '100%' }}>
              <Input
                style={{ width: 280 }}
                placeholder="Required pilot or scale-up activity"
                value={draft.scaleUpRiskActivity}
                onChange={(e) => set('scaleUpRiskActivity', e.target.value)}
              />
              <Input
                style={{ width: 220 }}
                placeholder="Evidence link"
                value={draft.scaleUpRiskEvidenceLink}
                onChange={(e) => set('scaleUpRiskEvidenceLink', e.target.value)}
              />
            </Space>
          </Space>
        </Field>

        <Field
          label="Change Control required for the post-market finding?"
          hint="Gate 12. Pending assessment blocks closure. An already-open change control counts as Yes on its own."
        >
          <Space orientation="vertical" style={{ width: '100%' }} size={6}>
            <Space wrap>
              <Select
                style={{ width: 200 }}
                allowClear
                placeholder="Not yet assessed"
                value={draft.changeControlRequired || undefined}
                options={CHANGE_CONTROL_REQUIRED_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => set('changeControlRequired', v ?? '')}
              />
              <UserSelect
                style={{ width: 200 }}
                placeholder="Reviewer"
                value={draft.changeControlReviewer}
                onChange={(v?: string) => set('changeControlReviewer', v ?? '')}
              />
              <DatePicker
                style={{ width: 150 }}
                value={draft.changeControlReviewDate ? dayjs(draft.changeControlReviewDate) : null}
                onChange={(d) => set('changeControlReviewDate', d ? d.format('YYYY-MM-DD') : '')}
              />
            </Space>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="Rationale"
              value={draft.changeControlRationale}
              onChange={(e) => set('changeControlRationale', e.target.value)}
            />
            <Space wrap>
              <Input
                style={{ width: 280 }}
                status={ccNeedsRecord ? 'error' : undefined}
                placeholder="Linked Change Control ID (required when Yes)"
                value={draft.changeControlRecordId}
                onChange={(e) => set('changeControlRecordId', e.target.value)}
              />
              <Input
                style={{ width: 220 }}
                placeholder="Evidence link"
                value={draft.changeControlEvidenceLink}
                onChange={(e) => set('changeControlEvidenceLink', e.target.value)}
              />
            </Space>
          </Space>
        </Field>
      </Space>

      {blockingReason && dirty && <Alert type="warning" showIcon style={{ marginTop: 12 }} title={blockingReason} />}

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
    </Card>
  );
}
