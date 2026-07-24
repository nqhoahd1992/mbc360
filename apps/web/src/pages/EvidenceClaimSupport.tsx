import { Alert, Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { claimEvidenceTraceability, evidencePlanProspective, evidenceTestProtocol } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

// NPD Front-End Roadmap Step 4 (v2 workbook, 2026-07-24). The prospective plan
// must be agreed BEFORE formula lock (Mandatory hard-block at SG05); the
// detailed test protocol is completed once a prototype exists (Mandatory at
// SG08). Claim -> Evidence traceability is Supporting-tier only (see
// gateReadiness.ts — hard-enforcing "no claim without a Supported Claim ID"
// on artwork/HCP/sales material would mean touching the existing Published
// Info / SKU_Claims_PIF workflow, out of scope here).
export default function EvidenceClaimSupport() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = evidencePlanProspective.reviewOwner
    ? composeReviewOwner(evidencePlanProspective.reviewOwner, project.identity.reviewers)
    : undefined;
  const lockedPlan = isGateRefLocked(project, evidencePlanProspective.gate);
  const lockedProtocol = isGateRefLocked(project, evidenceTestProtocol.gate);
  const lockedClaims = isGateRefLocked(project, claimEvidenceTraceability.gate);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Evidence Plan & Claim Support
        </Typography.Title>
        <Typography.Text type="secondary">
          Plan the proof BEFORE the formula is locked, then trace every claim to it. Defining
          pass/fail before results prevents outcome-shopping.
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Prospective plan required before formula lock"
        description="The prospective evidence plan hard-blocks Formula BOM (Gate 05); the detailed test protocol hard-blocks Gate 08 once a prototype exists."
      />

      <ProjectIdentificationCard identity={project.identity} />

      <DynamicTable
        config={evidencePlanProspective}
        rows={project.registers[evidencePlanProspective.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidencePlanProspective.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedPlan}
      />

      <DynamicTable
        config={evidenceTestProtocol}
        rows={project.registers[evidenceTestProtocol.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, evidenceTestProtocol.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedProtocol}
      />

      <DynamicTable
        config={claimEvidenceTraceability}
        rows={project.registers[claimEvidenceTraceability.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, claimEvidenceTraceability.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={lockedClaims}
      />
    </div>
  );
}
