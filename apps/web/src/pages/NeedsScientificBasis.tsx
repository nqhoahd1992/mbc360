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
        description={<>What this product must do, based on the physiology and emotional needs of the intended user(s). Formula work is HELD until this dossier is reviewed and signed off (Gate 02). <strong>Question it answers:</strong> What needs are we trying to address (body + mind, user + caregiver)?</>}
        note={{
          title: "Mandatory before formula work",
          text: (
            <>
              <strong>Step 1 of 4</strong> — sign-off gate SG02 · Owner: Project Manager / R&amp;I. Formula work is held until Steps 1–3 are signed off.
              <br />
              <strong>Minimum output:</strong> Physical/physiological, emotional/developmental, caregiver &amp; practical needs; needs -&gt; design implications; research questions; references; open questions. Formula work HELD until reviewed.
              <br />
              <strong>Note:</strong> Executive summary stays in the Needs Document (brief); full science here.
            </>
          ),
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
