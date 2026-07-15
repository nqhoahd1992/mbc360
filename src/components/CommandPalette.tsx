import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PHASES } from '../config/gates';
import { getNavGroups, navItemHref } from '../config/registers';

interface Command {
  id: string;
  title: string;
  group: string;
  path: string;
  keywords?: string;
}

// Highlight the matched substring of `query` inside `text` (bold), like a palette.
function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <b>{text.slice(idx, idx + query.length)}</b>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useAppStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<InputRef>(null);

  const activeProjectId =
    location.pathname.match(/\/projects\/([^/]+)/)?.[1] ?? projects[0]?.identity.id;
  const activeProject = projects.find((p) => p.identity.id === activeProjectId);

  // Global Ctrl/Cmd+K shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  // Reset query + selection each time the palette opens, then focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the modal transition mounts the input.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: 'dashboard', title: 'Dashboard', group: 'Pages', path: '/' },
      { id: 'all-projects', title: 'All Projects', group: 'Pages', path: '/projects' },
      { id: 'change-control', title: 'Change Control', group: 'Pages', path: '/change-control' },
      { id: 'system-guide', title: 'System Guide', group: 'Pages', path: '/system-guide' },
    ];

    // Jump straight to any project's overview.
    for (const p of projects) {
      list.push({
        id: `project-${p.identity.id}`,
        title: `${p.identity.id} — ${p.identity.productSku}`,
        group: 'Projects',
        path: `/projects/${p.identity.id}`,
        keywords: `${p.identity.productCode} ${p.identity.brandCustomer} ${p.identity.productGroup}`,
      });
    }

    // Workspace + register targets for the current project context.
    if (activeProject) {
      const id = activeProject.identity.id;
      const ws = `${id} · Workspace`;
      list.push({ id: `ws-overview-${id}`, title: 'Overview', group: ws, path: `/projects/${id}` });
      for (const ph of PHASES) {
        const label = ph.subtitle.replace(/Gates [\d-]+ /, '').replace(/[()]/g, '');
        list.push({
          id: `ws-phase-${ph.phase}-${id}`,
          title: `Phase ${ph.phase} · ${label}`,
          group: ws,
          path: `/projects/${id}/phase/${ph.phase}`,
          keywords: ph.title,
        });
      }
      // Everything else is categorised by RESPONSIBILITY (department), covering
      // both registers and the department's dedicated pages (BOM, Change Control…).
      for (const grp of getNavGroups('department')) {
        const g = `${id} · ${grp.title}`;
        list.push({
          id: `reg-cat-${grp.key}-${id}`,
          title: `${grp.title} — Overview`,
          group: g,
          path: `/projects/${id}/registers/cat/${grp.key}`,
          keywords: 'overview',
        });
        for (const item of grp.items) {
          const itemKey = item.registerKey ?? item.page ?? item.href ?? item.title;
          list.push({
            id: `reg-${grp.key}-${itemKey}-${id}`,
            title: item.title,
            group: g,
            path: navItemHref(item, id),
            keywords: `${grp.title} ${item.sheetName ?? ''}`,
          });
        }
      }
    }

    return list;
  }, [projects, activeProject]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 8);
    const scored = commands
      .map((c) => {
        const hay = `${c.title} ${c.group} ${c.keywords ?? ''}`.toLowerCase();
        const titleIdx = c.title.toLowerCase().indexOf(q);
        const score = titleIdx === 0 ? 0 : titleIdx > 0 ? 1 : hay.includes(q) ? 2 : -1;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20)
      .map((x) => x.c);
    return scored;
  }, [query, commands]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (cmd?: Command) => {
    if (!cmd) return;
    navigate(cmd.path);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      styles={{ body: { padding: 0 } }}
      width={640}
      style={{ top: 96 }}
      destroyOnClose
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          ref={inputRef}
          size="large"
          variant="borderless"
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="Jump to a page, project or register…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
        {results.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>No matches</div>
        )}
        {results.map((cmd, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={cmd.id}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => go(cmd)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: active ? '#2f54eb' : 'transparent',
                color: active ? '#fff' : 'inherit',
              }}
            >
              <ArrowRightOutlined style={{ opacity: active ? 1 : 0.5 }} />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ opacity: active ? 0.85 : 0.55, fontSize: 12 }}>
                  Go to: {cmd.group}{' '}·{' '}
                </span>
                {highlight(cmd.title, query.trim())}
              </div>
              <span style={{ opacity: active ? 0.85 : 0.4, fontSize: 12 }}>View</span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
