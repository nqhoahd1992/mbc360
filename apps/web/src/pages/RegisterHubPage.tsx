import { Alert, Card, Empty, Progress, Table, Tabs, Tag, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import StudyApprovalCard from '../components/StudyApprovalCard';
import {
  findNavGroupForRegister,
  getNavGroup,
  getRegisterConfig,
  navItemHref,
  type NavItem,
  type RegisterConfig,
} from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

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
  { topic: 'Approval route', instruction: 'Current route: Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department.' },
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

const guideColumns = [
  { title: 'Topic', dataIndex: 'topic', width: 260 },
  { title: 'Instruction', dataIndex: 'instruction' },
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
    const RELEASED_STATES = ['Approved for Release', 'Released'];
    const publishViolations =
      registerKey === 'publishedInfoApproval'
        ? (project.registers[registerKey] ?? []).filter(
            (row) =>
              typeof row.finalPublishedLink === 'string' &&
              row.finalPublishedLink.trim() !== '' &&
              (C6_STEPS.some((step) => row[step] !== 'Y') ||
                !RELEASED_STATES.includes(String(row.workflowState))),
          )
        : [];

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          {parent && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              <Link to={`/projects/${id}/registers/cat/${parent.key}`}>{parent.title}</Link>
            </Typography.Text>
          )}
          <Typography.Title level={4} style={{ margin: 0 }}>
            {config.title}
          </Typography.Title>
        </div>
        <ProjectIdentificationCard identity={project.identity} />
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
        <DynamicTable
          config={config}
          rows={project.registers[registerKey] ?? []}
          onSave={(nextRows) => setRegisterRowsBulk(id, registerKey, nextRows)}
        />
      </div>
    );
  }

  // --- Group overview -------------------------------------------------------
  const group = getNavGroup(categoryKey);
  if (!group) return <Empty description="Not found" />;

  const renderCard = (item: NavItem) => {
    const config = item.registerKey ? getRegisterConfig(item.registerKey) : undefined;
    const rows = item.registerKey ? project.registers[item.registerKey] ?? [] : [];
    const progress = config ? registerProgress(config, rows) : null;
    return (
      <Link key={item.registerKey ?? item.title} to={navItemHref(item, id)} style={{ display: 'block' }}>
        <Card size="small" hoverable style={{ height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              {item.sheetName && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {item.sheetName}
                </Typography.Text>
              )}
            </div>
            <RightOutlined style={{ color: '#bbb', marginTop: 4 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {config?.gate && <Tag>Gate {config.gate}</Tag>}
            {config ? (
              <Tag color={config.mode === 'register' ? 'blue' : 'default'}>
                {config.mode === 'register' ? 'Register' : 'Reference'}
              </Tag>
            ) : (
              <Tag color="purple">Page</Tag>
            )}
            {config && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {rows.length} {rows.length === 1 ? 'row' : 'rows'}
              </Typography.Text>
            )}
          </div>
          {progress && (
            <Progress
              size="small"
              percent={progress.percent}
              style={{ marginTop: 8 }}
              format={() => `${progress.completed}/${progress.total}`}
            />
          )}
        </Card>
      </Link>
    );
  };

  const sheetsCard = (
    <Card size="small" title={`Sheets in this section (${group.items.length})`}>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {group.items.map(renderCard)}
      </div>
    </Card>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {group.title}
        </Typography.Title>
        <Typography.Text type="secondary">{group.description}</Typography.Text>
        {group.reviewOwner && (
          <div style={{ marginTop: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Review owner: {group.reviewOwner}
            </Typography.Text>
          </div>
        )}
      </div>

      <ProjectIdentificationCard identity={project.identity} />

      {group.key === 'dept-system' ? (
        <Tabs
          defaultActiveKey="guide"
          items={[
            {
              key: 'guide',
              label: 'Guide',
              children: (
                <div style={{ display: 'grid', gap: 16 }}>
                  <Card size="small" title="Introduction">
                    <Table
                      size="small"
                      rowKey="topic"
                      dataSource={INTRODUCTION}
                      columns={guideColumns}
                      pagination={false}
                      scroll={{ x: 720 }}
                    />
                  </Card>
                  <Card size="small" title="Guide To Using This Document">
                    <Table
                      size="small"
                      rowKey="topic"
                      dataSource={DATA_ENTRY_GUIDE}
                      columns={[{ title: 'Feature', dataIndex: 'topic', width: 260 }, { title: 'How to use', dataIndex: 'instruction' }]}
                      pagination={false}
                      scroll={{ x: 720 }}
                    />
                  </Card>
                </div>
              ),
            },
            { key: 'reference', label: 'Reference & Feedback', children: sheetsCard },
          ]}
        />
      ) : (
        sheetsCard
      )}
    </div>
  );
}
