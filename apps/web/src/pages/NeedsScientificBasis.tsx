import { Alert, Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  needsAnatomyExposureNotes,
  needsExecutiveBrief,
  needsLiteratureSearchMethod,
  needsResearchQuestions,
  needsSignOff,
  needsTechnologyTraceability,
} from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

// NPD Front-End Roadmap Step 1 (v2 workbook, 2026-07-24) — sign-off gate SG02,
// reused as a Mandatory hard-block at SG05 (Formula BOM lock).
export default function NeedsScientificBasis() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = needsResearchQuestions.reviewOwner
    ? composeReviewOwner(needsResearchQuestions.reviewOwner, project.identity.reviewers)
    : undefined;
  const lockedContent = isGateRefLocked(project, '02');
  const lockedSignOff = isGateRefLocked(project, needsSignOff.gate);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Needs & Scientific Basis
        </Typography.Title>
        <Typography.Text type="secondary">
          What this product must do, based on the physiology and emotional needs of the intended
          user(s). Formula work is HELD until this dossier is reviewed and signed off (Gate 02).
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Mandatory before formula work"
        description="Step 1 of the NPD Front-End Roadmap — sign-off gate SG02, and reused as a hard block on Formula BOM (Gate 05)."
      />

      <ProjectIdentificationCard project={project} />

      <DynamicTable
        config={needsExecutiveBrief}
        rows={project.registers[needsExecutiveBrief.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsExecutiveBrief.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsResearchQuestions}
        rows={project.registers[needsResearchQuestions.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsResearchQuestions.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsLiteratureSearchMethod}
        rows={project.registers[needsLiteratureSearchMethod.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsLiteratureSearchMethod.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsAnatomyExposureNotes}
        rows={project.registers[needsAnatomyExposureNotes.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsAnatomyExposureNotes.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsTechnologyTraceability}
        rows={project.registers[needsTechnologyTraceability.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsTechnologyTraceability.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsSignOff}
        rows={project.registers[needsSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsSignOff.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedSignOff}
      />
    </div>
  );
}
