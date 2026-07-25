import { useEffect } from 'react';
import { Alert, Button, Empty, Tag, Typography } from 'antd';
import { CheckCircleFilled, ClockCircleFilled, LockOutlined, RightCircleFilled } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  currentGateNumber,
  isGateRefLocked,
  phaseCompletionChecklist,
  phaseProgress,
  skincareForTwoIncompleteSections,
  skincareForTwoTriggers,
} from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { PHASES } from '@mbc360/shared/config/gates';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import GateFlowTable from '../components/GateFlowTable';
import ChecklistSection from '../components/ChecklistSection';
import RequirementTable from '../components/RequirementTable';
import GateChecksTable from '../components/GateChecksTable';
import EightAnglesTable from '../components/EightAnglesTable';
import SignOffBlock from '../components/SignOffBlock';
import NextActionsCard from '../components/NextActionsCard';
import MarketTrackingCard from '../components/MarketTrackingCard';
import SectionJumpButton from '../components/SectionJumpButton';
import { roleLabel } from '../utils/roles';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';

// Transcribed verbatim from cell A20 of each phase's source workbook sheet
// (PHASE1 G1-3 MKTG has no equivalent cell — its A20 is a table header, not a
// note). Keep these complete, not paraphrased or truncated — the second
// sentence in each is what actually explains the instruction.
const PHASE_NOTES: Record<number, string> = {
  2: 'Do not re-enter Phase 1 target user/product/market/claim selections here. Use those choices as inputs and record only ingredient, formula, costing, packaging and artwork decisions.',
  3: 'Phase 3 proves whether the Phase 1-2 choices are safe, valid, stable and releasable. It does not repeat product positioning choices unless a backtrack is required.',
  4: 'Phase 4 converts the approved development record into dossier evidence, launch approval and a monitored post-market improvement loop. Claim/market/product choices are referenced from Phase 1, not re-entered.',
};

export default function PhasePage() {
  const { projectId, phaseNo } = useParams();
  const phase = Number(phaseNo);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const viewRole = useAppStore((s) => s.viewRole);
  const acceptPreWork = useAppStore((s) => s.acceptPhasePreWork);

  // Deep-link support for the "What's blocking Gate X" list (GateFlowTable):
  // a blocker link to a section on THIS phase page carries `?scrollTo=<anchor
  // id>`. On arrival, scroll to it and briefly highlight it, then drop the
  // param so a later refresh/re-render doesn't re-trigger the scroll.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const targetId = searchParams.get('scrollTo');
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const prevBackground = el.style.backgroundColor;
    const prevTransition = el.style.transition;
    el.style.transition = 'background-color 0.4s';
    el.style.backgroundColor = '#fffbe6';
    const timer = setTimeout(() => {
      el.style.backgroundColor = prevBackground;
      el.style.transition = prevTransition;
    }, 2200);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('scrollTo');
        return next;
      },
      { replace: true },
    );
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  const config = PHASE_CONFIGS[phase];
  const meta = PHASES.find((p) => p.phase === phase);
  if (!project || !config || !meta) return <Empty description="Not found" />;

  const progress = phaseProgress(project, phase);
  // F13 / B5: pre-work review. A not-yet-first phase that has opened prompts the
  // responsible owner to review and accept any pre-work entered before it opened.
  const closure = project.phaseClosures[phase];
  const preWorkAccepted = !!closure?.preWork?.acceptedBy;
  const showPreWorkReview = progress.state !== 'locked' && phase > 1 && !preWorkAccepted;
  const checklist = phaseCompletionChecklist(project, phase);
  const s42Triggers = skincareForTwoTriggers(project);
  const s42Incomplete = skincareForTwoIncompleteSections(project);
  const phaseGateNumbers = config.gateIds.map((id) => id.replace('SG', ''));
  const currentGateNum = currentGateNumber(project);
  const keyChecks = project.gateChecks
    .map((check, index) => ({ check, index }))
    .filter((c) => phaseGateNumbers.includes(c.check.gate) || (phase === 4 && c.check.gate === 'ALL'));

  const jumpSections = [
    { id: 'sec-identification', label: 'Project Identification' },
    { id: 'sec-gate-flow', label: 'Phase Gate Flow' },
    ...config.checklistSections.map((s) => ({ id: `sec-checklist-${s.key}`, label: s.title })),
    ...config.requirementSections.map((s) => ({ id: `sec-requirement-${s.key}`, label: s.title })),
    { id: 'sec-gate-checks', label: 'Key Gate Checks' },
    ...(phase === 4 ? [{ id: 'sec-market-tracking', label: 'Market Regulatory & Launch Tracking' }] : []),
    { id: 'sec-eight-angles', label: '8 Angles Coverage' },
    { id: 'sec-next-actions', label: 'Next Actions' },
    { id: 'sec-sign-off', label: 'Evidence Summary, Decision and Sign-Off' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SectionJumpButton sections={jumpSections} />
      <div>
        <Typography.Title level={4} style={{ margin: 0, color: meta.color }}>
          {meta.title} <span style={{ color: '#999', fontWeight: 400 }}>({meta.subtitle})</span>{' '}
          {progress.state === 'completed' && (
            <Tag icon={<CheckCircleFilled />} color="success">
              Phase passed
            </Tag>
          )}
          {progress.state === 'current' && !progress.awaitingApproval && (
            <Tag icon={<RightCircleFilled />} color="processing">
              In progress · {progress.passedGates}/{progress.totalGates} gates passed
            </Tag>
          )}
          {progress.awaitingApproval && (
            <Tag icon={<ClockCircleFilled />} color="gold">
              Awaiting phase sign-off
            </Tag>
          )}
          {progress.state === 'locked' && (
            <Tag icon={<LockOutlined />}>Locked</Tag>
          )}
        </Typography.Title>
        <Typography.Text type="secondary">
          Responsible department: {meta.department}
        </Typography.Text>
        {config.reviewOwner && (
          <>
            <br />
            <Typography.Text type="secondary">
              Review owner: {composeReviewOwner(config.reviewOwner, project.identity.reviewers)}
            </Typography.Text>
          </>
        )}
      </div>

      {progress.state === 'locked' && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          title="This phase is locked — entries here count as pre-work"
          description="Gates must be completed in order. You can still review and fill the forms below (draft evidence, requirements, notes, risks, proposed actions), but the gate flow, sign-off and formal closure stay read-only. Anything entered now is recorded as Pre-work / Entered Before Gate Opened and must be reviewed and accepted by the responsible owner once this phase opens."
        />
      )}

      {showPreWorkReview && (
        <Alert
          type="warning"
          showIcon
          title="Pre-work review required"
          description="If any data in this phase was entered before the phase opened (pre-work), the responsible owner must review and formally accept it before it contributes to completion."
          action={
            <Button size="small" onClick={() => acceptPreWork(project.identity.id, phase, roleLabel(viewRole))}>
              Accept pre-work
            </Button>
          }
        />
      )}

      {closure?.preWork?.acceptedBy && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          Pre-work reviewed and accepted by {closure.preWork.acceptedBy}
          {closure.preWork.acceptedDate ? ` on ${closure.preWork.acceptedDate}` : ''}.
        </Typography.Paragraph>
      )}

      {progress.awaitingApproval && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleFilled />}
          title="All gates passed — phase sign-off required"
          description="Every gate in this phase has passed. Record the 'Approved by' sign-off in the Evidence Summary, Decision and Sign-Off section below to complete the phase and unlock the next one."
        />
      )}

      {PHASE_NOTES[phase] && <Alert type="info" showIcon title={PHASE_NOTES[phase]} />}

      {phase === 3 && s42Triggers.length > 0 && (
        <Alert
          type={s42Incomplete.length > 0 ? 'error' : 'success'}
          showIcon
          title={`Skincare for Two active (triggered by: ${s42Triggers.join(', ')})`}
          description={
            s42Incomplete.length > 0
              ? `Gate 07 is hard-blocked until the mandatory maternal and infant-contact safety sections are fully completed. Outstanding: ${s42Incomplete.join('; ')}.`
              : 'All mandatory maternal and infant-contact safety sections are complete — Gate 07 is no longer blocked by this screen.'
          }
        />
      )}

      <div id="sec-identification">
        <ProjectIdentificationCard identity={project.identity} />
      </div>

      <div id="sec-gate-flow">
        <GateFlowTable project={project} gateIds={config.gateIds} />
      </div>

      {config.checklistSections.map((section) => (
        <div key={section.key} id={`sec-checklist-${section.key}`}>
          <ChecklistSection
            projectId={project.identity.id}
            sectionKey={section.key}
            title={section.title}
            gate={section.gate}
            items={project.checklists[section.key] ?? []}
            currentGateNumber={currentGateNum}
            readOnly={isGateRefLocked(project, section.gate)}
          />
        </div>
      ))}

      {config.requirementSections.map((section) => (
        <div key={section.key} id={`sec-requirement-${section.key}`}>
          <RequirementTable
            projectId={project.identity.id}
            sectionKey={section.key}
            title={section.title}
            items={project.requirements[section.key] ?? []}
            currentGateNumber={currentGateNum}
            isRowLocked={(item) => isGateRefLocked(project, item.gate)}
          />
        </div>
      ))}

      <div id="sec-gate-checks">
        <GateChecksTable
          projectId={project.identity.id}
          title={`Key Gate Checks — Gates ${phaseGateNumbers.join(', ')}`}
          checks={keyChecks}
          currentGateNumber={currentGateNum}
          isRowLocked={(check) => isGateRefLocked(project, check.gate)}
        />
      </div>

      {phase === 4 && (
        <div id="sec-market-tracking">
          <MarketTrackingCard projectId={project.identity.id} tracks={project.marketTracks} />
        </div>
      )}

      <div id="sec-eight-angles">
        <EightAnglesTable
          projectId={project.identity.id}
          phase={phase}
          angles={project.phaseClosures[phase].angles}
        />
      </div>

      <div id="sec-next-actions">
        <NextActionsCard
          projectId={project.identity.id}
          gateIds={config.gateIds}
          actions={project.nextActions}
        />
      </div>

      <div id="sec-sign-off">
        <SignOffBlock
          projectId={project.identity.id}
          phase={phase}
          closure={project.phaseClosures[phase]}
          checklist={checklist}
        />
      </div>
    </div>
  );
}
