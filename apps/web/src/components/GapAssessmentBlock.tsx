import { Alert, DatePicker, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { GateRecord, RiskLevel } from '@mbc360/shared/types';
import { GAP_IMPACT_CATEGORIES, RISK_LEVELS } from '@mbc360/shared/types';
import UserSelect from './UserSelect';
import { TEXT } from '../theme/tokens';

// Round 4 question 3 (2026-08-24): the eight fields a gap must carry, shown inside
// the gate's own guidance row so the assessment sits next to the decision it
// governs rather than on a separate screen.
//
// Only rendered while the stage status is Gap. That is deliberate — these fields
// describe a gap, and a gate with no gap has nothing to assess, so showing them
// always would invite people to fill them in for gates that have no gap at all.
//
// What replaced what: this block used to be one red line reading "Gap — normal
// Proceed blocked". That sentence was the entire record of how serious a gap was,
// which is the gap question 3 closes: "Criticality is assessed by a suitably
// qualified reviewer, not decided informally during the gate-decision step."
export default function GapAssessmentBlock({
  gate,
  locked,
  onChange,
}: {
  gate: GateRecord;
  locked: boolean;
  onChange: (patch: Partial<GateRecord>) => void;
}) {
  const criticality = gate.gapCriticality ?? '';
  const graded = criticality !== '';

  // Question 3's own words for what each grade does, shown next to the choice so
  // the consequence is visible before someone picks it rather than after Save fails.
  const consequence: Record<RiskLevel, string> = {
    Critical: 'cannot be carried under any Proceed decision — the gate must go to Hold or Backtrack',
    // The disclosure at the end is deliberate: the rule asks for "a controlled
    // action AND due date", and a gap has no field for that date (question 3's own
    // field list does not include one). Saying so here beats enforcing the half we
    // can and reporting the rule as covered — the second of the two mistakes
    // CLAUDE.md records this project having already made [ASSUMPTION: R5-Q16].
    High: 'may be carried under Proceed with Conditions only, and only with a required action, an owner and the assessor recorded — put the action\'s due date in the action text for now, as there is no field for it yet',
    Medium: 'blocks a plain Proceed; Proceed with Conditions carries it',
    Low: 'blocks a plain Proceed; Proceed with Conditions carries it',
  };

  return (
    <div style={{ display: 'grid', gap: 6, padding: '6px 0' }}>
      {!graded ? (
        <Alert
          type="error"
          showIcon
          title="Gap not yet assessed — no Proceed decision is valid"
          description="A qualified reviewer must record how critical this gap is. Until then the gate can only go to Hold or Backtrack."
        />
      ) : (
        <div style={{ fontSize: 12, color: criticality === 'Critical' ? '#cf1322' : '#d48806' }}>
          Gap assessed <strong>{criticality}</strong> — {consequence[criticality as RiskLevel]}
        </div>
      )}

      {locked ? (
        <div style={{ fontSize: 12, color: TEXT.secondary }}>
          {criticality || '—'} · {gate.gapImpactCategory || '—'} · assessed by {gate.gapAssessor || '—'}
        </div>
      ) : (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
          <Space wrap>
            <Select
              style={{ width: 150 }}
              allowClear
              status={graded ? undefined : 'error'}
              placeholder="Criticality"
              value={gate.gapCriticality}
              options={RISK_LEVELS.map((o) => ({ value: o, label: o }))}
              onChange={(v?: RiskLevel) => onChange({ gapCriticality: v })}
            />
            <Select
              style={{ width: 160 }}
              allowClear
              placeholder="Impact category"
              value={gate.gapImpactCategory || undefined}
              options={GAP_IMPACT_CATEGORIES.map((o) => ({ value: o, label: o }))}
              onChange={(v?: string) => onChange({ gapImpactCategory: v ?? '' })}
            />
            <UserSelect
              style={{ width: 170 }}
              placeholder="Assessor"
              value={gate.gapAssessor}
              onChange={(v?: string) => onChange({ gapAssessor: v ?? '' })}
            />
            <DatePicker
              style={{ width: 140 }}
              value={gate.gapAssessmentDate ? dayjs(gate.gapAssessmentDate) : null}
              onChange={(d) => onChange({ gapAssessmentDate: d ? d.format('YYYY-MM-DD') : undefined })}
            />
          </Space>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Rationale"
            value={gate.gapRationale}
            onChange={(e) => onChange({ gapRationale: e.target.value })}
          />
          <Space wrap style={{ width: '100%' }}>
            <Input
              style={{ width: 260 }}
              placeholder="Required action"
              value={gate.gapRequiredAction}
              onChange={(e) => onChange({ gapRequiredAction: e.target.value })}
            />
            <UserSelect
              style={{ width: 170 }}
              placeholder="Action owner"
              value={gate.gapActionOwner}
              onChange={(v?: string) => onChange({ gapActionOwner: v ?? '' })}
            />
            <Input
              style={{ width: 200 }}
              placeholder="Evidence link"
              value={gate.gapEvidenceLink}
              onChange={(e) => onChange({ gapEvidenceLink: e.target.value })}
            />
          </Space>
        </Space>
      )}
    </div>
  );
}
