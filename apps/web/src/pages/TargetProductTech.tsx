import { Alert, Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { backbonePlatformTechnology, targetProductProfile, targetProductSignOff } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

// NPD Front-End Roadmap Step 3 (v2 workbook, 2026-07-24) — "Complete before
// formula lock (Gate 5)". Mandatory hard-block at SG05; SG03 only gets a
// non-blocking Supporting-tier visibility nudge (see gateReadiness.ts).
export default function TargetProductTech() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = targetProductProfile.reviewOwner
    ? composeReviewOwner(targetProductProfile.reviewOwner, project.identity.reviewers)
    : undefined;
  const locked = isGateRefLocked(project, targetProductProfile.gate);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Target Product & Tech Platform
        </Typography.Title>
        <Typography.Text type="secondary">
          ONE agreed definition of what success means, plus the backbone technology that will
          deliver it. The technology must be demonstrably superior in some way to the current
          market (Competitor Landscape).
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Complete before formula lock"
        description="Step 3 of the NPD Front-End Roadmap — hard-blocks Formula BOM (Gate 05) until signed off."
      />

      <ProjectIdentificationCard project={project} />

      <DynamicTable
        config={targetProductProfile}
        rows={project.registers[targetProductProfile.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, targetProductProfile.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />

      <DynamicTable
        config={backbonePlatformTechnology}
        rows={project.registers[backbonePlatformTechnology.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, backbonePlatformTechnology.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />

      <DynamicTable
        config={targetProductSignOff}
        rows={project.registers[targetProductSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, targetProductSignOff.key, rows)}
        reviewOwnerText={reviewOwnerText}
        readOnly={locked}
      />
    </div>
  );
}
