import { Empty, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { REGISTER_CATEGORIES, getRegisterConfig } from '../config/registers';
import DynamicTable from '../components/DynamicTable';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';

export default function RegisterHubPage() {
  const { projectId, categoryKey } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRow = useAppStore((s) => s.setRegisterRow);
  const addRegisterRow = useAppStore((s) => s.addRegisterRow);
  const removeRegisterRow = useAppStore((s) => s.removeRegisterRow);

  const category = REGISTER_CATEGORIES.find((c) => c.key === categoryKey);

  if (!project || !category) return <Empty description="Not found" />;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {category.title}
        </Typography.Title>
        <Typography.Text type="secondary">{category.description}</Typography.Text>
      </div>

      <ProjectIdentificationCard identity={project.identity} />

      {category.registerKeys.map((key) => {
        const config = getRegisterConfig(key);
        if (!config) return null;
        return (
          <DynamicTable
            key={key}
            config={config}
            rows={project.registers[key] ?? []}
            onChangeCell={(index, colKey, value) => setRegisterRow(project.identity.id, key, index, colKey, value)}
            onAddRow={() => addRegisterRow(project.identity.id, key)}
            onRemoveRow={(index) => removeRegisterRow(project.identity.id, key, index)}
          />
        );
      })}
    </div>
  );
}
