import { useMemo, useState } from 'react';
import { Card, Input, Tooltip } from 'antd';
import { DownOutlined, ExportOutlined, RightOutlined } from '@ant-design/icons';
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
// No row ships with a default URL, including Phase 2's Ingredient Registry, whose
// workbook cell does carry one — see the note on it in config/phases.ts.
// Collapsed by default: these are shortcuts, not something to read on every gate tab (2026-10-11). The one
// line says how many are linked, so a missing one is still visible. The open/closed choice is remembered
// per browser; a pending edit keeps it open so unsaved text is never hidden.
const OPEN_KEY = 'mbc360.keyLinksOpen';
function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

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

  const [openChoice, setOpenChoice] = useState(readOpen);
  const toggle = () => {
    const next = !openChoice;
    setOpenChoice(next);
    try {
      window.localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      // Remembering is a convenience; the card still works without it.
    }
  };

  if (links.length === 0) return null;

  const open = openChoice || dirty;
  const linked = links.length - external.filter((l) => !(committed[l.label] ?? '').trim()).length;

  return (
    <Card
      size="small"
      title={
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="phase-key-links-body"
          disabled={dirty}
          style={{
            display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: 0, border: 0,
            background: 'none', font: 'inherit', fontWeight: 600, textAlign: 'left', cursor: dirty ? 'default' : 'pointer',
          }}
        >
          {open ? <DownOutlined style={{ fontSize: 11 }} /> : <RightOutlined style={{ fontSize: 11 }} />}
          <span style={{ flex: 1 }}>Key records</span>
          <span style={{ fontWeight: 400, fontSize: 13, color: linked === links.length ? '#237804' : '#6b6b6b' }}>
            {linked} of {links.length} linked
          </span>
        </button>
      }
      styles={{ header: open ? undefined : { borderBottom: 0 }, body: open ? undefined : { display: 'none' } }}
    >
      <div id="phase-key-links-body" hidden={!open}>
      <div style={{ display: 'grid', gap: 8 }}>
        {links.map((link) => {
          if (link.href) {
            const to = link.absolute ? link.href : `/projects/${projectId}${link.href}`;
            return (
              <div key={link.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <span style={{ width: 220, flexShrink: 0, color: '#595959' }}>{link.label}</span>
                <Link to={to} style={{ fontWeight: 500 }}>
                  Open in MBc360
                </Link>
              </div>
            );
          }

          const target = draft[link.label]?.trim();
          return (
            <div key={link.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Tooltip title="Kept outside MBc360 — record the link to it here, as the workbook's own sheet does.">
                <span style={{ width: 220, flexShrink: 0, color: '#595959' }}>{link.label}</span>
              </Tooltip>
              <Input
                style={{ flex: '1 1 320px', maxWidth: 520 }}
                placeholder="Provide link here"
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
      </div>
    </Card>
  );
}
