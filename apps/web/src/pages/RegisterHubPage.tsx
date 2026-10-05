import { Alert, Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import StudyApprovalCard from '../components/StudyApprovalCard';
import {
  findNavGroupForRegister,
  getNavGroup,
  getRegisterConfig,
  RELEASED_INFO_STATES,
  type RegisterConfig,
} from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { isGateRefLocked, gateRefHighestGateId } from '@mbc360/shared/utils/gateProgress';
import { isRegisterClosed } from '@mbc360/shared/types';
import DynamicTable from '../components/DynamicTable';
import VulnerableUserAssessmentTable from '../components/VulnerableUserAssessmentTable';
import SupplierRmEvidenceTable from '../components/SupplierRmEvidenceTable';
import PublishedInfoApprovalTable from '../components/PublishedInfoApprovalTable';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import SectionOverview from '../components/SectionOverview';
import { VULNERABLE_REGISTER } from '@mbc360/shared/utils/vulnerableUsers';
import WatchlistRegister from '../components/WatchlistRegister';
import RegisterPageHeader, { RegisterProgressCard } from '../components/RegisterPageHeader';
import { WATCHLIST_REGISTER } from '@mbc360/shared/utils/watchlistReview';

// Content transcribed verbatim from the source workbook's front-matter sheets
// "Introduction" and "Guide To Using This Document" (V18). Shown as the
// "Guide" tab of the dept-system ("System Guide & Reference") group, merged
// with that group's evidence template index / requirements / feedback
// registers so the two no longer live in separate, duplicate nav entries.
interface GuideRow {
  topic: string;
  instruction: string;
}

const INTRODUCTION: GuideRow[] = [
  { topic: 'Purpose', instruction: 'This workbook is the controlled project evidence record for MBc360. It now includes the product-development lifecycle, Skincare for Two checks, PIF mapping, study approvals and HCP/distributor evidence outputs.' },
  { topic: 'How to select multiple options', instruction: 'Use the one-click checkbox cells. Multiple checkboxes can be selected in each section.' },
  { topic: 'How to use dropdowns', instruction: 'Use dropdowns only where one status/decision/value should be selected.' },
  { topic: 'Notes / free typing', instruction: 'Use the notes areas and notes/action columns on each form.' },
  { topic: 'Evidence requirement', instruction: 'Every checked item that supports a decision should include evidence/reference, method reference, internal link, date and initials.' },
  { topic: 'Template style', instruction: 'Workbook uses the Max Biocare / MBc360 controlled document style.' },
  { topic: 'Skincare for Two', instruction: 'Maternal products must include maternal use plus baby-contact/infant exposure consideration; this is mandatory, not optional.' },
  { topic: 'Study paperwork', instruction: 'Human/consumer studies require proposal, participant plan, consent, adverse-event log and signatures before results support claims.' },
  // The workbook names three people here; digitised, they are the three roles the
  // C2 study-approval workflow already implements [ASSUMPTION: R5-Q3].
  { topic: 'Approval route', instruction: 'Current route: the Study Author prepares the study proposal, the Department Study Reviewer (head of department) signs off, and an Independent Reviewer from outside that department signs off — recorded on the Study Protocol register\'s approval trail.' },
  { topic: 'PIF layer', instruction: 'ASEAN PIF mapping is mandatory before dossier export or market submission.' },
  { topic: 'Ingredient proof', instruction: 'Use Prohibited_Ingredients, PB_Caution_Limits and Ingredient_Substitution to answer distributor/HCP questions.' },
  { topic: 'Medical summary', instruction: 'Use Medical_Summary as the ready-to-answer HCP/distributor evidence pack.' },
  { topic: 'Twinkle 5', instruction: 'Use Twinkle5_Claims_Map to connect skin-quality principles to evidence and claim controls.' },
  { topic: 'Workbook order', instruction: 'Product_Request -> Formula/Costing/Packaging -> Gates 01-12 -> Safety/PIF/HCP support sheets -> Evidence_Register -> PostMarket.' },
  { topic: 'Efficacy_Assurance', instruction: 'Use this first to check that efficacy is being controlled as clearly as safety.' },
  { topic: 'Mechanism_Claims_Map', instruction: 'Map each claim to the underlying problem, mechanism, ingredients, evidence level and approved wording.' },
  { topic: 'Potency_Process_Control', instruction: 'Control supply quality, active markers, heat/light/oxygen/pH/process risks and GMP evidence.' },
  { topic: 'V18 change-control additions', instruction: 'Change control and communication are now explicit: artwork, formula, label, claim, supplier, process and market changes require a trigger, owner, impact assessment, approval, communication and closure.' },
  { topic: 'No silent corrections', instruction: 'Artwork/label/formula changes must not be corrected informally or secretly. Use Change_Control_Comm and the relevant change-control sheet.' },
  { topic: 'Artwork changes', instruction: 'Use Artwork_Change_Control for redlines, proof approvals, printer release and obsolete version control.' },
  { topic: 'Formula changes', instruction: 'Use Formula_Change_Control for old-vs-new formula comparison and Sales/Marketing explanation.' },
  { topic: 'Sales/Marketing communication', instruction: 'Changes that affect label, formula, claims, product story, sensory profile, market material or customer answers require notification and acknowledgement.' },
  { topic: 'Templates/forms', instruction: 'Use Change_Templates for change request, artwork sign-off, formula comparison, Sales/Marketing notification and closure checklist.' },
  { topic: 'Closure', instruction: 'Close only when evidence is saved, approvals are complete, affected teams are notified and obsolete materials are controlled.' },
  { topic: 'Product evidence outputs', instruction: 'Use Product_Evidence_Summary, Test_Report_Index, Clinical_Human_Evidence, Eye_Safety_Evidence, Functional_Efficacy, Fragrance_Safety, Batch_Formula_Trace and HCP_Test_Report_Pack.' },
  { topic: 'PIF integration', instruction: 'Use PIF_Checklist_ASEAN for the full PIF List mapping; use ASEAN_PIF_Map as the high-level dossier overview.' },
  { topic: 'New sheets', instruction: 'PIF_Evidence_Export; SKU_Claims_PIF_Register; PIF_Evidence_Closure' },
  { topic: 'In-market priority', instruction: 'Complete LEMC and LEBC PIF evidence attachment first, then remaining in-market products.' },
  { topic: 'Summary-only rule', instruction: 'Ingredient mechanism tables support explanations only; full formula, reports, safety assessment and claim substantiation remain in the PIF.' },
  { topic: 'External use', instruction: 'No external HCP/distributor/pharmacy claim use until PIF attachment status and approval are closed.' },
];

const DATA_ENTRY_GUIDE: GuideRow[] = [
  { topic: 'Checkboxes', instruction: 'Click once in the checkbox cell to select or clear. Multiple options can be selected in the same section.' },
  { topic: 'Dropdowns', instruction: 'Use dropdowns for single-choice controlled fields such as stage status, decision, priority and Y/N/NA.' },
  { topic: 'Notes', instruction: 'Use notes/action columns or the free-type notes areas for explanations, caveats, customer comments or internal decisions.' },
  { topic: 'Evidence', instruction: 'Each completed check should reference evidence, method reference and internal link where applicable.' },
  { topic: 'Costing', instruction: 'Use the Costing_Calc, Formula_BOM and Packaging_BOM sheets for numeric inputs and formulas.' },
  { topic: 'Packaging / regulatory', instruction: 'Use the dedicated support sheets plus the relevant stage forms. Packaging is included in the main workbook.' },
];

// Per-register completion, derived from the register's own "status" column when present.
function registerProgress(config: RegisterConfig, rows: RegisterRow[]) {
  const statusCol = config.columns.find((c) => c.key === 'status' && c.type === 'select');
  if (!statusCol || rows.length === 0) return null;
  const completed = rows.filter((r) => {
    const v = r.status;
    return v === 'Completed' || v === 'Complete';
  }).length;
  return { completed, total: rows.length, percent: Math.round((completed / rows.length) * 100) };
}

export default function RegisterHubPage() {
  const { projectId, categoryKey, registerKey } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Not found" />;
  const id = project.identity.id;

  // --- Single-register view (category-agnostic route) -----------------------
  if (registerKey) {
    const config = getRegisterConfig(registerKey);
    if (!config) return <Empty description="Register not found" />;
    // Breadcrumb parent = this register's department group.
    const parent = findNavGroupForRegister(registerKey);

    // C6/F11: flag rows already published (final link filled) without a
    // completed approval workflow — "no public information until the workflow
    // reaches Approved for Release". A row violates if any step is not Y OR its
    // workflow state is not a released/approved state.
    const C6_STEPS = ['terminologyChecked', 'evidenceVerified', 'technicalReview', 'regulatoryReview', 'finalApproval'];
    const publishViolations =
      registerKey === 'publishedInfoApproval'
        ? (project.registers[registerKey] ?? []).filter(
            (row) =>
              typeof row.finalPublishedLink === 'string' &&
              row.finalPublishedLink.trim() !== '' &&
              (C6_STEPS.some((step) => row[step] !== 'Y') ||
                !RELEASED_INFO_STATES.includes(String(row.workflowState))),
          )
        : [];

    // Note the different signal: the C6 check above reads `finalPublishedLink`
    // and the five step columns and only WARNS, after the fact. Rule D2's guards
    // read `workflowState` and BLOCK the save — `publishedInfoViolations` in
    // PublishedInfoApprovalTable below and, authoritatively, in
    // ProjectsService.setRegisterRows. The two are separate mechanisms answering
    // separate questions ("did something go out unapproved?" vs "may this be
    // released?"), which is why they do not share a predicate.
    const claimEvidenceRows = project.registers['claimEvidenceTraceability'] ?? [];

    // Gate-level edit lock: read-only once every gate this register is tied to
    // has passed (config `gate`, e.g. '04' or '04/07'). Editing requires Backtrack.
    //
    // Register closing (2026-08-27) is a SECOND, independent read-only trigger
    // — a deliberate two-signature act (Review owner + Co-sign), rather than a
    // consequence of the gate having passed (closing is now a PRECONDITION for
    // that gate — see unclosedRegistersBlocking in gateProgress.ts). Only
    // registers with a specific gate (gateRefHighestGateId defined) are
    // closeable at all — the same universe isGateRefLocked already applies to.
    const closed = isRegisterClosed(project.registerClosures[registerKey]);
    const closeable = !!gateRefHighestGateId(config.gate);
    const locked = isGateRefLocked(project, config.gate) || closed;
    const lockedReason = closed
      ? 'Closed — both Review owner and Co-sign have signed. To correct it, withdraw a signature in the Register Closing card above, or Backtrack past the gate that depends on it.'
      : undefined; // undefined falls back to the gate-passed message, the other lock reason

    // Redesigned 2026-10-02 (wireframe option A): its own page layout — header,
    // progress, decision table + detail drawer, closing at the bottom. The pilot
    // for moving the other registers to the same concept.
    if (registerKey === WATCHLIST_REGISTER) {
      return (
        <WatchlistRegister
          project={project}
          config={config}
          rows={project.registers[registerKey] ?? []}
          parent={parent}
          onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
          readOnly={locked}
          readOnlyReason={lockedReason}
          closeable={closeable}
        />
      );
    }

    const progress = registerProgress(config, project.registers[registerKey] ?? []);

    // 2026-10-02 concept (approved on the Prohibited Ingredient Watch-list): one
    // header line instead of the Project Identification + Review owner cards,
    // the table in its compact form with a detail drawer, and the closing card
    // at the bottom, after the rows it signs off.
    return (
      <div className="concept">
        <RegisterPageHeader
          project={project}
          config={config}
          parent={parent}
          readOnly={locked}
          readOnlyReason={lockedReason}
        />
        {progress && <RegisterProgressCard completed={progress.completed} total={progress.total} />}
        {registerKey === 'studyProtocolSetup' && (
          <StudyApprovalCard projectId={id} approvals={project.studyApprovals} />
        )}
        {publishViolations.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={`${publishViolations.length} item${publishViolations.length > 1 ? 's' : ''} published without a completed approval workflow`}
            description={`No public information may be released until all five workflow steps are Y and the workflow state is "Approved for Release" or "Released" (rules C6 / F11). Review: ${publishViolations
              .map((r) => String(r.recordId || r.publishedItem || 'unnamed item'))
              .join(', ')}.`}
          />
        )}
        {registerKey === 'supplierRmEvidence' ? (
          // F14-style Cosmetri raw-material picker for rmCode/grade/supplier —
          // see the tradeoffs noted in docs/rules/F1_Per_Gate_Open_Questions.md.
          <SupplierRmEvidenceTable
            config={config}
            rows={project.registers[registerKey] ?? []}
            bom={project.bom}
            onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
            readOnly={locked}
            readOnlyReason={lockedReason}
            embedded
          />
        ) : registerKey === 'publishedInfoApproval' ? (
          // Claim ID picker (Supported claims only) + auto-filled/locked
          // wording — see PublishedInfoApprovalTable.tsx.
          <PublishedInfoApprovalTable
            config={config}
            rows={project.registers[registerKey] ?? []}
            claimEvidenceRows={claimEvidenceRows}
            skuClaimRows={project.registers['skuClaimsPifRegister'] ?? []}
            onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
            readOnly={locked}
            readOnlyReason={lockedReason}
            embedded
          />
        ) : registerKey === VULNERABLE_REGISTER ? (
          // B5 keeps the target-user selection and the vulnerable-use
          // recognition separate, but they must not contradict each other.
          // Its own component since 2026-10-05 (approved wireframe, option B):
          // the yes/no question comes first, so "none" and a named group can no
          // longer both be drafted — see VulnerableUserAssessmentTable.tsx.
          <VulnerableUserAssessmentTable
            project={project}
            rows={project.registers[registerKey] ?? []}
            onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
            readOnly={locked}
            readOnlyReason={lockedReason}
          />
        ) : (
          <DynamicTable
            config={config}
            rows={project.registers[registerKey] ?? []}
            onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
            readOnly={locked}
            readOnlyReason={lockedReason}
            embedded
          />
        )}
        {closeable && config.reviewOwner && (
          <RegisterClosurePanel
            projectId={id}
            registerKey={registerKey}
            spec={config.reviewOwner}
            reviewers={project.identity.reviewers}
            closure={project.registerClosures[registerKey]}
          />
        )}
      </div>
    );
  }

  // --- Group overview -------------------------------------------------------
  const group = getNavGroup(categoryKey);
  if (!group) return <Empty description="Not found" />;
  return (
    <SectionOverview
      project={project}
      group={group}
      guide={
        group.key === 'dept-system'
          ? [
              { title: 'Introduction', rows: INTRODUCTION },
              { title: 'Guide To Using This Document', rows: DATA_ENTRY_GUIDE },
            ]
          : undefined
      }
    />
  );
}
