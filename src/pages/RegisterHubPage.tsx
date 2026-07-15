import { Card, Empty, Progress, Tag, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { REGISTER_CATEGORIES, getRegisterConfig, type RegisterConfig } from '../config/registers';
import type { RegisterRow } from '../types';
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
  const setRegisterRow = useAppStore((s) => s.setRegisterRow);
  const addRegisterRow = useAppStore((s) => s.addRegisterRow);
  const removeRegisterRow = useAppStore((s) => s.removeRegisterRow);

  const category = REGISTER_CATEGORIES.find((c) => c.key === categoryKey);

  if (!project || !category) return <Empty description="Not found" />;
  const id = project.identity.id;

  // --- Single-register view -------------------------------------------------
  if (registerKey) {
    const config = category.registerKeys.includes(registerKey) ? getRegisterConfig(registerKey) : undefined;
    if (!config) return <Empty description="Register not found" />;
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <Link to={`/projects/${id}/registers/${category.key}`}>{category.title}</Link>
          </Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {config.title}
          </Typography.Title>
        </div>
        <ProjectIdentificationCard identity={project.identity} />
        <DynamicTable
          config={config}
          rows={project.registers[registerKey] ?? []}
          onChangeCell={(index, colKey, value) => setRegisterRow(id, registerKey, index, colKey, value)}
          onAddRow={() => addRegisterRow(id, registerKey)}
          onRemoveRow={(index) => removeRegisterRow(id, registerKey, index)}
        />
      </div>
    );
  }

  // --- Category overview ----------------------------------------------------
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {category.title}
        </Typography.Title>
        <Typography.Text type="secondary">{category.description}</Typography.Text>
      </div>

      <ProjectIdentificationCard identity={project.identity} />

      <Card size="small" title={`Registers in this section (${category.registerKeys.length})`}>
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {category.registerKeys.map((key) => {
            const config = getRegisterConfig(key);
            if (!config) return null;
            const rows = project.registers[key] ?? [];
            const progress = registerProgress(config, rows);
            return (
              <Link key={key} to={`/projects/${id}/registers/${category.key}/${key}`} style={{ display: 'block' }}>
                <Card size="small" hoverable style={{ height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{config.title}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {config.sheetName}
                      </Typography.Text>
                    </div>
                    <RightOutlined style={{ color: '#bbb', marginTop: 4 }} />
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {config.gate && <Tag>Gate {config.gate}</Tag>}
                    <Tag color={config.mode === 'register' ? 'blue' : 'default'}>
                      {config.mode === 'register' ? 'Register' : 'Reference'}
                    </Tag>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                    </Typography.Text>
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
          })}
        </div>
      </Card>
    </div>
  );
}
