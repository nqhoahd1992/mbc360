import { Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { studyParticipantLog, studyProtocolSetup } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import ClosingLayout from '../components/ClosingLayout';
import DynamicTable from '../components/DynamicTable';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// The workbook's "Study Protocol & Participant Rationale" sheet: "Study participants are folded into this sheet to avoid a separate
// overlapping participant tab" — so the protocol setup and the participant / sample log are one page, as in the sheet. The study APPROVAL
// workflow (rule C2) is not part of the sheet; it sits on the Gate 08 tab of Phase 3, under "Human-participant study planned?".
export default function StudyProtocol() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const reviewOwnerText = studyProtocolSetup.reviewOwner
    ? composeReviewOwner(studyProtocolSetup.reviewOwner, project.identity.reviewers)
    : undefined;
  const locked = isGateRefLocked(project, studyProtocolSetup.gate);
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
        title="Study Protocol & Participant Rationale"
        description={<>Protocol setup and the participant / sample log, on one page as in the workbook. Whether a human-participant study is planned, and its approval route, are answered on the Gate 08 tab of Phase 3.</>}
        reviewOwnerText={reviewOwnerText}
      />
      <ClosingLayout>
        {[studyProtocolSetup, studyParticipantLog].map((config) => (
          <div key={config.key}>
            <DynamicTable
              config={config}
              rows={project.registers[config.key] ?? []}
              onSave={(rows) => setRegisterRowsBulk(id, config.key, rows)}
              readOnly={locked}
              hideGateNote
            />
            {closing(config)}
          </div>
        ))}
      </ClosingLayout>
    </div>
  );
}
