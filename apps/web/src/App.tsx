import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, App as AntApp, ConfigProvider, Divider, Layout, Menu, Button, Grid, Select, Spin, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  DatabaseOutlined,
  EyeOutlined,
  LockOutlined,
  MenuOutlined,
  RightCircleFilled,
  SearchOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { SSO_ROLES } from './utils/roles';
import { useSession } from './auth/useSession';
import AuthStatus from './components/AuthStatus';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
import AdminMarketProfiles from './pages/AdminMarketProfiles';
import AdminRmRisk from './pages/AdminRmRisk';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectOverview from './pages/ProjectOverview';
import PhasePage from './pages/PhasePage';
import BomCosting from './pages/BomCosting';
import ChangeControl from './pages/ChangeControl';
import EvidenceSummary from './pages/EvidenceSummary';
import PostMarketCapa from './pages/PostMarketCapa';
import ProductFeedback from './pages/ProductFeedback';
import RegisterHubPage from './pages/RegisterHubPage';
import CommandPalette from './components/CommandPalette';
import UnsavedChangesGuard from './components/UnsavedChangesGuard';
import PageSkeleton from './components/PageSkeleton';
import FormulationSafety from './pages/FormulationSafety';
import NeedsScientificBasis from './pages/NeedsScientificBasis';
import CompetitorLandscape from './pages/CompetitorLandscape';
import TargetProductTech from './pages/TargetProductTech';
import EvidenceClaimSupport from './pages/EvidenceClaimSupport';
import EvidenceSearchRules from './pages/EvidenceSearchRules';
import GateRulesMap from './pages/GateRulesMap';
import MySheets from './pages/MySheets';
import IntegrationsPage from './pages/IntegrationsPage';
import MyAccount from './pages/MyAccount';
import Login from './pages/Login';
import { PHASES } from '@mbc360/shared/config/gates';
import { ADMIN_SUBMENU, REFERENCE_DATA_SUBMENU, globalNavFor } from './config/globalNav';
import { getNavGroups, findNavGroupForRegister, getRegisterConfig, navItemHref, formatGate } from '@mbc360/shared/config/registers';
import { ownerName, reviewRoleLabel } from '@mbc360/shared/config/reviewers';
import { phaseProgress } from '@mbc360/shared/utils/gateProgress';
import { TEXT } from './theme/tokens';

const { Sider, Header, Content } = Layout;

function ProjectContextTitle() {
  const location = useLocation();
  const match = location.pathname.match(/\/projects\/([^/]+)/);
  const projectId = match?.[1];
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  if (!project) return <span>MBc360 Development & Quality System</span>;
  return (
    <span>
      <Link to={`/projects/${project.identity.id}`} style={{ color: 'inherit' }}>
        {project.identity.id}
      </Link>{' '}
      — {project.identity.productSku}
    </span>
  );
}

function SideMenu({ isAdmin }: { isAdmin: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const projects = useAppStore((s) => s.projects);

  const urlProjectId = location.pathname.match(/\/projects\/([^/]+)/)?.[1];
  // Lives in the store now (2026-08-26), not local state, so a global page
  // like Change Control can read the same "pinned" project — e.g. to default
  // Open Change Request's Project field. `?? urlProjectId` covers the render
  // before the effect below has run (e.g. arriving directly on a project URL
  // in a fresh tab, before the store value catches up).
  const storedActiveProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const activeProjectId = storedActiveProjectId ?? urlProjectId;

  // Keep the workspace pinned to the last visited project, even on global pages
  useEffect(() => {
    if (urlProjectId) setActiveProjectId(urlProjectId);
  }, [urlProjectId, setActiveProjectId]);

  // Now that the menu scrolls inside its own column, the highlighted item can
  // sit outside it — arriving via ⌘K, a gate-blocker deep link or a bookmark
  // would show a sidebar scrolled somewhere else entirely, with nothing marking
  // where you are. `block: 'nearest'` is a no-op when the item is already
  // visible, so ordinary clicking never moves the menu.
  useEffect(() => {
    const selected = document.querySelector('.ant-layout-sider .ant-menu-item-selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [location.pathname]);

  const projectId =
    activeProjectId && projects.some((p) => p.identity.id === activeProjectId)
      ? activeProjectId
      : projects[0]?.identity.id;

  const onSwitchProject = (id: string) => {
    setActiveProjectId(id);
    // Stay on the same workspace tab when switching project
    const subPath = urlProjectId
      ? location.pathname.replace(`/projects/${urlProjectId}`, '')
      : '';
    navigate(`/projects/${id}${subPath}`);
  };

  // Built from the same GLOBAL_NAV the ⌘K palette reads, so a page added in one
  // place cannot go missing from the other (which is exactly what had happened
  // to Integrations, My Account and Users & Roles).
  //
  // Nested entries are grouped by their OWN `submenu` label (2026-08-26) — this
  // used to dump every nested entry into one hardcoded "Users & Roles" bucket
  // regardless of what `submenu` said, which is why Market profiles / Raw
  // material risk (company-wide reference data, unrelated to user/role admin)
  // ended up filed there. Each distinct label now gets its own top-level group,
  // in the order that label first appears in GLOBAL_NAV.
  const globalItems = useMemo(() => {
    const entries = globalNavFor(isAdmin);
    const top = entries
      .filter((e) => e.sidebar === 'top')
      .map((e) => ({ key: e.path, icon: e.icon, label: <Link to={e.path}>{e.title}</Link> }));
    const nested = entries.filter(
      (e): e is typeof e & { sidebar: { submenu: string } } =>
        typeof e.sidebar === 'object' && e.sidebar !== null,
    );
    if (nested.length === 0) return top;
    const submenuOrder: string[] = [];
    const bySubmenu = new Map<string, typeof nested>();
    for (const e of nested) {
      const label = e.sidebar.submenu;
      if (!bySubmenu.has(label)) {
        bySubmenu.set(label, []);
        submenuOrder.push(label);
      }
      bySubmenu.get(label)!.push(e);
    }
    const submenuIcons: Record<string, ReactNode> = {
      [ADMIN_SUBMENU]: <TeamOutlined />,
      [REFERENCE_DATA_SUBMENU]: <DatabaseOutlined />,
    };
    return [
      ...top,
      ...submenuOrder.map((label) => ({
        key: `nav-submenu-${label}`,
        icon: submenuIcons[label] ?? <TeamOutlined />,
        label,
        children: bySubmenu.get(label)!.map((e) => ({
          key: e.path,
          label: <Link to={e.path}>{e.title}</Link>,
        })),
      })),
    ];
  }, [isAdmin]);

  const activeProject = projects.find((p) => p.identity.id === projectId);

  const workspaceItems = useMemo(() => {
    if (!projectId || !activeProject) return [];
    const items = [
      { key: `/projects/${projectId}`, label: <Link to={`/projects/${projectId}`}>Overview</Link> },
      // My Sheets used to sit here, between Overview and Phase 1. It is a LENS
      // over the workbook groups, not a step in the process, so it broke the
      // one sequence this block exists to show — Overview → Phase 1 → 2 → 3 → 4.
      // It now heads the WORKBOOK BY RESPONSIBILITY section instead, which is
      // the thing it filters.
      ...PHASES.map((ph) => {
        const progress = phaseProgress(activeProject, ph.phase);
        const icon =
          progress.state === 'completed' ? (
            <CheckCircleFilled style={{ color: '#52c41a' }} />
          ) : progress.state === 'current' ? (
            <RightCircleFilled style={{ color: '#faad14' }} />
          ) : (
            <LockOutlined style={{ color: 'rgba(255,255,255,0.35)' }} />
          );
        return {
          key: `/projects/${projectId}/phase/${ph.phase}`,
          icon,
          label: (
            <Link to={`/projects/${projectId}/phase/${ph.phase}`}>
              Phase {ph.phase} · {ph.subtitle.replace(/Gates [\d-]+ /, '').replace(/[()]/g, '')}{' '}
              <span style={{ opacity: 0.65 }}>
                ({progress.passedGates}/{progress.totalGates})
              </span>
            </Link>
          ),
        };
      }),
    ];
    return items;
  }, [projectId, activeProject]);

  // Evidence-register submenus, grouped by responsibility (the DEPARTMENTS
  // config). Leaf keys are synthetic (a page can appear under several
  // groups, so keys can't just be the route); selection is computed by path
  // match below.
  const registerItems = useMemo(() => {
    if (!projectId) return [];
    const reviewers = activeProject?.identity.reviewers;
    // "Everything below, filtered to me" — the digital replacement for the
    // workbook's owner tab-prefix, so it belongs at the top of the groups it
    // narrows rather than in the phase sequence above.
    const mySheets = {
      key: `/projects/${projectId}/my-sheets`,
      icon: <StarOutlined style={{ color: '#faad14' }} />,
      label: <Link to={`/projects/${projectId}/my-sheets`}>My Sheets</Link>,
    };
    return [mySheets, ...getNavGroups().map((group) => {
      // The group is labelled with the person actually assigned to it on THIS
      // project (the workbook's tab-name prefix digitised — see reviewers.ts),
      // not a name baked into config.
      const groupOwner = ownerName(group.reviewOwner, reviewers);
      const groupRole = group.reviewOwner?.owner.role;
      return {
        key: `registers-sub-${group.key}`,
        label: (
          <span>
            {group.title}
            {groupOwner && (
              <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 11, fontWeight: 400 }}>
                {groupOwner}
              </span>
            )}
          </span>
        ),
        children: [
          {
            key: `cat:${group.key}`,
            label: <Link to={`/projects/${projectId}/registers/cat/${group.key}`}>Overview</Link>,
          },
          ...group.items.map((item, idx) => {
            const gate = formatGate(item.gate);
            // Some sheets are deliberately filed outside their own review
            // owner's group (10 R&I-owned sheets sit under "Quality" — a
            // confirmed business remap, see CLAUDE.md). Without this badge the
            // sidebar reads "Quality" while the page caption reads "…(R&I)",
            // which looks like a contradiction rather than a decision.
            // A register item's owner comes from its own RegisterConfig; a
            // page-based item (no registerKey) has no config to look one up
            // from, so it needs `item.reviewOwner` set directly in
            // registers.ts or this badge can never fire for it at all
            // (found 2026-08-27 — see the note on "Formulation Safety" there).
            const itemRole = item.registerKey
              ? getRegisterConfig(item.registerKey)?.reviewOwner?.owner.role
              : item.reviewOwner?.owner.role;
            const showOwnerBadge = !!itemRole && !!groupRole && itemRole !== groupRole;
            return {
              key: `${group.key}:${idx}`,
              label: (
                <Link to={navItemHref(item, projectId)}>
                  {item.title}
                  {gate && (
                    <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 11 }}>{gate}</span>
                  )}
                  {showOwnerBadge && (
                    <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 11 }}>
                      · {reviewRoleLabel(itemRole)}
                    </span>
                  )}
                </Link>
              ),
            };
          }),
        ],
      };
    })];
  }, [projectId, activeProject]);

  // Highlight every leaf whose route matches the current path.
  const registerSelectedKeys = useMemo(() => {
    if (!projectId) return [];
    const keys: string[] = [];
    // My Sheets now lives in this menu (see registerItems), and its key is the
    // route itself rather than a `group:index` pair — without this it would
    // render unhighlighted while you are standing on it.
    if (location.pathname === `/projects/${projectId}/my-sheets`) {
      keys.push(`/projects/${projectId}/my-sheets`);
    }
    for (const group of getNavGroups()) {
      if (location.pathname === `/projects/${projectId}/registers/cat/${group.key}`) {
        keys.push(`cat:${group.key}`);
      }
      group.items.forEach((item, idx) => {
        if (navItemHref(item, projectId) === location.pathname) keys.push(`${group.key}:${idx}`);
      });
    }
    return keys;
  }, [projectId, location.pathname]);

  // Keep the register submenu for the current route expanded. Register
  // deep-links are category-agnostic, so resolve the parent submenu from the
  // register key.
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const catInPath = location.pathname.match(/\/registers\/cat\/([^/]+)/)?.[1];
  const regInPath = location.pathname.match(/\/registers\/reg\/([^/]+)/)?.[1];
  // A department can also link to a dedicated page (BOM, Change Control, …); when
  // the current route matches one of those, open its submenu too.
  const pageGroup =
    !catInPath && !regInPath && projectId
      ? getNavGroups().find((g) => g.items.some((it) => navItemHref(it, projectId) === location.pathname))
      : undefined;
  const activeSubKey = catInPath
    ? `registers-sub-${catInPath}`
    : regInPath
      ? `registers-sub-${findNavGroupForRegister(regInPath)?.key}`
      : pageGroup
        ? `registers-sub-${pageGroup.key}`
        : undefined;
  useEffect(() => {
    if (activeSubKey) {
      setOpenKeys((prev) => (prev.includes(activeSubKey) ? prev : [...prev, activeSubKey]));
    }
  }, [activeSubKey]);

  return (
    <>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['admin-users-roles']}
        items={globalItems as never}
      />
      {projectId && (
        <>
          <div
            style={{
              padding: '16px 16px 8px',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 12,
              letterSpacing: 0.5,
            }}
          >
            PROJECT WORKSPACE
          </div>
          <div style={{ padding: '0 12px 8px' }}>
            <Select
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
              placeholder="Select project"
              value={projectId}
              onChange={onSwitchProject}
              optionRender={(opt) => <span style={{ whiteSpace: 'normal' }}>{opt.label}</span>}
              options={projects.map((p) => ({
                value: p.identity.id,
                label: `${p.identity.id} — ${p.identity.productSku}`,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={workspaceItems as never}
          />

          <div
            style={{
              padding: '16px 16px 8px',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 12,
              letterSpacing: 0.5,
            }}
          >
            WORKBOOK BY RESPONSIBILITY
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={registerSelectedKeys}
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            items={registerItems as never}
          />
        </>
      )}
    </>
  );
}

// Keeps the sidebar visible while the (window-level) page scrolls.
// The sidebar is its own scroll region, pinned to the viewport.
//
// It used to be a sticky block whose full height (60+ register links across ten
// groups) participated in the PAGE scroll, bottom-pinning once you had scrolled
// past it. That made the MENU the tallest thing on the page, so the document
// stayed scrollable even on a screen with two cards on it — and since router
// navigation does not reset scroll, arriving from a long page left the window
// scrolled far past the whole of a short one: a blank content area with the
// menu's tail beside it (reported 2026-08-22 with a screenshot of exactly
// that). Now the document is only as tall as the CONTENT, and the menu scrolls
// inside its own 100vh column.
//
// Scroll chaining is deliberately LEFT ON (no `overscroll-behavior: contain`):
// a contained scroll port blocks chaining as soon as it is at a boundary, and a
// menu shorter than the viewport is always at its boundary — so containing it
// would turn the whole left column into a dead zone for the wheel. Chaining is
// also harmless now that the page itself is short.
function StickySidebar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        // Pinned on BOTH axes. `top` alone leaves the menu free to scroll off
        // to the left the moment anything makes the document wider than the
        // viewport — reported with a screenshot of exactly that. The page
        // should not scroll sideways at all now (see index.css), so this is the
        // second line of defence rather than the fix.
        left: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

// Router navigation leaves window.scrollY where it was, which is right for
// Back and wrong for everything else.
//
// Deliberately narrow: only a PATHNAME change resets — a query-string change
// must not, or every keystroke in the Sheet Map's search box (it writes filters
// to the URL) would yank the page to the top. A POP is left alone so Back
// returns you where you were, and a `?scrollTo=` deep link is left alone
// because that page is about to scroll to a section itself.
function ScrollToTopOnNavigate() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (navigationType === 'POP') return;
    if (new URLSearchParams(search).has('scrollTo')) return;
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname, search, navigationType]);

  return null;
}

function Shell() {
  const viewRole = useAppStore((s) => s.viewRole);
  const setViewRole = useAppStore((s) => s.setViewRole);
  const loadPermissionGrid = useAppStore((s) => s.loadPermissionGrid);
  const loadMarketProfiles = useAppStore((s) => s.loadMarketProfiles);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const session = useSession();
  const projectsLoading = useAppStore((s) => s.projectsLoading);
  const projectsError = useAppStore((s) => s.projectsError);
  const projectCount = useAppStore((s) => s.projects.length);
  const location = useLocation();
  // Only the project-scoped screens (and the dashboard, which aggregates them)
  // are meaningless before the fetch resolves — My Account, Users & Roles and
  // Integrations read none of it and must not wait for it.
  const needsProjects = location.pathname === '/' || location.pathname.startsWith('/projects');

  // Below `lg` the sidebar collapses to zero width. Until now nothing could
  // bring it back — no trigger, no drawer — so on a phone or a narrow window
  // every link in the app became unreachable and the only way around was the
  // ⌘K palette, which needs a keyboard. The Header now carries a nav toggle at
  // those widths.
  const screens = Grid.useBreakpoint();
  // antd's `lg` is 992px. Reading matchMedia for the INITIAL value avoids a
  // first-render flash: Grid.useBreakpoint() returns {} before it measures,
  // which would read as "narrow" and briefly collapse the desktop sidebar.
  const [navOpen, setNavOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 992px)').matches,
  );
  const wideScreen = screens.lg ?? navOpen;
  useEffect(() => setNavOpen(wideScreen), [wideScreen]);
  // On a narrow screen the expanded sidebar covers most of the viewport, so a
  // link tap should close it rather than leave the content hidden behind it.
  useEffect(() => {
    if (!wideScreen) setNavOpen(false);
  }, [location.pathname, wideScreen]);

  // Load the role x capability grid once a session exists — it drives the
  // "View as" gate/phase/market-track permission checks (utils/permissions.ts)
  // and is edited on the Users & Roles Role Editor. Reloaded there after a
  // save so "View as" reflects the change live.
  useEffect(() => {
    if (session.user) {
      void loadPermissionGrid();
      // Round 4 question 4 — Regulatory's market profiles, server state like the grid.
      void loadMarketProfiles();
    }
  }, [session.user, loadPermissionGrid, loadMarketProfiles]);

  // M3 Phase 1: projects are server state now, so they are fetched once the
  // session resolves instead of being seeded into localStorage. Nothing renders
  // project data before this completes (the list simply shows empty), and
  // failures surface through `projectsError` rather than silently showing an
  // empty database.
  useEffect(() => {
    if (session.user) void loadProjects();
  }, [session.user, loadProjects]);

  // Microsoft 365 SSO is the only sign-in method — no session (never signed
  // in, signed out, or the session expired) means the Login screen, full
  // stop; nothing in the app is reachable while unauthenticated.
  if (session.loading) {
    return (
      // The very first thing anyone sees. A lone spinner on white reads as a
      // page that failed to load; naming the app says "this is starting".
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.2 }}>MBc360</div>
          <div style={{ color: TEXT.secondary, fontSize: 13 }}>Development &amp; Quality System</div>
        </div>
        <Spin />
        <span style={{ color: TEXT.secondary, fontSize: 12 }}>Signing you in…</span>
      </div>
    );
  }
  if (!session.user) {
    return <Login />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Keyboard users otherwise tab through the entire sidebar — ~10 groups
          and dozens of register links — before reaching the page itself.
          Off-screen until focused; antd's Content renders a real <main>. */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          // Above the header (100) it lets you skip past; below antd's modal
          // layer (1000).
          zIndex: 200,
          padding: '8px 12px',
          background: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '8px';
          e.currentTarget.style.top = '8px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to content
      </a>
      <Sider
        breakpoint="lg"
        collapsedWidth={0}
        width={250}
        collapsible
        trigger={null}
        collapsed={!navOpen}
      >
        <StickySidebar>
          <div style={{ color: '#fff', padding: 16, fontWeight: 700, fontSize: 16 }}>
            MBc360
            <div style={{ fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
              Development & Quality System
            </div>
          </div>
          <SideMenu isAdmin={session.isAdmin} />
        </StickySidebar>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            // Must outrank antd's sticky TABLE header, which computes its own
            // z-index as `columns-count * 2 + zIndexTableFixed + 1` (table
            // style/sticky.js) — 21 for the 9-column Phase Gate Flow, and more
            // for a wide register. At the old value of 10 the table header
            // painted OVER this bar as it was pushed up past the top of its
            // container at the end of the table's scroll. 100 clears every
            // realistic column count and still sits far below antd's modal
            // layer (1000), so dialogs keep covering the header as before.
            zIndex: 100,
          }}
        >
          {!wideScreen && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
              style={{ marginRight: 8, flexShrink: 0 }}
            />
          )}
          <Typography.Text
            strong
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              marginRight: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <ProjectContextTitle />
          </Typography.Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* "Reset demo data" was removed in M3 Phase 1: projects are real
                database records now, not seeded demo state, so a client-side
                reset button would have nothing meaningful to reset (and must
                not be able to wipe server data). */}
            <Tooltip title="Demo simulation: previews screens as if signed in with this role's permissions, until every screen reads permissions from your real signed-in account instead (rule A4).">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EyeOutlined style={{ color: '#999' }} />
                <Select
                  style={{ width: 230 }}
                  value={viewRole}
                  onChange={setViewRole}
                  options={SSO_ROLES.map((r) => ({ value: r.key, label: r.label }))}
                  popupMatchSelectWidth={false}
                />
              </span>
            </Tooltip>

            <Divider orientation="vertical" style={{ margin: 0, height: 22 }} />

            <Button
              icon={<SearchOutlined />}
              onClick={() => setPaletteOpen(true)}
              style={{ color: TEXT.secondary }}
            >
              <span style={{ marginRight: 8 }}>Search</span>
              <kbd
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  background: '#fafafa',
                  color: TEXT.secondary,
                }}
              >
                {isMac ? '⌘' : 'Ctrl'} K
              </kbd>
            </Button>

            <Divider orientation="vertical" style={{ margin: 0, height: 22 }} />

            <AuthStatus user={session.user} onLogout={session.logout} />
          </div>
        </Header>
        <Content id="main-content" style={{ padding: 16 }}>
          {/* The store has tracked `projectsLoading`/`projectsError` since M3
              Phase 1, but no screen ever read them: a slow load rendered
              "Active projects 0" and an empty table, and a FAILED load looked
              identical to an empty database — the exact thing the store's own
              comment claims it prevents. Both are surfaced here, once, rather
              than in each of the ~20 project pages. */}
          {projectsError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              title="Could not load projects"
              description={projectsError}
              action={
                <Button size="small" onClick={() => void loadProjects()}>
                  Try again
                </Button>
              }
            />
          )}
          {projectsLoading && projectCount === 0 && !projectsError && needsProjects ? (
            <PageSkeleton label="Loading projects…" />
          ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<ProjectOverview />} />
            <Route path="/projects/:projectId/phase/:phaseNo" element={<PhasePage />} />
            <Route path="/projects/:projectId/bom" element={<BomCosting />} />
            <Route path="/projects/:projectId/bom/:section" element={<BomCosting />} />
            <Route path="/projects/:projectId/formulation-safety" element={<FormulationSafety />} />
            <Route path="/projects/:projectId/needs-scientific-basis" element={<NeedsScientificBasis />} />
            <Route path="/projects/:projectId/competitor-landscape" element={<CompetitorLandscape />} />
            <Route path="/projects/:projectId/target-product-tech" element={<TargetProductTech />} />
            <Route path="/projects/:projectId/evidence-claim-support" element={<EvidenceClaimSupport />} />
            <Route path="/projects/:projectId/evidence-search-rules" element={<EvidenceSearchRules />} />
            <Route path="/projects/:projectId/gate-rules-map" element={<GateRulesMap />} />
            <Route path="/projects/:projectId/my-sheets" element={<MySheets />} />
            <Route path="/projects/:projectId/registers/cat/:categoryKey" element={<RegisterHubPage />} />
            <Route path="/projects/:projectId/registers/reg/:registerKey" element={<RegisterHubPage />} />
            <Route path="/projects/:projectId/evidence" element={<EvidenceSummary />} />
            <Route path="/projects/:projectId/feedback" element={<ProductFeedback />} />
            <Route path="/projects/:projectId/post-market" element={<PostMarketCapa />} />
            <Route path="/change-control" element={<ChangeControl />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            {/* Round 4 question 4 — company-level reference data, beside Users & Roles
                because it is company scope, not project scope. */}
            <Route path="/admin/market-profiles" element={<AdminMarketProfiles />} />
            <Route path="/admin/rm-risk" element={<AdminRmRisk />} />
          </Routes>
          )}
        </Content>
      </Layout>
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
      <UnsavedChangesGuard />
      <ScrollToTopOnNavigate />
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      {/* antd's `App` component (2026-08-26, fixes "[antd: Modal] Static
          function can not consume context like dynamic theme"): the static
          Modal.confirm/message/notification functions render outside React's
          tree, so they never see ConfigProvider's theme. `App` provides a
          context-aware `modal`/`message`/`notification` via `App.useApp()` —
          UnsavedChangesGuard, GateFlowTable and RoleCapabilityEditor's
          Modal.confirm calls now use that instead of the static API. Must
          sit INSIDE ConfigProvider (reads its theme) and wrap everything that
          calls `App.useApp()`. */}
      <AntApp>
        <HashRouter>
          <Shell />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
}
