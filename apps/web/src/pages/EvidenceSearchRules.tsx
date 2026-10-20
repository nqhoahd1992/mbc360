import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { evidenceHierarchyGrades } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import EvidenceRulesContent from '../components/EvidenceRulesContent';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// NPD Front-End Roadmap "6. Evidence & Search Rules" (v2 workbook,
// 2026-07-24) — the corporate evidence-grading/transferability/literature-
// search rulebook, applying to Sheets 1-5 and every efficacy/claim sheet.
// Pure reference (every column editable:false). Reached by link from Sheets 1-5, not from the sidebar menu (NavItem.hidden). The
// sheet's Section 4 (a Prepared by / Approved by sign-off of the standard itself, which nothing read) is not carried: its rule text
// is the note below.
export default function EvidenceSearchRules() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));

  if (!project) return <Empty description="Project not found" />;
  const reviewOwnerText = evidenceHierarchyGrades.reviewOwner
    ? composeReviewOwner(evidenceHierarchyGrades.reviewOwner, project.identity.reviewers)
    : undefined;

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Evidence Hierarchy & Search Rules"
        description={<>The corporate rulebook that keeps every claim honest: how evidence is graded, when it transfers vs is only inferred, and how literature is searched and cited.</>}
        note={{
          title: "Applies to Sheets 1-5 and every efficacy/claim sheet",
          text: "No need or claim may progress to formula or label without an assigned evidence Grade, a passed transferability check (or explicit inference flag), and a complete, dated, linked search record.",
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <EvidenceRulesContent project={project} />
    </div>
  );
}
