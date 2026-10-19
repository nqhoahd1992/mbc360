import { Empty } from 'antd';
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
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import DynamicTable from '../components/DynamicTable';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// NPD Front-End Roadmap Step 1 (v2 workbook, 2026-07-24) — sign-off gate SG02.
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
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Needs & Scientific Basis"
        description={<>What this product must do, based on the physiology and emotional needs of the intended user(s). Formula work is HELD until this dossier is reviewed and signed off (Gate 02).</>}
        note={{
          title: "Mandatory before formula work",
          text: "Step 1 of the NPD Front-End Roadmap — sign-off gate SG02. Formula work is held until Steps 1–3 are signed off.",
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={needsExecutiveBrief}
        rows={project.registers[needsExecutiveBrief.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsExecutiveBrief.key, rows)}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsResearchQuestions}
        rows={project.registers[needsResearchQuestions.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsResearchQuestions.key, rows)}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsLiteratureSearchMethod}
        rows={project.registers[needsLiteratureSearchMethod.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsLiteratureSearchMethod.key, rows)}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsAnatomyExposureNotes}
        rows={project.registers[needsAnatomyExposureNotes.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsAnatomyExposureNotes.key, rows)}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsTechnologyTraceability}
        rows={project.registers[needsTechnologyTraceability.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsTechnologyTraceability.key, rows)}
        readOnly={lockedContent}
      />

      <DynamicTable
        config={needsSignOff}
        rows={project.registers[needsSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, needsSignOff.key, rows)}
        readOnly={lockedSignOff}
      />

      {/* One signature closes the whole page: all six tables (RegisterConfig.closedWith). */}
      {registerClosureGateIds(needsExecutiveBrief).length > 0 && registerReviewSpec(needsExecutiveBrief) && (
        <RegisterClosurePanel
          projectId={id}
          registerKey={needsExecutiveBrief.key}
          spec={registerReviewSpec(needsExecutiveBrief)!}
          reviewers={project.identity.reviewers}
          closures={project.registerClosures}
        />
      )}
    </div>
  );
}
