import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { claimEvidenceTraceability, evidencePlanProspective, evidenceTestProtocol } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import DynamicTable from '../components/DynamicTable';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

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
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Evidence Plan & Claim Support"
        description={<>Plan the proof BEFORE the formula is locked, then trace every claim to it. Defining pass/fail before results prevents outcome-shopping.</>}
        note={{
          title: "Prospective plan required before formula lock",
          text: "The prospective evidence plan hard-blocks Formula BOM (Gate 05); the detailed test protocol hard-blocks Gate 08 once a prototype exists.",
        }}
        reviewOwnerText={reviewOwnerText}
      />

      {/* Each table is closed at its OWN gate(s), so each has its own closing block directly under it (SW-36). */}
      {[
        { config: evidencePlanProspective, readOnly: lockedPlan },
        { config: evidenceTestProtocol, readOnly: lockedProtocol },
        { config: claimEvidenceTraceability, readOnly: lockedClaims },
      ].map(({ config, readOnly }) => {
        const spec = registerReviewSpec(config);
        return (
          <div key={config.key}>
            <DynamicTable
              config={config}
              rows={project.registers[config.key] ?? []}
              onSave={(rows) => setRegisterRowsBulk(id, config.key, rows)}
              readOnly={readOnly}
            />
            {registerClosureGateIds(config).length > 0 && spec && (
              <RegisterClosurePanel
                projectId={id}
                registerKey={config.key}
                spec={spec}
                reviewers={project.identity.reviewers}
                closures={project.registerClosures}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
