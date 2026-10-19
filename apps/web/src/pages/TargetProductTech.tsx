import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { backbonePlatformTechnology, targetProductProfile, targetProductSignOff } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import DynamicTable from '../components/DynamicTable';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

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
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Target Product & Tech Platform"
        description={<>ONE agreed definition of what success means, plus the backbone technology that will deliver it. The technology must be demonstrably superior in some way to the current market (Competitor Landscape). <strong>Question it answers:</strong> What platform will address the needs, and how is it better than the market?</>}
        note={{
          title: "Complete before formula lock",
          text: (
            <>
              <strong>Step 3 of 4</strong> — sign-off gate SG03 -&gt; SG05 · Owner: R&amp;I / Project Manager. Formula work is held until Steps 1–3 are signed off.
              <br />
              <strong>Minimum output:</strong> One agreed definition of success (min/target/ideal/unacceptable per attribute + measurement method). Technology platform: precise problem, routes considered, why selected, mechanism, critical attributes, evidence maturity, patent landscape, and HOW it is superior to existing products.
              <br />
              <strong>Note:</strong> Combines Target Product Profile + Technology Platform.
            </>
          ),
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <DynamicTable
        config={targetProductProfile}
        rows={project.registers[targetProductProfile.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, targetProductProfile.key, rows)}
        readOnly={locked}
      />

      <DynamicTable
        config={backbonePlatformTechnology}
        rows={project.registers[backbonePlatformTechnology.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, backbonePlatformTechnology.key, rows)}
        readOnly={locked}
      />

      <DynamicTable
        config={targetProductSignOff}
        rows={project.registers[targetProductSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, targetProductSignOff.key, rows)}
        readOnly={locked}
      />

      {/* One signature closes the whole page: all three tables (RegisterConfig.closedWith). */}
      {registerClosureGateIds(targetProductProfile).length > 0 && registerReviewSpec(targetProductProfile) && (
        <RegisterClosurePanel
          projectId={id}
          registerKey={targetProductProfile.key}
          spec={registerReviewSpec(targetProductProfile)!}
          reviewers={project.identity.reviewers}
          closures={project.registerClosures}
        />
      )}
    </div>
  );
}
