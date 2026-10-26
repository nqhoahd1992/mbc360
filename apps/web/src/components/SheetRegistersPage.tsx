import { Empty } from 'antd';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import ClosingLayout from './ClosingLayout';
import DynamicTable from './DynamicTable';
import RegisterClosurePanel from './RegisterClosurePanel';
import { CompositePageHeader } from './RegisterPageHeader';

// A workbook sheet that carries several tables, drawn as one page like the sheet: the tables in order in the main column, each with its
// closing block in the sidebar. The page names the sheet; the tables keep their own titles.
export default function SheetRegistersPage({
  title,
  description,
  configs,
}: {
  title: string;
  description: ReactNode;
  configs: RegisterConfig[];
}) {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);
  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const spec = registerReviewSpec(configs[0]);
  const reviewOwnerText = spec ? composeReviewOwner(spec, project.identity.reviewers) : undefined;

  return (
    <div className="concept">
      <CompositePageHeader project={project} title={title} description={description} reviewOwnerText={reviewOwnerText} />
      <ClosingLayout>
        {configs.map((config) => {
          const closeSpec = registerReviewSpec(config);
          return (
            <div key={config.key}>
              <DynamicTable
                config={config}
                rows={project.registers[config.key] ?? []}
                onSave={(rows) => setRegisterRowsBulk(id, config.key, rows)}
                readOnly={isGateRefLocked(project, config.gate)}
                hideGateNote
              />
              {registerClosureGateIds(config).length > 0 && closeSpec && (
                <RegisterClosurePanel
                  projectId={id}
                  registerKey={config.key}
                  spec={closeSpec}
                  reviewers={project.identity.reviewers}
                  closures={project.registerClosures}
                />
              )}
            </div>
          );
        })}
      </ClosingLayout>
    </div>
  );
}
