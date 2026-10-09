import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FolderOutlined,
  LockOutlined,
  SearchOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PHASES, phaseLabel } from '@mbc360/shared/config/gates';
import { formatGate, getNavGroups, getRegisterConfig, navItemHref } from '@mbc360/shared/config/registers';
import { currentGateNumber, phaseProgress } from '@mbc360/shared/utils/gateProgress';
import { globalNavFor } from '../config/globalNav';
import { usePermissionView } from '../auth/previewMode';
import './CommandPalette.css';

interface Command {
  id: string;
  title: string;
  group: string;
  path: string;
  keywords?: string;
  // Rows that share a path on purpose (a page's own row and the registers it
  // renders) de-duplicate on this instead.
  dedupeKey?: string;
  icon?: ReactNode;
  /** Short context on the right of the row: a gate, a phase's state. */
  context?: string;
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
  // Admin destinations follow the previewed role too (View as).
  const { isAdmin } = usePermissionView();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The same pinned project the sidebar shows, so the palette's workspace
  // group matches it even on a global page.
  const pinnedProjectId = useAppStore((s) => s.activeProjectId);

  const activeProjectId =
    location.pathname.match(/\/projects\/([^/]+)/)?.[1] ?? pinnedProjectId ?? projects[0]?.identity.id;
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
    // Every non-project destination, from the one list the sidebar also reads
    // (config/globalNav.tsx). This used to be three hardcoded entries, which is
    // how Integrations, My Account and Users & Roles came to be unreachable
    // here long after they existed in the menu.
    const list: Command[] = globalNavFor(isAdmin).map((entry) => ({
      id: `global-${entry.path}`,
      title: entry.title,
      group: 'Pages',
      path: entry.path,
      keywords: entry.keywords,
      icon: entry.icon,
    }));

    // Jump straight to any project's overview.
    for (const p of projects) {
      const gate = currentGateNumber(p);
      list.push({
        id: `project-${p.identity.id}`,
        title: `${p.identity.id} — ${p.identity.productSku}`,
        group: 'Projects',
        path: `/projects/${p.identity.id}`,
        keywords: `${p.identity.productCode} ${p.identity.brandCustomer} ${p.identity.productGroup}`,
        icon: <FolderOutlined />,
        context: gate ? `Gate ${gate}` : 'All gates passed',
      });
    }

    // Workspace + register targets for the current project context.
    if (activeProject) {
      const id = activeProject.identity.id;
      const ws = `${id} · Workspace`;
      // Same route as this project's row under Projects, kept as its own entry
      // so the workspace group starts with it rather than losing it to the
      // one-destination-one-row rule below.
      list.push({
        id: `ws-overview-${id}`,
        title: 'Overview',
        group: ws,
        path: `/projects/${id}`,
        icon: <AppstoreOutlined />,
        dedupeKey: `ws-overview-${id}`,
      });
      for (const ph of PHASES) {
        const progress = phaseProgress(activeProject, ph.phase);
        const gate = currentGateNumber(activeProject);
        list.push({
          id: `ws-phase-${ph.phase}-${id}`,
          title: phaseLabel(ph.phase),
          group: ws,
          path: `/projects/${id}/phase/${ph.phase}`,
          keywords: ph.title,
          icon:
            progress.state === 'completed' ? (
              <CheckCircleOutlined />
            ) : progress.state === 'current' ? (
              <ClockCircleOutlined />
            ) : (
              <LockOutlined />
            ),
          context:
            progress.state === 'completed'
              ? 'Complete'
              : progress.state === 'current' && gate
                ? `Current · Gate ${gate}`
                : undefined,
        });
      }
      list.push({
        id: `ws-my-sheets-${id}`,
        title: 'My Sheets',
        group: ws,
        path: `/projects/${id}/my-sheets`,
        keywords: 'mine responsibility review owner co-sign assigned to me',
        icon: <StarOutlined />,
      });
      // Everything else is categorised by RESPONSIBILITY (department), covering
      // both registers and the department's dedicated pages (BOM, Change Control…).
      for (const grp of getNavGroups()) {
        const g = `${id} · ${grp.title}`;
        list.push({
          id: `reg-cat-${grp.key}-${id}`,
          title: `${grp.title} — Overview`,
          group: g,
          path: `/projects/${id}/registers/cat/${grp.key}`,
          keywords: 'overview',
          icon: <AppstoreOutlined />,
        });
        for (const item of grp.items) {
          const itemKey = item.registerKey ?? item.page ?? item.href ?? item.title;
          list.push({
            id: `reg-${grp.key}-${itemKey}-${id}`,
            title: item.title,
            group: g,
            path: navItemHref(item, id),
            keywords: `${grp.title} ${item.sheetName ?? ''} ${item.workbookTab ?? ''}`,
            icon: <FileTextOutlined />,
            context: formatGate(item.gate) || undefined,
          });
          // The registers a dedicated page renders, each findable by its own
          // title and landing on that page (they have no route of their own).
          for (const key of item.contains ?? []) {
            const cfg = getRegisterConfig(key);
            if (!cfg) continue;
            list.push({
              id: `reg-${grp.key}-${itemKey}-${key}-${id}`,
              title: cfg.title,
              group: g,
              path: navItemHref(item, id),
              keywords: `${item.title} ${cfg.sheetName ?? ''}`,
              dedupeKey: `${navItemHref(item, id)}#${key}`,
              icon: <FileTextOutlined />,
              context: `in ${item.title}`,
            });
          }
        }
      }
    }

    // One destination, one row: Change Control is both a global page and a
    // workbook sheet under Sales & Marketing, and a register can sit in more
    // than one responsibility group — searching "change" should not return the
    // same page three times.
    const seen = new Set<string>();
    return list.filter((cmd) => {
      const key = cmd.dedupeKey ?? cmd.path;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [projects, activeProject, isAdmin]);

  // Empty query: the open project's workspace first (what people jump to
  // most), then projects, then the global pages. With a query: ranked as
  // before, then gathered under each result's group in the order its best
  // match appears, so the top hit still comes first.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Letters and digits only, so '&', ',', '_' and '-' never stand between a person and a match.
    const plain = (text: string) => text.toLowerCase().replace(/[^p{L}p{N}]+/gu, ' ');
    const words = plain(q).split(' ').filter(Boolean);
    let ranked: Command[];
    if (!q) {
      const ws = activeProject ? `${activeProject.identity.id} · Workspace` : undefined;
      ranked = [
        ...commands.filter((c) => c.group === ws),
        ...commands.filter((c) => c.group === 'Projects'),
        ...commands.filter((c) => c.group === 'Pages'),
      ];
    } else {
      ranked = commands
        .map((c) => {
          const hay = `${c.title} ${c.group} ${c.keywords ?? ''}`.toLowerCase();
          const titleIdx = c.title.toLowerCase().indexOf(q);
          let score = titleIdx === 0 ? 0 : titleIdx > 0 ? 1 : hay.includes(q) ? 2 : -1;
          if (score < 0 && words.length > 0) {
            // The words may appear in any order and with any punctuation between them: "Stability & Release"
            // must find "Stability, Compatibility & Release Evidence" and the sheet "Stability_Release".
            const hayWords = plain(`${c.title} ${c.group} ${c.keywords ?? ''}`);
            if (words.every((w) => hayWords.includes(w))) {
              score = words.every((w) => plain(c.title).includes(w)) ? 3 : 4;
            }
          }
          return { c, score };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 30)
        .map((x) => x.c);
    }
    const order: string[] = [];
    const by = new Map<string, Command[]>();
    for (const c of ranked) {
      if (!by.has(c.group)) {
        by.set(c.group, []);
        order.push(c.group);
      }
      by.get(c.group)!.push(c);
    }
    return order.map((group) => ({ group, items: by.get(group)! }));
  }, [query, commands, activeProject]);
  // Keyboard order is the order on screen.
  const results = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row visible while arrowing through a long list. Only
  // the list's own scroll box moves.
  useEffect(() => {
    const box = listRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!box || !el) return;
    if (el.offsetTop < box.scrollTop + 8) box.scrollTop = Math.max(0, el.offsetTop - 40);
    else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight - 8)
      box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 8;
  }, [activeIndex]);

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

  const q = query.trim();
  let index = -1;
  // 2026-10-03 redesign (wireframe option A): group headings instead of the
  // group repeated under every row, 40px rows with a type icon and the context
  // on the right, a light selected row instead of a primary-blue slab, and the
  // keys spelled out in a footer. "View" and the arrow on every row are gone.
  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      width={640}
      style={{ top: 96 }}
      rootClassName="concept-tokens cp-root"
      destroyOnHidden
    >
      <div className="cp">
        <div className="cp-in">
          <SearchOutlined className="cp-in-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, projects, workbook sheets…"
            aria-label="Search pages, projects, workbook sheets"
            role="combobox"
            aria-expanded
            aria-controls="cp-list"
            aria-activedescendant={results[activeIndex] ? `cp-${results[activeIndex].id}` : undefined}
          />
          <kbd className="cp-kbd">Esc</kbd>
        </div>
        <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty-title">No results for “{q}”</div>
              <p>Search looks at page names, projects and the workbook sheets of the open project.</p>
            </div>
          ) : (
            sections.map((s) => (
              <div key={s.group} role="group" aria-label={s.group}>
                <div className="cp-h">{s.group}</div>
                {s.items.map((cmd) => {
                  index += 1;
                  const i = index;
                  const active = i === activeIndex;
                  return (
                    <div
                      key={cmd.id}
                      id={`cp-${cmd.id}`}
                      role="option"
                      aria-selected={active}
                      data-index={i}
                      className="cp-row"
                      onMouseMove={() => setActiveIndex(i)}
                      onClick={() => go(cmd)}
                    >
                      <span className="cp-icon">{cmd.icon ?? <FileTextOutlined />}</span>
                      <span className="cp-title">{highlight(cmd.title, q)}</span>
                      {cmd.context && <span className="cp-ctx">{cmd.context}</span>}
                      <kbd className="cp-kbd cp-enter">↵</kbd>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="cp-foot">
          <span>
            <kbd className="cp-kbd">↑</kbd>
            <kbd className="cp-kbd">↓</kbd> to navigate
          </span>
          <span>
            <kbd className="cp-kbd">↵</kbd> to open
          </span>
          <span>
            <kbd className="cp-kbd">Esc</kbd> to close
          </span>
          {q && results.length > 0 && (
            <span className="cp-foot-count">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
