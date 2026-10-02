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
import DynamicTable from '../components/DynamicTable';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// NPD Front-End Roadmap Step 2 (v2 workbook, 2026-07-24) — sign-off gate SG03,
// reused as a Mandatory hard-block at SG05 (Formula BOM lock).
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
        description={<>Controlled record of PURCHASED competitor samples + desktop research + standard-of-care analysis. Every important competitor must be purchased and physically evaluated, not just researched online.</>}
        note={{
          title: "Mandatory before formula work",
          text: "Step 2 of the NPD Front-End Roadmap — sign-off gate SG03, and reused as a hard block on Formula BOM (Gate 05).",
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
    </div>
  );
}
