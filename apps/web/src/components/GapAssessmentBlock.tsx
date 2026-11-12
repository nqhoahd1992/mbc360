import { useState } from 'react';
import { Button, DatePicker, Input, Radio, Select, Tooltip, message } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import StopProjectAction from './StopProjectAction';
import ChoiceSelect from './ChoiceSelect';
import dayjs from 'dayjs';
import type { GateRecord, NextAction, RiskLevel } from '@mbc360/shared/types';
import { GAP_IMPACT_CATEGORIES, RISK_LEVELS } from '@mbc360/shared/types';
import { gapBlocksDecision, gapResolveMissing, isGapResolved } from '@mbc360/shared/utils/gapCriticality';
import SelfAttestField from './SelfAttestField';
import NextActionSelect from './NextActionSelect';
import { controlledActionGaps } from '@mbc360/shared/utils/controlledActions';
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
const NO_ACTIONS: NextAction[] = [];

export default function GapAssessmentBlock({
  gate,
  locked: lockedByGate,
  onChange,
}: {
  gate: GateRecord;
  locked: boolean;
  onChange: (patch: Partial<GateRecord>) => void;
}) {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  // What the server will check is the SAVED record; the grade on screen may not be saved yet.
  const savedGrade = project?.gates.find((g) => g.gateId === gate.gateId)?.gapCriticality ?? '';
  const criticality = gate.gapCriticality ?? '';
  const graded = criticality !== '';

  // SW-39: Resolve keeps the assessment and adds who resolved the gap and when. The button reads the SAVED record (what the server checks),
  // is disabled until every condition holds, and the fields lock once the gap is resolved (a gate back at status Gap drops the resolution).
  const resolveGap = useAppStore((s) => s.resolveGap);
  const [resolving, setResolving] = useState(false);
  const savedGate = project?.gates.find((g) => g.gateId === gate.gateId);
  const resolved = !!savedGate && isGapResolved(savedGate);
  const resolveMissing = savedGate ? gapResolveMissing(savedGate) : ['a saved gate record'];
  const locked = lockedByGate || resolved;
  // How the gap will be handled. It is a UI guide only - nothing is stored for it: the fields that exist already say which path was taken
  // (a resolution/evidence means "resolve", a linked Next Action means "carry"), so the default is read from them and a person can switch freely
  // without losing what they typed in the other path.
  const [path, setPath] = useState<'resolve' | 'carry' | undefined>();
  const derivedPath: 'resolve' | 'carry' | undefined =
    (gate.gapResolution ?? '').trim() !== '' || (gate.gapEvidenceLink ?? '').trim() !== ''
      ? 'resolve'
      : (gate.gapLinkedNextActionId ?? '') !== ''
        ? 'carry'
        : undefined;
  // A Critical gap cannot be carried at all, so the only way forward on it is to resolve it.
  const chosen: 'resolve' | 'carry' | undefined = resolved || criticality === 'Critical' ? 'resolve' : (path ?? derivedPath);
  const onResolve = async () => {
    if (!projectId) return;
    setResolving(true);
    try {
      const ok = await resolveGap(projectId, gate.gateId);
      if (ok) message.success('Gap resolved — the assessment stays on the record');
    } finally {
      setResolving(false);
    }
  };

  // Question 3's own words for what each grade does, shown next to the choice so
  // the consequence is visible before someone picks it rather than after Save fails.
  const consequence: Record<RiskLevel, string> = {
    Critical: 'cannot be carried under any Proceed decision — the gate must go to Hold or Backtrack',
    // Round 5 question 9: the action is a tracked Next Action, so owner and date live there. [ASSUMPTION: R6-Q15]
    High: 'may be carried under Proceed with Conditions only, with the assessor recorded and a tracked Next Action that has an owner, a due date, completion criteria and an escalation trigger',
    Medium: 'is either resolved before signing (record the resolution and its evidence) or carried under Proceed with Conditions by a tracked Next Action',
    Low: 'is either resolved before signing (record the resolution and its evidence) or carried under Proceed with Conditions by a tracked Next Action',
  };

  // Which fields still stand between this gap and a Proceed with Conditions, read
  // from the SAME function the API guard uses rather than a second list here —
  // the two cannot drift, and a field marked required on screen is exactly one
  // the server would name. Empty for Critical, which no Proceed can carry at all.
  const nextActions = project?.nextActions ?? NO_ACTIONS;
  const missing = graded ? (gapBlocksDecision(gate, 'Proceed with Conditions', nextActions)?.missing ?? []) : [];
  const needs = (label: string) => missing.some((m) => m.includes(label));
  const linked = nextActions.find((a) => a.id === (gate.gapLinkedNextActionId ?? ''));
  const linkedGaps = linked ? controlledActionGaps(linked) : [];
  const hasLegacy = (gate.gapRequiredAction ?? '').trim() !== '' || (gate.gapActionOwner ?? '').trim() !== '';

  const state = !graded
    ? { tone: 'gap-state-open', text: 'Not yet assessed — a qualified reviewer must record how critical this gap is. Until then the gate can only go to Hold or Backtrack.' }
    : criticality === 'Critical'
      ? { tone: 'gap-state-critical', text: `Assessed Critical — ${consequence.Critical}.` }
      : {
          tone: '',
          text: `Assessed ${criticality} — ${consequence[criticality as RiskLevel]}.${
            gate.status === 'Gap'
              ? ' A gate cannot be signed while its Stage status is Gap: to carry this gap, set Stage status to Complete (the assessment stays recorded), link the Next Action, then the approver signs Proceed with Conditions.'
              : ''
          }`,
        };

  return (
    <section className="gap">
      <div className="gap-head">
        <div className="gap-head-main">
          <span className="gap-title">Gap assessment</span>
          <span className={`gap-state ${state.tone}`}>
            {state.text}
            {criticality === 'Critical' && ' If the project cannot go on, it can be stopped instead (final).'}
          </span>
          {/* SW-31: a Critical gap is the one condition under which the project may be stopped. Only the project Lead or
              an administrator sees the button; it is disabled until the Critical grade is saved. */}
          {criticality === 'Critical' && project && <StopProjectAction project={project} unsaved={savedGrade !== 'Critical'} />}
        </div>
      </div>

      <div className="gap-body">
        <p className="gap-note" style={{ margin: '0 0 12px' }}>
          Nothing here stops you saving. Grade the gap first; then say how it will be handled and only the fields for that way appear.
        </p>
        <div className="gap-grid">
          <label className="gap-fld">
            <span className="gap-label">
              Criticality{!graded && <span className="gap-req"> · step 1 — grade the gap, or the gate cannot proceed</span>}
            </span>
            <ChoiceSelect
              allowClear
              disabled={locked}
              status={graded ? undefined : 'error'}
              placeholder="Select a level"
              value={gate.gapCriticality}
              options={[...RISK_LEVELS]}
              // Cleared as '' rather than undefined: undefined is dropped by
              // JSON.stringify, so a cleared grade never reached the server and
              // came back on reload. The API stores '' as NULL.
              onChange={(v) => onChange({ gapCriticality: (v ?? '') as RiskLevel })}
              maxButtons={0}
            />
          </label>

          {graded && (
            <>
              <label className="gap-fld">
                <span className="gap-label">Impact category</span>
                <Select
                  allowClear
                  disabled={locked}
                  placeholder="Select a category"
                  value={gate.gapImpactCategory || undefined}
                  options={GAP_IMPACT_CATEGORIES.map((o) => ({ value: o, label: o }))}
                  onChange={(v?: string) => onChange({ gapImpactCategory: v ?? '' })}
                />
              </label>

              <div className="gap-fld">
                <span className="gap-label">
                  Assessor{!resolved && !gate.gapAssessor && <span className="gap-req"> · needed to carry or resolve the gap</span>}
                </span>
                {/* C6: the assessor is whoever records the assessment. */}
                <div className="gap-assessor">
                  <SelfAttestField value={gate.gapAssessor} disabled={locked} onChange={(v) => onChange({ gapAssessor: v })} />
                </div>
              </div>

              <label className="gap-fld">
                <span className="gap-label">Assessment date</span>
                <DatePicker
                  disabled={locked}
                  value={gate.gapAssessmentDate ? dayjs(gate.gapAssessmentDate) : null}
                  onChange={(d) => onChange({ gapAssessmentDate: d ? d.format('YYYY-MM-DD') : '' })}
                />
              </label>

              <label className="gap-fld gap-wide">
                <span className="gap-label">Rationale</span>
                <Input.TextArea
                  disabled={locked}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  placeholder="Why this gap carries the criticality recorded above"
                  value={gate.gapRationale}
                  onChange={(e) => onChange({ gapRationale: e.target.value })}
                />
              </label>

              {!resolved && (
                <div className="gap-fld gap-wide">
                  <span className="gap-label">Step 2 — how will this gap be handled?</span>
                  <Radio.Group
                    disabled={lockedByGate}
                    value={chosen}
                    onChange={(e) => setPath(e.target.value)}
                    style={{ display: 'grid', gap: 8 }}
                  >
                    <Radio value="resolve">
                      <strong>Resolve it now</strong> — the gap is already fixed. Record how and the evidence, then press Resolve; the gate can go on as a normal Proceed.
                    </Radio>
                    <Tooltip title={criticality === 'Critical' ? 'A Critical gap cannot be carried under any Proceed decision' : ''}>
                      <span>
                        <Radio value="carry" disabled={criticality === 'Critical'}>
                          <strong>Carry it</strong> — fix it later. A tracked Next Action owns the fix; the gate is signed as Proceed with Conditions.
                        </Radio>
                      </span>
                    </Tooltip>
                  </Radio.Group>
                  {criticality === 'Critical' && (
                    <span className="gap-note">A Critical gap has one way forward: resolve it (or Hold / Backtrack / stop the project).</span>
                  )}
                  {!chosen && <span className="gap-note">Choose one to see what it needs.</span>}
                </div>
              )}

              {chosen === 'carry' && !resolved && (
                <div className="gap-fld gap-wide">
                  <span className="gap-label">
                    Tracked Next Action{needs('Next Action') && <span className="gap-req"> · needed to carry the gap</span>}
                  </span>
                  <NextActionSelect
                    disabled={locked}
                    value={gate.gapLinkedNextActionId || undefined}
                    onChange={(v) => onChange({ gapLinkedNextActionId: v ?? '' })}
                  />
                  {/* The gap shows the action's owner and date instead of keeping its own copies (Round 5 question 9). */}
                  {linked ? (
                    <span className="gap-note">
                      Owner {linked.owner || '—'} · due {linked.dueDate || '—'} · {linked.status}
                      {linkedGaps.length > 0 && ` — still needs ${linkedGaps.join(', ')} (edit it in the Next Actions table below)`}
                    </span>
                  ) : (
                    <span className="gap-note">Raise the action in the Next Actions table below, save it, then link it here. A date in free text does not count.</span>
                  )}
                  {hasLegacy && (
                    <span className="gap-note">
                      Recorded before actions were tracked: {gate.gapRequiredAction || '—'} (owner {gate.gapActionOwner || '—'}). It no longer counts.
                    </span>
                  )}
                  <span className="gap-note">Next: set Stage status to Complete and save; the approver then signs Proceed with Conditions.</span>
                </div>
              )}

              {chosen === 'resolve' && (
                <>
                  <label className="gap-fld gap-wide">
                    <span className="gap-label">
                      Resolution{!resolved && !(gate.gapResolution ?? '').trim() && <span className="gap-req"> · needed to resolve the gap</span>}
                    </span>
                    <Input.TextArea
                      disabled={locked}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      placeholder="How this gap was resolved: what was done"
                      value={gate.gapResolution}
                      onChange={(e) => onChange({ gapResolution: e.target.value })}
                    />
                  </label>
                  <label className="gap-fld">
                    <span className="gap-label">
                      Evidence link{!resolved && !(gate.gapEvidenceLink ?? '').trim() && <span className="gap-req"> · needed to resolve the gap</span>}
                    </span>
                    <Input
                      disabled={locked}
                      placeholder="Link to the evidence"
                      value={gate.gapEvidenceLink}
                      onChange={(e) => onChange({ gapEvidenceLink: e.target.value })}
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>
        {graded && chosen === 'resolve' && (
          <div className="gap-resolve" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {resolved ? (
              <span className="gap-note">
                Resolved by {savedGate?.gapResolvedBy ?? '—'}{savedGate?.gapResolvedAt ? ` · ${savedGate.gapResolvedAt.slice(0, 10)}` : ''} — the assessment stays on the record and no longer blocks this gate. Setting the Stage status back to Gap reopens it.
              </span>
            ) : (
              <>
                <Tooltip title={resolveMissing.length > 0 ? `Still needed (saved record): ${resolveMissing.join(', ')}` : 'Record this gap as resolved'}>
                  <span>
                    <Button type="primary" disabled={lockedByGate || resolveMissing.length > 0} loading={resolving} onClick={onResolve}>
                      Resolve
                    </Button>
                  </span>
                </Tooltip>
                <span className="gap-note">
                  {resolveMissing.length > 0
                    ? `Resolve unlocks once saved: ${resolveMissing.join(', ')}.`
                    : 'Everything needed is saved — Resolve records who resolved it and when.'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
