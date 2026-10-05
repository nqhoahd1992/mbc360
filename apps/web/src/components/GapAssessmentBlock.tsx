import { DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { GateRecord, RiskLevel } from '@mbc360/shared/types';
import { GAP_IMPACT_CATEGORIES, RISK_LEVELS } from '@mbc360/shared/types';
import { gapBlocksDecision } from '@mbc360/shared/utils/gapCriticality';
import SelfAttestField from './SelfAttestField';
import UserSelect from './UserSelect';
import '../styles/concept.css';
import './GapAssessmentBlock.css';

// Round 4 question 3 (2026-08-24): the eight fields a gap must carry, shown inside
// the gate's own guidance row so the assessment sits next to the decision it
// governs rather than on a separate screen.
//
// Rendered while the stage status is Gap, and also while a Critical or High grade
// stands after the status has moved on — clearing the grade is how a gap is
// closed, and hiding the block would leave the gate blocked with no field to fix.
//
// What replaced what: this block used to be one red line reading "Gap — normal
// Proceed blocked". That sentence was the entire record of how serious a gap was,
// which is the gap question 3 closes: "Criticality is assessed by a suitably
// qualified reviewer, not decided informally during the gate-decision step."
//
// Rebuilt 2026-10-05 after a review of the screen. It was eight controls with no
// label at all — once filled, "High / Safety / 2026-10-05" no longer said which
// field was which — at six hard-coded widths, with no container or heading, while
// every other group on the page is a titled block on a labelled grid.
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

  // Which fields still stand between this gap and a Proceed with Conditions, read
  // from the SAME function the API guard uses rather than a second list here —
  // the two cannot drift, and a field marked required on screen is exactly one
  // the server would name. Empty for Critical, which no Proceed can carry at all.
  const missing = graded ? (gapBlocksDecision(gate, 'Proceed with Conditions')?.missing ?? []) : [];
  const needs = (label: string) => missing.some((m) => m.includes(label));

  const state = !graded
    ? { tone: 'gap-state-open', text: 'Not yet assessed — a qualified reviewer must record how critical this gap is. Until then the gate can only go to Hold or Backtrack.' }
    : criticality === 'Critical'
      ? { tone: 'gap-state-critical', text: `Assessed Critical — ${consequence.Critical}.` }
      : { tone: '', text: `Assessed ${criticality} — ${consequence[criticality as RiskLevel]}.` };

  return (
    <section className="gap">
      <div className="gap-head">
        <div className="gap-head-main">
          <span className="gap-title">Gap assessment</span>
          <span className={`gap-state ${state.tone}`}>{state.text}</span>
        </div>
      </div>

      {locked ? (
        <div className="gap-locked gap-static">
          {criticality || '—'} · {gate.gapImpactCategory || '—'} · assessed by {gate.gapAssessor || '—'}
        </div>
      ) : (
        <div className="gap-body">
          <div className="gap-grid">
            <label className="gap-fld">
              <span className="gap-label">
                Criticality{!graded && <span className="gap-req"> · required</span>}
              </span>
              <Select
                allowClear
                status={graded ? undefined : 'error'}
                placeholder="Select a level"
                value={gate.gapCriticality}
                options={RISK_LEVELS.map((o) => ({ value: o, label: o }))}
                // Cleared as '' rather than undefined: undefined is dropped by
                // JSON.stringify, so a cleared grade never reached the server and
                // came back on reload. The API stores '' as NULL.
                onChange={(v?: RiskLevel) => onChange({ gapCriticality: v ?? ('' as RiskLevel) })}
              />
            </label>

            <label className="gap-fld">
              <span className="gap-label">Impact category</span>
              <Select
                allowClear
                placeholder="Select a category"
                value={gate.gapImpactCategory || undefined}
                options={GAP_IMPACT_CATEGORIES.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => onChange({ gapImpactCategory: v ?? '' })}
              />
            </label>

            <div className="gap-fld">
              <span className="gap-label">
                Assessor{needs('assessor') && <span className="gap-req"> · required</span>}
              </span>
              {/* C6: the assessor is whoever records the assessment. */}
              <div className="gap-assessor">
                <SelfAttestField value={gate.gapAssessor} disabled={locked} onChange={(v) => onChange({ gapAssessor: v })} />
              </div>
            </div>

            <label className="gap-fld">
              <span className="gap-label">Assessment date</span>
              <DatePicker
                value={gate.gapAssessmentDate ? dayjs(gate.gapAssessmentDate) : null}
                onChange={(d) => onChange({ gapAssessmentDate: d ? d.format('YYYY-MM-DD') : '' })}
              />
            </label>

            <label className="gap-fld gap-wide">
              <span className="gap-label">Rationale</span>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder="Why this gap carries the criticality recorded above"
                value={gate.gapRationale}
                onChange={(e) => onChange({ gapRationale: e.target.value })}
              />
            </label>

            <label className="gap-fld gap-wide">
              <span className="gap-label">
                Required action{needs('required action') && <span className="gap-req"> · required</span>}
              </span>
              <Input
                placeholder="What has to happen about this gap"
                value={gate.gapRequiredAction}
                onChange={(e) => onChange({ gapRequiredAction: e.target.value })}
              />
            </label>

            <label className="gap-fld">
              <span className="gap-label">
                Action owner{needs('action owner') && <span className="gap-req"> · required</span>}
              </span>
              <UserSelect
                placeholder="Select a person"
                value={gate.gapActionOwner}
                onChange={(v?: string) => onChange({ gapActionOwner: v ?? '' })}
              />
            </label>

            <label className="gap-fld">
              <span className="gap-label">Evidence link</span>
              <Input
                placeholder="Link to the evidence"
                value={gate.gapEvidenceLink}
                onChange={(e) => onChange({ gapEvidenceLink: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
