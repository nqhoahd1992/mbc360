import { Alert, Card, Empty, Progress, Tag, Typography } from 'antd';
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

    // C6: flag rows already published (final link filled) without a completed
    // approval workflow — "no public information until the workflow is done".
    const C6_STEPS = ['terminologyChecked', 'evidenceVerified', 'technicalReview', 'regulatoryReview', 'finalApproval'];
    const publishViolations =
      registerKey === 'publishedInfoApproval'
        ? (project.registers[registerKey] ?? []).filter(
            (row) =>
              typeof row.finalPublishedLink === 'string' &&
              row.finalPublishedLink.trim() !== '' &&
              C6_STEPS.some((step) => row[step] !== 'Y'),
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
            description={`No public information may be released until all five workflow steps are Y (rule C6). Review: ${publishViolations
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
    </div>
  );
}
