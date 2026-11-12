import { useState } from 'react';
import { Button, DatePicker, Input, Radio, Select, Tooltip, message } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import StopProjectAction from './StopProjectAction';
import ChoiceSelect from './ChoiceSelect';
import dayjs from 'dayjs';
import type { GateRecord, NextAction, RiskLevel } from '@mbc360/shared/types';
import { GAP_IMPACT_CATEGORIES, RISK_LEVELS } from '@mbc360/shared/types';
import { gapResolveMissing, isGapResolved } from '@mbc360/shared/utils/gapCriticality';
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

  // One line per grade, in the header: what the grade means for the gate (Round 4 question 3, Round 5 question 9). The detail lives in the path
  // the person picks below, so it is not repeated here.
  const gist: Record<RiskLevel, string> = {
    Critical: 'Cannot be carried under any Proceed — resolve it, or the gate goes to Hold or Backtrack.',
    High: 'Can only be carried under Proceed with Conditions, owned by a tracked Next Action.',
    Medium: 'Resolve it now, or carry it under Proceed with Conditions with a tracked Next Action.',
    Low: 'Resolve it now, or carry it under Proceed with Conditions with a tracked Next Action.',
  };
  const gradeTone: Record<RiskLevel, string> = { Critical: 'c-tag-bad', High: 'c-tag-bad', Medium: 'c-tag-warn', Low: 'c-tag-ok' };

  // The tracked Next Actions of this project: the carry path links one, and the gap shows its owner and date instead of keeping copies.
  const nextActions = project?.nextActions ?? NO_ACTIONS;
  const linked = nextActions.find((a) => a.id === (gate.gapLinkedNextActionId ?? ''));
  const linkedGaps = linked ? controlledActionGaps(linked) : [];
  const hasLegacy = (gate.gapRequiredAction ?? '').trim() !== '' || (gate.gapActionOwner ?? '').trim() !== '';

  // What the chosen path still lacks, read from the SAVED record (what the server checks). A chip per missing piece, not a sentence.
  const carryMissing: string[] = [];
  if (savedGate) {
    if (!(savedGate.gapAssessor ?? '').trim()) carryMissing.push('Assessor');
    const savedLinked = nextActions.find((a) => a.id === (savedGate.gapLinkedNextActionId ?? ''));
    if (!savedLinked) carryMissing.push('Tracked Next Action');
    else if (controlledActionGaps(savedLinked).length > 0) carryMissing.push('Next Action details');
  }
  const resolveChips = resolveMissing.map((m) => m.replace(/^a /, '').replace(/^the /, '').replace('how the gap was resolved', 'Resolution').replace('evidence link', 'Evidence link').replace('assessor', 'Assessor').replace('criticality assessment', 'Criticality').replace('Stage status other than Gap', 'Stage status other than Gap'));
  const chips = chosen === 'carry' ? carryMissing : resolveChips;

  return (
    <section className="gap">
      <div className="gap-head">
        <div className="gap-head-main">
          <div className="gap-titlebar">
            <span className="gap-title">Gap assessment</span>
            {graded ? (
              <span className={`c-tag c-tag-dot ${gradeTone[criticality as RiskLevel]}`}>{criticality}</span>
            ) : (
              <span className="c-tag c-tag-dot c-tag-warn">Not assessed</span>
            )}
            {resolved && <span className="c-tag c-tag-dot c-tag-ok">Resolved</span>}
          </div>
          <span className="gap-state">
            {graded
              ? gist[criticality as RiskLevel]
              : 'Grade how critical this gap is. Until then the gate can only go to Hold or Backtrack.'}
          </span>
        </div>
        {/* SW-31: a Critical gap is the one condition under which the project may be stopped. Only the project Lead or an administrator
            sees the button; it is disabled until the Critical grade is saved. */}
        {criticality === 'Critical' && project && <StopProjectAction project={project} unsaved={savedGrade !== 'Critical'} />}
      </div>

      <div className="gap-body">
        <div className="gap-section">
          <span className="gap-section-title">Assess</span>
          <div className="gap-grid">
            <label className="gap-fld">
              <span className="gap-label">Criticality</span>
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
                  <span className="gap-label">Assessor</span>
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
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    placeholder="Why this gap carries the criticality recorded above"
                    value={gate.gapRationale}
                    onChange={(e) => onChange({ gapRationale: e.target.value })}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {graded && (
          <div className="gap-section">
            <span className="gap-section-title">{resolved ? 'Resolution' : 'Handle'}</span>

            {!resolved && criticality !== 'Critical' && (
              <Radio.Group disabled={lockedByGate} value={chosen} onChange={(e) => setPath(e.target.value)} className="gap-choices">
                <Radio value="resolve" className="gap-choice">
                  <span className="gap-choice-title">Resolve it now</span>
                  <span className="gap-choice-desc">Already fixed. Record how and the evidence, then press Resolve. The gate can go on as a normal Proceed.</span>
                </Radio>
                <Radio value="carry" className="gap-choice">
                  <span className="gap-choice-title">Carry it</span>
                  <span className="gap-choice-desc">Fix it later. A tracked Next Action owns the fix and the gate is signed as Proceed with Conditions.</span>
                </Radio>
              </Radio.Group>
            )}
            {!resolved && criticality === 'Critical' && (
              <span className="gap-note">A Critical gap has one way forward: resolve it. Otherwise the gate goes to Hold or Backtrack, or the project is stopped.</span>
            )}
            {!resolved && !chosen && <span className="gap-note">Choose one to see what it needs.</span>}

            {chosen === 'carry' && !resolved && (
              <div className="gap-fld">
                <span className="gap-label">Tracked Next Action</span>
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
                  <span className="gap-note">Raise the action in the Next Actions table below, save it, then link it here.</span>
                )}
                {hasLegacy && (
                  <span className="gap-note">
                    Recorded before actions were tracked: {gate.gapRequiredAction || '—'} (owner {gate.gapActionOwner || '—'}). It no longer counts.
                  </span>
                )}
              </div>
            )}

            {chosen === 'resolve' && (
              <div className="gap-grid">
                <label className="gap-fld gap-wide">
                  <span className="gap-label">Resolution</span>
                  <Input.TextArea
                    disabled={locked}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    placeholder="What was done to resolve this gap"
                    value={gate.gapResolution}
                    onChange={(e) => onChange({ gapResolution: e.target.value })}
                  />
                </label>
                <label className="gap-fld gap-wide">
                  <span className="gap-label">Evidence link</span>
                  <Input
                    disabled={locked}
                    placeholder="Link to the evidence"
                    value={gate.gapEvidenceLink}
                    onChange={(e) => onChange({ gapEvidenceLink: e.target.value })}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {graded && chosen && (
          <div className="gap-footer">
            {resolved ? (
              <span className="gap-note">
                Resolved by {savedGate?.gapResolvedBy ?? '—'}
                {savedGate?.gapResolvedAt ? ` · ${savedGate.gapResolvedAt.slice(0, 10)}` : ''}. The assessment stays on the record and no longer blocks this gate. Setting the Stage status back to Gap reopens it.
              </span>
            ) : (
              <>
                <div className="gap-needs">
                  {chips.length === 0 ? (
                    <span className="c-tag c-tag-dot c-tag-ok">{chosen === 'resolve' ? 'Ready to resolve' : 'Ready to carry'}</span>
                  ) : (
                    <>
                      <span className="gap-note">Still needed (saved):</span>
                      {chips.map((m) => (
                        <span key={m} className="c-tag c-tag-warn">
                          {m}
                        </span>
                      ))}
                    </>
                  )}
                </div>
                {chosen === 'resolve' && (
                  <Tooltip title={resolveMissing.length > 0 ? `Still needed: ${resolveMissing.join(', ')}` : 'Record this gap as resolved'}>
                    <span>
                      <Button type="primary" disabled={lockedByGate || resolveMissing.length > 0} loading={resolving} onClick={onResolve}>
                        Resolve
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
