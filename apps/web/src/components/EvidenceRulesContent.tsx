import {
  evidenceHierarchyGrades,
  evidenceSearchStandard,
  evidenceTransferabilityRules,
} from '@mbc360/shared/config/registers';
import type { ProjectData } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import DynamicTable from './DynamicTable';
import './EvidenceRulesContent.css';

// The three reference tables of the corporate evidence rulebook ("6. Evidence & Search Rules"): grades, transferability tests and
// the literature-search standard. Shared by the popup the Sheet 1-5 pages open and by the page itself.
export default function EvidenceRulesContent({ project }: { project: ProjectData }) {
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);
  const id = project.identity.id;
  return (
    <div className="concept erc">
      {[evidenceHierarchyGrades, evidenceTransferabilityRules, evidenceSearchStandard].map((config) => (
        <DynamicTable
          key={config.key}
          config={config}
          rows={project.registers[config.key] ?? []}
          onSave={(rows) => setRegisterRowsBulk(id, config.key, rows)}
          referenceTable
        />
      ))}
    </div>
  );
}
