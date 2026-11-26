import { Alert, Empty } from 'antd';
import dayjs from 'dayjs';
import { contentValidityWarnings } from '@mbc360/shared/utils/deviations';
import { Link } from 'react-router-dom';
import Notice from '../components/Notice';
import { useParams } from 'react-router-dom';
import { publicationRules, publishedInfoApproval, RELEASED_INFO_STATES } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import { useAppStore } from '../store/useAppStore';
import ClosingLayout from '../components/ClosingLayout';
import DynamicTable from '../components/DynamicTable';
import PublishedInfoApprovalTable from '../components/PublishedInfoApprovalTable';
import RegisterApplicabilityBlock from '../components/RegisterApplicabilityBlock';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import { CompositePageHeader } from '../components/RegisterPageHeader';

// Rules C6 / F11: a row with a final published link needs all five workflow steps at Y and a released workflow state.
const C6_STEPS = ['terminologyChecked', 'evidenceVerified', 'technicalReview', 'regulatoryReview', 'finalApproval'];

// The workbook's Published_Info_Approval sheet: the PUBLICATION RULES and, under them, the PUBLICATION APPROVAL REGISTER.
export default function PublishedInformation() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);
  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const spec = registerReviewSpec(publishedInfoApproval);
  const reviewOwnerText = spec ? composeReviewOwner(spec, project.identity.reviewers) : undefined;
  const approvalRows = project.registers[publishedInfoApproval.key] ?? [];
  const violations = approvalRows.filter(
    (row) =>
      typeof row.finalPublishedLink === 'string' &&
      row.finalPublishedLink.trim() !== '' &&
      (C6_STEPS.some((step) => row[step] !== 'Y') || !RELEASED_INFO_STATES.includes(String(row.workflowState))),
  );
  const locked = isGateRefLocked(project, publishedInfoApproval.gate);
  // Round 5 question 26(d): released content whose review date has come, or whose claim or approved wording is no longer valid, is shown to its owner until
  // somebody records what was decided. A due review date asks for a re-review; it does not by itself prove the content was published unlawfully.
  const warnings = contentValidityWarnings(project, dayjs().format('YYYY-MM-DD')).filter((w) => !w.dispositioned);

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Published Information Approval"
        description={<>Approve any product information, technical statement, claim wording or evidence summary before release outside controlled internal use.</>}
        reviewOwnerText={reviewOwnerText}
      />
      <ClosingLayout>
        {violations.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={`${violations.length} item${violations.length > 1 ? 's' : ''} published without a completed approval workflow`}
            description={`No public information may be released until all five workflow steps are Y and the workflow state is "Approved for Release" or "Released" (rules C6 / F11). Review: ${violations
              .map((r) => String(r.recordId || r.publishedItem || 'unnamed item'))
              .join(', ')}.`}
          />
        )}
        {warnings.length > 0 && (
          <Notice tone="warn" title={`${warnings.length} released item${warnings.length > 1 ? 's' : ''} need${warnings.length > 1 ? '' : 's'} a validity review`}>
            <ul style={{ margin: '4px 0 6px 18px', padding: 0 }}>
              {warnings.map((w) => (
                <li key={`${w.recordId}|${w.kind}`}>
                  <b>{w.recordId}</b> — {w.kind}: {w.detail}. Owner: {w.owner || 'not named'}.{w.promptContainment ? ' A claim that is unsupported or withdrawn needs prompt containment.' : ''}
                </li>
              ))}
            </ul>
            Record what was decided in the row's Validity review section. If the content was used while it was no longer valid, log it as a{' '}
            <Link className="c-link" to={`/projects/${id}/registers/reg/deviationRecords`}>deviation</Link>.
          </Notice>
        )}
        <DynamicTable
          config={publicationRules}
          rows={project.registers[publicationRules.key] ?? []}
          onSave={(rows) => setRegisterRowsBulk(id, publicationRules.key, rows)}
          readOnly={isGateRefLocked(project, publicationRules.gate)}
          hideGateNote
        />
        <RegisterApplicabilityBlock registerKey="publishedInfoApproval" readOnly={isGateRefLocked(project, publishedInfoApproval.gate)} />
        <PublishedInfoApprovalTable
          config={publishedInfoApproval}
          rows={approvalRows}
          claimEvidenceRows={project.registers['claimEvidenceTraceability'] ?? []}
          skuClaimRows={project.registers['skuClaimsPifRegister'] ?? []}
          onSave={(rows) => setRegisterRowsBulk(id, publishedInfoApproval.key, rows)}
          readOnly={locked}
          hideGateNote
        />
        {registerClosureGateIds(publishedInfoApproval).length > 0 && spec && (
          <RegisterClosurePanel
            projectId={id}
            registerKey={publishedInfoApproval.key}
            spec={spec}
            reviewers={project.identity.reviewers}
            closures={project.registerClosures}
          />
        )}
      </ClosingLayout>
    </div>
  );
}
