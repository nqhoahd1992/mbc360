import { DatePicker, Empty, Select } from 'antd';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { productDevelopmentFeedback, productDevelopmentIterations, productDevelopmentProfile, PRODUCT_DEV_OVERALL_STATUS_OPTIONS } from '@mbc360/shared/config/registers';
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

  // These are facts the project already records at creation, so the table shows them rather than asking again — a second
  // copy typed here would drift from the real one. The two people are the project's assigned review areas: Technical Services
  // is the formulation team and Project Manager is the project's owner area. [ASSUMPTION: R5-Q70]
  const fromProject: Record<string, string> = {
    'NPD lead (formulator)': project.identity.reviewers['formulation'] ?? '',
    'Project owner': project.identity.reviewers['project-manager'] ?? '',
    'Product Family': project.identity.productGroup,
    'Product / SKU': project.identity.productSku,
    'Project ID': project.identity.id,
    'Formula version (current)': project.formulaVersion ?? '',
    'Target markets': project.identity.markets.join(', '),
  };

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Product Development Report"
        description={<>Identification, the development iteration log and the team feedback and competitor notes behind each formula version.</>}
        reviewOwnerText={reviewOwnerText}
      />
      <DynamicTable
        config={productDevelopmentProfile}
        rows={project.registers[productDevelopmentProfile.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, productDevelopmentProfile.key, rows)}
        readOnly={locked}
        renderCell={(column, row, _index, api) => {
          if (column.key !== 'value') return undefined;
          const field = String(row.field ?? '');
          if (field in fromProject) return fromProject[field] || <span className="rt-muted">—</span>;
          const value = typeof row.value === 'string' ? row.value : undefined;
          if (api.readOnly) return value || <span className="rt-muted">—</span>;
          if (field === 'Report date') {
            return (
              <DatePicker
                style={{ width: '100%' }}
                value={value ? dayjs(value) : null}
                onChange={(d) => api.patch('value', d ? d.format('YYYY-MM-DD') : undefined)}
              />
            );
          }
          if (field === 'Overall status') {
            return (
              <Select
                allowClear
                style={{ width: '100%' }}
                value={value}
                options={PRODUCT_DEV_OVERALL_STATUS_OPTIONS.map((o) => ({ value: o, label: o }))}
                onChange={(v) => api.patch('value', v)}
              />
            );
          }
          return undefined;
        }}
      />
      <DynamicTable
        config={productDevelopmentIterations}
        rows={project.registers[productDevelopmentIterations.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, productDevelopmentIterations.key, rows)}
        readOnly={locked}
      />
      <DynamicTable
        config={productDevelopmentFeedback}
        rows={project.registers[productDevelopmentFeedback.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, productDevelopmentFeedback.key, rows)}
        readOnly={locked}
      />
    </div>
  );
}
