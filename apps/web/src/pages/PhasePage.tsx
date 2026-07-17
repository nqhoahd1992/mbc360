import { Alert, Empty, Tag, Typography } from 'antd';
import { CheckCircleFilled, ClockCircleFilled, LockOutlined, RightCircleFilled } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import {
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

const PHASE_NOTES: Record<number, string> = {
  2: 'Do not re-enter Phase 1 target user/product/market/claim selections here.',
  3: 'Phase 3 proves whether the Phase 1-2 choices are safe, valid, stable and ready for release.',
  4: 'Phase 4 converts the approved development record into dossier evidence, launch sign-off and post-market learning.',
};

export default function PhasePage() {
  const { projectId, phaseNo } = useParams();
  const phase = Number(phaseNo);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));

  const config = PHASE_CONFIGS[phase];
  const meta = PHASES.find((p) => p.phase === phase);
  if (!project || !config || !meta) return <Empty description="Not found" />;

  const progress = phaseProgress(project, phase);
  const checklist = phaseCompletionChecklist(project, phase);
  const s42Triggers = skincareForTwoTriggers(project);
  const s42Incomplete = skincareForTwoIncompleteSections(project);
  const phaseGateNumbers = config.gateIds.map((id) => id.replace('SG', ''));
  const keyChecks = project.gateChecks
    .map((check, index) => ({ check, index }))
    .filter((c) => phaseGateNumbers.includes(c.check.gate) || (phase === 4 && c.check.gate === 'ALL'));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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
            <Typography.Text type="secondary">Review owner: {config.reviewOwner}</Typography.Text>
          </>
        )}
      </div>

      {progress.state === 'locked' && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          title="This phase is locked"
          description="Gates must be completed in order. Complete all gates of the previous phases to unlock this phase. You can still review the forms below, but the gate flow stays read-only."
        />
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

      <ProjectIdentificationCard identity={project.identity} />

      <GateFlowTable project={project} gateIds={config.gateIds} />

      {config.checklistSections.map((section) => (
        <ChecklistSection
          key={section.key}
          projectId={project.identity.id}
          sectionKey={section.key}
          title={section.title}
          gate={section.gate}
          items={project.checklists[section.key] ?? []}
        />
      ))}

      {config.requirementSections.map((section) => (
        <RequirementTable
          key={section.key}
          projectId={project.identity.id}
          sectionKey={section.key}
          title={section.title}
          items={project.requirements[section.key] ?? []}
        />
      ))}

      <GateChecksTable
        projectId={project.identity.id}
        title={`Key Gate Checks — Gates ${phaseGateNumbers.join(', ')}`}
        checks={keyChecks}
      />

      <NextActionsCard
        projectId={project.identity.id}
        gateIds={config.gateIds}
        actions={project.nextActions}
      />

      {phase === 4 && (
        <MarketTrackingCard projectId={project.identity.id} tracks={project.marketTracks} />
      )}

      <EightAnglesTable
        projectId={project.identity.id}
        phase={phase}
        angles={project.phaseClosures[phase].angles}
      />

      <SignOffBlock
        projectId={project.identity.id}
        phase={phase}
        closure={project.phaseClosures[phase]}
        checklist={checklist}
      />
    </div>
  );
}
