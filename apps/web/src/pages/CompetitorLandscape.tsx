import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  competitorLandscape,
  competitorLandscapeSummary,
  competitorTestingProtocol,
  currentSolutionsStandardOfCare,
} from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import DynamicTable from '../components/DynamicTable';
import EvidenceRulesLink from '../components/EvidenceRulesLink';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// NPD Front-End Roadmap Step 2 (v2 workbook, 2026-07-24) — sign-off gate SG03.
export default function CompetitorLandscape() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = competitorLandscape.reviewOwner
    ? composeReviewOwner(competitorLandscape.reviewOwner, project.identity.reviewers)
    : undefined;
  const lockedProductRegister = isGateRefLocked(project, competitorLandscape.gate);
  const lockedOthers = isGateRefLocked(project, '03');

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Competitor Landscape"
        description={<>Controlled record of PURCHASED competitor samples + desktop research + standard-of-care analysis. Every important competitor must be purchased and physically evaluated, not just researched online. <strong>Question it answers:</strong> What already exists, how well does it work, where is the real unmet gap?</>}
        note={{
          title: "Mandatory before formula work",
          text: (
            <>
              <strong>Step 2 of 4</strong> — sign-off gate SG03 · Owner: Marketing / R&amp;I. Formula work is held until Steps 1–3 are signed off.
              <br />
              <strong>Minimum output:</strong> Selected competitors with purchase evidence (country/retailer/date/lot), full INCI, claims, patents, disclosed testing, price/use, sensory + analytical comparison, and the Max Biocare design decision from each comparison. Also &apos;standard of care&apos; / what users do now.
              <br />
              <strong>Note:</strong> Includes purchased-sample &amp; comparative-testing protocol.
              <br />
              <strong>Evidence must be graded and searched to the corporate standard:</strong> <EvidenceRulesLink projectId={id} />
            </>
          ),
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={competitorLandscape}
        rows={project.registers[competitorLandscape.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, competitorLandscape.key, rows)}
        readOnly={lockedProductRegister}
      />

      <DynamicTable
        config={competitorTestingProtocol}
        rows={project.registers[competitorTestingProtocol.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, competitorTestingProtocol.key, rows)}
        readOnly={lockedOthers}
      />

      <DynamicTable
        config={currentSolutionsStandardOfCare}
        rows={project.registers[currentSolutionsStandardOfCare.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, currentSolutionsStandardOfCare.key, rows)}
        readOnly={lockedOthers}
      />

      <DynamicTable
        config={competitorLandscapeSummary}
        rows={project.registers[competitorLandscapeSummary.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, competitorLandscapeSummary.key, rows)}
        readOnly={lockedOthers}
      />

      {/* One signature closes the whole page: all four tables (RegisterConfig.closedWith). */}
      {registerClosureGateIds(competitorLandscape).length > 0 && registerReviewSpec(competitorLandscape) && (
        <RegisterClosurePanel
          projectId={id}
          registerKey={competitorLandscape.key}
          spec={registerReviewSpec(competitorLandscape)!}
          reviewers={project.identity.reviewers}
          closures={project.registerClosures}
        />
      )}
    </div>
  );
}
