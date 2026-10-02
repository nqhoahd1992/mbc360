import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dropdown, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  FolderAddOutlined,
  LockOutlined,
  ProjectOutlined,
  RightOutlined,
  SafetyOutlined,
  StarOutlined,
  ClockCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import {
  findNavGroupForRegister,
  formatGate,
  getNavGroups,
  getRegisterConfig,
  navItemHref,
} from '@mbc360/shared/config/registers';
import { ownerName, reviewRoleLabel } from '@mbc360/shared/config/reviewers';
import { currentGateIndex, phaseProgress } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { globalNavFor } from '../config/globalNav';
import './AppSidebar.css';

// The main sidebar (2026-10-03 redesign, wireframe option B): a dark icon RAIL
// for the app-level destinations, plus a light PANEL for whichever section is
// open — the project workspace or Administration.
//
// Why the split: the old single column put the five global/admin items at the
// top, pushing the project picker (the thing used all day) below them, and the
// menu grew to ~1500px on a 900px screen. Global pages now cost one rail button
// each, and the panel only ever holds one section.
//
// Which panel shows follows the route (a project URL opens the workspace, an
// admin URL opens Administration, a global page shows none), and the rail's
// Project / Admin buttons can open a panel without navigating — so you can
// browse the workspace from the Dashboard and only leave when you pick a page.

type Section = 'project' | 'admin';

const PROJECT_ROUTE = /^\/projects\/([^/]+)/;
const ADMIN_ROUTE = /^\/(admin\/|integrations$)/;

function routeSection(pathname: string): Section | null {
  if (PROJECT_ROUTE.test(pathname)) return 'project';
  if (ADMIN_ROUTE.test(pathname)) return 'admin';
  return null;
}

interface AppSidebarProps {
  isAdmin: boolean;
  /** Narrow screens: the sidebar is a drawer, so a panel always shows (a rail
   *  alone is no menu at all on a phone) and the rail labels its own buttons. */
  narrow: boolean;
}

export default function AppSidebar({ isAdmin, narrow }: AppSidebarProps) {
  const location = useLocation();
  const { pathname } = location;
  // A rail click opens a panel without navigating; the next navigation hands
  // control back to the route.
  const [override, setOverride] = useState<Section | null>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOverride(null);
  }
  const fromRoute = routeSection(pathname);
  const section: Section | null = override ?? fromRoute ?? (narrow ? 'project' : null);

  const railEntries = useMemo(() => globalNavFor(isAdmin).filter((e) => e.sidebar === 'rail'), [isAdmin]);
  const hasAdmin = useMemo(
    () => globalNavFor(isAdmin).some((e) => typeof e.sidebar === 'object' && e.sidebar !== null),
    [isAdmin],
  );

  const railButton = (key: Section, icon: ReactNode, label: string) => (
    <Tooltip title={narrow ? undefined : label} placement="right">
      <button
        type="button"
        className="sb-rail-btn"
        aria-current={section === key ? 'true' : undefined}
        aria-label={label}
        onClick={() => setOverride(key)}
      >
        {icon}
        <span>{key === 'project' ? 'Project' : 'Admin'}</span>
      </button>
    </Tooltip>
  );

  return (
    <div className="sb concept-tokens">
      <nav className="sb-rail" aria-label="Main">
        <Link to="/" className="sb-mark" aria-label="MBc360 — Dashboard" onClick={() => setOverride(null)}>
          M
        </Link>
        {railButton('project', <ProjectOutlined />, 'Project workspace')}
        {railEntries.map((e) => {
          const current = section === null && pathname === e.path;
          return (
            <Tooltip key={e.path} title={narrow ? undefined : e.title} placement="right">
              <Link
                to={e.path}
                className="sb-rail-btn"
                aria-current={current ? 'page' : undefined}
                aria-label={e.title}
                onClick={() => setOverride(null)}
              >
                {e.icon}
                <span>{e.railLabel ?? e.title}</span>
              </Link>
            </Tooltip>
          );
        })}
        {hasAdmin && railButton('admin', <SafetyOutlined />, 'Administration')}
      </nav>
      {section === 'project' && <ProjectPanel />}
      {section === 'admin' && <AdminPanel isAdmin={isAdmin} />}
    </div>
  );
}

// Scroll the panel so the current page's item is in view — arriving by ⌘K, a
// gate-blocker deep link or a bookmark would otherwise leave it far below the
// fold. Only the panel's own scroll box moves (scrollIntoView would also move
// the window), and nothing moves when the item is already visible.
// `key` changes whenever the item could have moved: the route, and anything
// that renders the panel's rows (the project arriving, a group opening).
function useScrollCurrentIntoView(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!box || !el) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 3);
    }
  }, [key]);
  return ref;
}

function Item({
  to,
  icon,
  label,
  meta,
  sub,
  note,
  current,
}: {
  to: string;
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  sub?: boolean;
  note?: ReactNode;
  current: boolean;
}) {
  return (
    <Link to={to} className={`sb-item${sub ? ' sb-sub' : ''}`} aria-current={current ? 'page' : undefined}>
      {icon && <span className="sb-icon">{icon}</span>}
      <span className="sb-lbl">
        <span className="sb-lbl-text">{label}</span>
        {note && <span className="sb-note">{note}</span>}
      </span>
      {meta && <span className="sb-meta">{meta}</span>}
    </Link>
  );
}

function ProjectPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const projects = useAppStore((s) => s.projects);
  const storedActiveProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const urlProjectId = pathname.match(PROJECT_ROUTE)?.[1];

  // The workspace stays pinned to the last visited project, even on global
  // pages. Kept in the store (not local state) so a global page like Change
  // Control can read the same project, e.g. to default a new request's Project.
  useEffect(() => {
    if (urlProjectId) setActiveProjectId(urlProjectId);
  }, [urlProjectId, setActiveProjectId]);

  const wanted = storedActiveProjectId ?? urlProjectId;
  const project = projects.find((p) => p.identity.id === wanted) ?? projects[0];
  const projectId = project?.identity.id;
  // One group open at a time; arriving on a page inside a group opens it.
  const activeGroupKey = useMemo(() => {
    if (!projectId) return undefined;
    const cat = pathname.match(/\/registers\/cat\/([^/]+)/)?.[1];
    if (cat) return cat;
    const reg = pathname.match(/\/registers\/reg\/([^/]+)/)?.[1];
    if (reg) return findNavGroupForRegister(reg)?.key;
    return getNavGroups().find((g) => g.items.some((it) => navItemHref(it, projectId) === pathname))?.key;
  }, [pathname, projectId]);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupKey ?? null);
  const [lastActive, setLastActive] = useState(activeGroupKey);
  if (lastActive !== activeGroupKey) {
    setLastActive(activeGroupKey);
    if (activeGroupKey) setOpenGroup(activeGroupKey);
  }

  const scrollRef = useScrollCurrentIntoView(`${pathname}|${projectId}|${openGroup}`);

  const switchProject = (id: string) => {
    setActiveProjectId(id);
    // Stay on the same workspace page when switching project.
    const subPath = urlProjectId ? pathname.replace(`/projects/${urlProjectId}`, '') : '';
    navigate(`/projects/${id}${subPath}`);
  };

  if (!project || !projectId) {
    return (
      <aside className="sb-panel" aria-label="Project workspace">
        <div className="sb-panel-title">Project workspace</div>
        <div className="sb-scroll">
          <Link to="/projects" className="sb-proj">
            <FolderAddOutlined className="sb-proj-icon" />
            <span className="sb-proj-text">
              <b>No project yet</b>
              <span>Create one from All Projects</span>
            </span>
          </Link>
        </div>
      </aside>
    );
  }

  const gateIdx = currentGateIndex(project);
  const gate = GATES[gateIdx];
  const reviewers = project.identity.reviewers;

  return (
    <aside className="sb-panel" aria-label="Project workspace">
      <div className="sb-panel-title">Project workspace</div>
      <div className="sb-scroll" ref={scrollRef}>
        <Dropdown
          trigger={['click']}
          menu={{
            selectable: true,
            selectedKeys: [projectId],
            items: projects.map((p) => ({ key: p.identity.id, label: `${p.identity.id} — ${p.identity.productSku}` })),
            onClick: ({ key }) => switchProject(key),
            style: { maxHeight: 360, overflowY: 'auto' },
          }}
        >
          <button type="button" className="sb-proj" aria-label={`Switch project — current: ${projectId}`}>
            <span className="sb-proj-text">
              <b>{projectId}</b>
              <span className="sb-trunc">{project.identity.productSku}</span>
              <span className="sb-proj-pos">
                <i className={`sb-dot${gate ? '' : ' sb-dot-ok'}`} aria-hidden />
                {gate ? `Gate ${gate.number} · Phase ${gate.phase}` : 'All gates passed'}
              </span>
            </span>
            <DownOutlined className="sb-proj-chev" aria-hidden />
          </button>
        </Dropdown>

        <div className="sb-label">Project</div>
        <Item
          to={`/projects/${projectId}`}
          icon={<AppstoreOutlined />}
          label="Overview"
          current={pathname === `/projects/${projectId}`}
        />
        {PHASES.map((ph) => {
          const progress = phaseProgress(project, ph.phase);
          const icon =
            progress.state === 'completed' ? (
              <CheckCircleOutlined className="sb-ok" />
            ) : progress.state === 'current' ? (
              <ClockCircleOutlined className="sb-cur" />
            ) : (
              <LockOutlined />
            );
          const to = `/projects/${projectId}/phase/${ph.phase}`;
          return (
            <Item
              key={ph.phase}
              to={to}
              icon={icon}
              label={`Phase ${ph.phase} · ${ph.subtitle.replace(/Gates [\d-]+ /, '').replace(/[()]/g, '')}`}
              meta={`${progress.passedGates}/${progress.totalGates}`}
              current={pathname === to}
            />
          );
        })}

        <div className="sb-label">Workbook</div>
        {/* "Everything below, filtered to me" — the digital replacement for the
            workbook's owner tab-prefix, so it heads the groups it narrows. */}
        <Item
          to={`/projects/${projectId}/my-sheets`}
          icon={<StarOutlined className="sb-cur" />}
          label="My Sheets"
          current={pathname === `/projects/${projectId}/my-sheets`}
        />
        {getNavGroups().map((group) => {
          const open = openGroup === group.key;
          // The person actually assigned to this area on THIS project — the
          // workbook's tab-name prefix digitised, never a name from config.
          const person = ownerName(group.reviewOwner, reviewers);
          const groupRole = group.reviewOwner?.owner.role;
          const overviewTo = `/projects/${projectId}/registers/cat/${group.key}`;
          return (
            <div key={group.key} className="sb-grp" data-open={open || undefined}>
              <button
                type="button"
                className="sb-item sb-grp-head"
                aria-expanded={open}
                onClick={() => setOpenGroup(open ? null : group.key)}
              >
                <RightOutlined className="sb-chev" />
                <span className="sb-lbl">
                  <span className="sb-lbl-text">{group.title}</span>
                  {person && <span className="sb-note">{person}</span>}
                </span>
              </button>
              {open && (
                <div className="sb-grp-body">
                  <Item to={overviewTo} label="Overview" sub current={pathname === overviewTo} />
                  {group.items.map((item, idx) => {
                    const to = navItemHref(item, projectId);
                    // Some sheets are deliberately filed outside their own
                    // review owner's group (10 R&I-owned sheets sit under
                    // Quality — a confirmed business remap). Naming the owner
                    // keeps that from reading as a contradiction against the
                    // page caption. A page-based item has no RegisterConfig to
                    // read it from, so it needs `item.reviewOwner` set directly.
                    const itemRole = item.registerKey
                      ? getRegisterConfig(item.registerKey)?.reviewOwner?.owner.role
                      : item.reviewOwner?.owner.role;
                    const otherOwner = !!itemRole && !!groupRole && itemRole !== groupRole;
                    return (
                      <Item
                        key={`${group.key}:${idx}`}
                        to={to}
                        label={item.title}
                        meta={formatGate(item.gate) || undefined}
                        note={otherOwner ? `Owner: ${reviewRoleLabel(itemRole)}` : undefined}
                        sub
                        current={pathname === to}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const { pathname } = useLocation();
  const scrollRef = useScrollCurrentIntoView(pathname);
  // Grouped by each entry's own `submenu` label, in first-appearance order, so
  // a new group in globalNav needs no change here.
  const groups = useMemo(() => {
    const order: string[] = [];
    const by = new Map<string, ReturnType<typeof globalNavFor>>();
    for (const e of globalNavFor(isAdmin)) {
      if (typeof e.sidebar !== 'object' || e.sidebar === null) continue;
      const label = e.sidebar.submenu;
      if (!by.has(label)) {
        by.set(label, []);
        order.push(label);
      }
      by.get(label)!.push(e);
    }
    return order.map((label) => ({ label, entries: by.get(label)! }));
  }, [isAdmin]);

  return (
    <aside className="sb-panel" aria-label="Administration">
      <div className="sb-panel-title">Administration</div>
      <div className="sb-scroll" ref={scrollRef}>
        {groups.map((g) => (
          <div key={g.label}>
            <div className="sb-label">{g.label}</div>
            {g.entries.map((e) => (
              <Item key={e.path} to={e.path} icon={e.icon} label={e.title} current={pathname === e.path} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
