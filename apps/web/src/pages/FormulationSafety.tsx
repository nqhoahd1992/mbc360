import { Alert, Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formulationSafetyFinalSignOff, formulationSafetyMatrix, formulationSafetyProfile } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

export default function FormulationSafety() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  // All three blocks share the Formulation_Safety sheet's review owner.
  const reviewOwnerText = formulationSafetyProfile.reviewOwner
    ? composeReviewOwner(formulationSafetyProfile.reviewOwner, project.identity.reviewers)
    : undefined;
  // Gate-level edit lock — Formulation Safety is used at Gate 07 and reused at
  // Gate 10, so it stays editable until BOTH have passed.
  const locked = isGateRefLocked(project, formulationSafetyProfile.gate);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Full Formulation Safety Evidence
        </Typography.Title>
        <Typography.Text type="secondary">
          The product-level safety control sheet — pulls ingredient, exposure and use-context
          evidence into one final sign-off.
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Primary safety evidence tab"
        description="This is the main evidence used to close Gate 07 (Maternal & Baby-Contact Safety), and is reused again at Gate 10 (PIF-03 Safety assessment)."
      />

      <ProjectIdentificationCard identity={project.identity} />

      <DynamicTable
        config={formulationSafetyProfile}
        rows={project.registers[formulationSafetyProfile.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyProfile.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />

      <DynamicTable
        config={formulationSafetyMatrix}
        rows={project.registers[formulationSafetyMatrix.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyMatrix.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />

      <DynamicTable
        config={formulationSafetyFinalSignOff}
        rows={project.registers[formulationSafetyFinalSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyFinalSignOff.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />
    </div>
  );
}
