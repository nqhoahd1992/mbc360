import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { productDevelopmentFeedback, productDevelopmentIterations, productDevelopmentProfile } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import DynamicTable from '../components/DynamicTable';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// One page for the workbook's Product_Dev_Report sheet, which carries three tables: identification, the iteration log and
// the team feedback / competitor notes.
export default function ProductDevelopmentReport() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = productDevelopmentProfile.reviewOwner
    ? composeReviewOwner(productDevelopmentProfile.reviewOwner, project.identity.reviewers)
    : undefined;
  // All three tables share one gate rule, so they lock together.
  const locked = isGateRefLocked(project, productDevelopmentProfile.gate);

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Product Development Report"
        description={<>Identification, the development iteration log and the team feedback and competitor notes behind each formula version.</>}
        reviewOwnerText={reviewOwnerText}
      />
      {[productDevelopmentProfile, productDevelopmentIterations, productDevelopmentFeedback].map((config) => (
        <DynamicTable
          key={config.key}
          config={config}
          rows={project.registers[config.key] ?? []}
          onSave={(rows) => setRegisterRowsBulk(id, config.key, rows)}
          readOnly={locked}
        />
      ))}
    </div>
  );
}
