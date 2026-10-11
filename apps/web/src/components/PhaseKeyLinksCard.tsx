import { useMemo, useState } from 'react';
import { Button, Input, Popover, Tooltip } from 'antd';
import { EditOutlined, ExportOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { PhaseKeyLinkConfig } from '@mbc360/shared/config/phases';
import type { ProjectData } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import './PhaseKeyLinksCard.css';

// The four shortcuts each phase sheet carries in its banner (cells E3/G3/I3/K3), as one strip under the
// phase heading, where the workbook puts them (2026-10-11, project owner's choice B). It was a card in the
// side rail of every gate tab, which read as noise next to the gate's readiness.
//
// Two kinds of chip, and the difference is the whole point:
//   - a shortcut this app replaced (Formula BOM, PIF Checklist, …) is a link to that page;
//   - a shortcut that stays an outside document (Success Criteria Package, Marketing Campaign Brief, …) is a
//     chip for the link recorded per project on the phase closure. Recorded: the chip opens it and a pencil
//     edits it. Not recorded: a dashed "+" chip, dimmed, that opens the box to paste one.
//
// No row ships with a default URL, including Phase 2's Ingredient Registry — see config/phases.ts.
// Editing is its own small Save (a popover is a commit point, like the app's other modal-gated flows), so
// there is no page-level draft here.
function LinkEditor({
  link,
  value,
  onSave,
  onClose,
}: {
  link: PhaseKeyLinkConfig;
  value: string;
  onSave: (next: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      // Closes only once the server has it; a refusal leaves what was typed.
      if (await onSave(text.trim())) onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="pkl-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="pkl-editor-label" htmlFor={`pkl-${link.label}`}>
        {link.label}
      </label>
      <Input
        id={`pkl-${link.label}`}
        autoFocus
        placeholder="Paste the link here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="pkl-editor-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={saving} disabled={text.trim() === value.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
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
  const [editing, setEditing] = useState<string | null>(null);

  const recorded = useMemo<Record<string, string>>(() => {
    const saved = project.phaseClosures[phase]?.keyLinks ?? {};
    return Object.fromEntries(links.filter((l) => !l.href).map((l) => [l.label, (saved[l.label] ?? '').trim()]));
  }, [links, project.phaseClosures, phase]);

  if (links.length === 0) return null;

  // The whole map is sent each time, so saving one chip never drops another.
  const saveOne = (label: string) => (next: string) => setPhaseKeyLinks(projectId, phase, { ...recorded, [label]: next });
  const linked = links.filter((l) => l.href || recorded[l.label]).length;

  return (
    <div className="pkl" role="group" aria-label="Key records for this phase">
      <span className="pkl-title">
        Key records
        <span className="pkl-count">
          {linked}/{links.length}
        </span>
      </span>
      <div className="pkl-chips">
        {links.map((link) => {
          if (link.href) {
            const to = link.absolute ? link.href : `/projects/${projectId}${link.href}`;
            return (
              <Link key={link.label} to={to} className="pkl-chip pkl-chip-on">
                <LinkOutlined />
                {link.label}
              </Link>
            );
          }
          const url = recorded[link.label];
          const editor = (
            <LinkEditor
              link={link}
              value={url}
              onSave={saveOne(link.label)}
              onClose={() => setEditing(null)}
            />
          );
          return (
            <Popover
              key={link.label}
              open={editing === link.label}
              onOpenChange={(o) => !o && setEditing(null)}
              trigger="click"
              placement="bottomLeft"
              destroyOnHidden
              content={editor}
            >
              {url ? (
                <span className="pkl-chip pkl-chip-on pkl-split">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="pkl-split-main">
                    <ExportOutlined />
                    {link.label}
                  </a>
                  {!archived && (
                    <Tooltip title="Change the link">
                      <button type="button" className="pkl-split-edit" aria-label={`Change the ${link.label} link`} onClick={() => setEditing(link.label)}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                  )}
                </span>
              ) : (
                <Tooltip
                  open={editing === link.label ? false : undefined}
                  title={archived ? 'The project is archived' : 'Kept outside MBC360 — record the link to it here'}
                >
                  <button
                    type="button"
                    className="pkl-chip pkl-chip-off"
                    disabled={archived}
                    onClick={() => setEditing(link.label)}
                  >
                    <PlusOutlined />
                    {link.label}
                  </button>
                </Tooltip>
              )}
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
