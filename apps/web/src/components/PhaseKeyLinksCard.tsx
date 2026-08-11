import { useMemo } from 'react';
import { Card, Input, Tooltip } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { PhaseKeyLinkConfig } from '@mbc360/shared/config/phases';
import type { ProjectData } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

// The four shortcuts each phase sheet carries in its banner (cells E3/G3/I3/K3),
// rendered above Project Identification exactly where the workbook puts them.
// Content and mapping rules live in PhaseKeyLinkConfig — see config/phases.ts.
//
// Two kinds of row, and the difference is the whole point:
//   - a shortcut this app replaced (Formula BOM, PIF Checklist, …) is a link to
//     that page; there is nothing to type, the destination is the app itself;
//   - a shortcut that stays an outside document (Success Criteria Package,
//     Marketing Campaign Brief, …) gets the input the workbook draws as
//     "(provide link here)", stored per project on the phase closure.
//
// The one workbook cell carrying a real hyperlink (Phase 2's Ingredient Registry)
// uses that URL until a project records its own, so the company file is one click
// away without anyone re-pasting it.
export default function PhaseKeyLinksCard({
  links,
  project,
  phase,
}: {
  links: PhaseKeyLinkConfig[];
  project: ProjectData;
  phase: number;
}) {
  const setPhaseKeyLinks = useAppStore((s) => s.setPhaseKeyLinks);
  const projectId = project.identity.id;
  const archived = !!project.identity.archived;
  const external = links.filter((l) => !l.href);

  // Compared by value inside useDraft, so deriving this inline is safe.
  const committed = useMemo<Record<string, string>>(
    () => Object.fromEntries(external.map((l) => [l.label, project.phaseClosures[phase]?.keyLinks?.[l.label] ?? ''])),
    [external, project.phaseClosures, phase],
  );
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);

  const save = () => {
    setPhaseKeyLinks(projectId, phase, draft);
    markSaved();
  };

  if (links.length === 0) return null;

  return (
    <Card size="small" title="Key records for this phase">
      <div style={{ display: 'grid', gap: 8 }}>
        {links.map((link) => {
          if (link.href) {
            const to = link.absolute ? link.href : `/projects/${projectId}${link.href}`;
            return (
              <div key={link.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ width: 220, color: '#595959' }}>{link.label}</span>
                <Link to={to} style={{ fontWeight: 500 }}>
                  Open in MBc360
                </Link>
              </div>
            );
          }

          const recorded = draft[link.label]?.trim();
          const target = recorded || link.externalUrl;
          return (
            <div key={link.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Tooltip title="Kept outside MBc360 — record the link to it here, as the workbook's own sheet does.">
                <span style={{ width: 220, color: '#595959' }}>{link.label}</span>
              </Tooltip>
              <Input
                size="small"
                style={{ maxWidth: 520 }}
                placeholder={link.externalUrl ? 'Workbook link in use — paste a project-specific one to override' : 'Provide link here'}
                value={draft[link.label] ?? ''}
                disabled={archived}
                onChange={(e) => update((prev) => ({ ...prev, [link.label]: e.target.value }))}
              />
              {target && (
                <a href={target} target="_blank" rel="noopener noreferrer">
                  Open <ExportOutlined />
                </a>
              )}
            </div>
          );
        })}
      </div>
      {external.length > 0 && !archived && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </Card>
  );
}
