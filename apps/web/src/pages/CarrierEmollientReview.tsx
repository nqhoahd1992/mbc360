import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { carrierEmollientReview, carrierReviewSummary } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import DynamicTable from '../components/DynamicTable';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// Workbook sheet "Ingredient Review" (its heading: CARRIER / EMOLLIENT SYSTEM REVIEW). One sheet, two kinds of table — a list of
// carriers and a fixed set of summary questions — which is why it is two registers; drawn as one page, like the other front-end sheets.
export default function CarrierEmollientReview() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = carrierEmollientReview.reviewOwner
    ? composeReviewOwner(carrierEmollientReview.reviewOwner, project.identity.reviewers)
    : undefined;
  const locked = isGateRefLocked(project, carrierEmollientReview.gate);
  // Each register is closed once per gate that needs it (SW-36). Merging the two registers into one page dropped the closing blocks
  // their separate pages used to show, so a gate waiting for a closure had nowhere to sign it.
  const closing = (config: RegisterConfig) => {
    const spec = registerReviewSpec(config);
    if (registerClosureGateIds(config).length === 0 || !spec) return null;
    return (
      <RegisterClosurePanel
        projectId={id}
        registerKey={config.key}
        spec={spec}
        reviewers={project.identity.reviewers}
        closures={project.registerClosures}
      />
    );
  };

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Carrier / Emollient System Review"
        description={<><strong>Question it answers:</strong> Are the carriers correct, could they be improved, and are they research-backed? (Actives are reviewed separately.)</>}
        note={{
          title: 'Feeds Step 3',
          text: 'These carrier changes feed Step 3 (Backbone Technology) and then the final formula and testing plan. No changes are written into the formula file until the Needs sheet is reviewed and signed off.',
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={carrierEmollientReview}
        rows={project.registers[carrierEmollientReview.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, carrierEmollientReview.key, rows)}
        readOnly={locked}
        hideDescription
      />
      {closing(carrierEmollientReview)}

      <DynamicTable
        config={carrierReviewSummary}
        rows={project.registers[carrierReviewSummary.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, carrierReviewSummary.key, rows)}
        readOnly={locked}
      />
      {closing(carrierReviewSummary)}
    </div>
  );
}
