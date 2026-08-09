import { Alert, Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  evidenceControlSignOff,
  evidenceHierarchyGrades,
  evidenceSearchStandard,
  evidenceTransferabilityRules,
} from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

// NPD Front-End Roadmap "6. Evidence & Search Rules" (v2 workbook,
// 2026-07-24) — the corporate evidence-grading/transferability/literature-
// search rulebook, applying to Sheets 1-5 and every efficacy/claim sheet.
// Sections 1-3 are pure reference (all editable:false); Section 4 is the
// standard's own sign-off (Prepared by / Approved by), which IS editable.
export default function EvidenceSearchRules() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = evidenceHierarchyGrades.reviewOwner
    ? composeReviewOwner(evidenceHierarchyGrades.reviewOwner, project.identity.reviewers)
    : undefined;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Evidence Hierarchy & Search Rules
        </Typography.Title>
        <Typography.Text type="secondary">
          The corporate rulebook that keeps every claim honest: how evidence is graded, when it
          transfers vs is only inferred, and how literature is searched and cited.
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Applies to Sheets 1-5 and every efficacy/claim sheet"
        description="No need or claim may progress to formula or label without an assigned evidence Grade, a passed transferability check (or explicit inference flag), and a complete, dated, linked search record."
      />

      <ProjectIdentificationCard project={project} />

      <DynamicTable
        config={evidenceHierarchyGrades}
        rows={project.registers[evidenceHierarchyGrades.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidenceHierarchyGrades.key, rows)}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={evidenceTransferabilityRules}
        rows={project.registers[evidenceTransferabilityRules.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidenceTransferabilityRules.key, rows)}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={evidenceSearchStandard}
        rows={project.registers[evidenceSearchStandard.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidenceSearchStandard.key, rows)}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={evidenceControlSignOff}
        rows={project.registers[evidenceControlSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidenceControlSignOff.key, rows)}
        reviewOwnerText={reviewOwnerText}
      />
    </div>
  );
}
