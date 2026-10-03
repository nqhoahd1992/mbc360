import { useEffect, useRef, useState } from 'react';
import { Alert, App as AntApp, ConfigProvider, Drawer, Layout, Button, Grid, Spin } from 'antd';
import { EyeOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import { HashRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { useSession } from './auth/useSession';
import { setPreviewWriteLock, usePermissionView } from './auth/previewMode';
import { roleLabel } from './utils/roles';
import AuthStatus from './components/AuthStatus';
import AppSidebar from './components/AppSidebar';
import HeaderBreadcrumb from './components/HeaderBreadcrumb';
import ViewAsChip from './components/ViewAsChip';
import './App.css';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
import AdminMarketProfiles from './pages/AdminMarketProfiles';
import AdminClaimsLibrary from './pages/AdminClaimsLibrary';
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
import { HEADER_HEIGHT, TEXT } from './theme/tokens';

const { Header, Content } = Layout;

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
  const setViewRole = useAppStore((s) => s.setViewRole);
  const loadPermissionGrid = useAppStore((s) => s.loadPermissionGrid);
  const loadMarketProfiles = useAppStore((s) => s.loadMarketProfiles);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const session = useSession();
  const permissionView = usePermissionView();
  // A preview is read-only: the server would carry out a write with the real
  // (administrator) session, not the previewed role.
  useEffect(() => {
    setPreviewWriteLock(permissionView.previewing);
    // Also on <body>, so the inputs inside drawers (portalled out of the page)
    // are frozen too — see App.css.
    document.body.classList.toggle('app-previewing', permissionView.previewing);
  }, [permissionView.previewing]);
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
  // Below md the header controls collapse to icons (see the Header below).
  const compactHeader = screens.md === false;
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
    return <Login denied={session.denied} />;
  }

  return (
    <Layout hasSider style={{ minHeight: '100vh' }}>
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
      {/* The sidebar scrolls inside its own 100vh column rather than with the
          page: a menu taller than the content used to make the document
          scrollable on a two-card screen, and router navigation (which keeps
          scrollY) then left a short page scrolled past its own end. */}
      {wideScreen ? (
        <div style={{ position: 'sticky', top: 0, left: 0, height: '100vh', flexShrink: 0, zIndex: 101 }}>
          <AppSidebar isAdmin={permissionView.isAdmin} narrow={false} />
        </div>
      ) : (
        <Drawer
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          closable={false}
          size={320}
          styles={{ body: { padding: 0 } }}
          rootClassName="concept-tokens"
        >
          <AppSidebar isAdmin={permissionView.isAdmin} narrow />
        </Drawer>
      )}
      <Layout>
        {/* 2026-10-03 redesign (wireframe option A): a breadcrumb to the
            current page instead of the project name (already on the sidebar
            card and the page title), a search box that looks like one, the
            "View as" simulator as a chip that turns amber while it differs
            from the account's real role, and the avatar alone. */}
        <Header
          className="app-header"
          style={{
            height: HEADER_HEIGHT,
            lineHeight: 'normal',
            background: '#fff',
            padding: compactHeader ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: compactHeader ? 8 : 16,
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
              style={{ flexShrink: 0 }}
            />
          )}
          <HeaderBreadcrumb fallback="MBc360" />
          <div className="app-header-tools">
            {compactHeader ? (
              <Button type="text" icon={<SearchOutlined />} aria-label="Search" onClick={() => setPaletteOpen(true)} />
            ) : (
              <button type="button" className="app-search" onClick={() => setPaletteOpen(true)}>
                <SearchOutlined />
                <span className="app-search-text">Search…</span>
                <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
              </button>
            )}
            {/* Previewing is an administrator's tool; nobody else sees the chip. */}
            {permissionView.realIsAdmin && (
              <ViewAsChip
                value={permissionView.previewRole}
                onChange={setViewRole}
                realRoleKeys={permissionView.realRoleKeys}
                compact={compactHeader}
              />
            )}
            <AuthStatus user={session.user} onLogout={session.logout} compact />
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
          {permissionView.previewing && (
            <div className="app-preview-banner" role="status">
              <EyeOutlined />
              <span className="app-preview-banner-text">
                <b>Previewing as {roleLabel(permissionView.previewRole!)}</b> — read-only. Screens show what this role
                may do; nothing can be saved, signed or changed.
              </span>
              <Button size="small" onClick={() => setViewRole(null)}>
                Back to my role
              </Button>
            </div>
          )}
          {projectsLoading && projectCount === 0 && !projectsError && needsProjects ? (
            <PageSkeleton label="Loading projects…" />
          ) : (
          // Keyed by path (2026-10-02, user-reported): many routes share one
          // page component and only differ by a URL parameter (every register,
          // every phase, every project), so React used to keep the component —
          // and its unsaved draft — across them, and a blank row added on one
          // register reappeared on the next. The unsaved-changes guard has
          // already asked before the path changes, so a fresh page is what
          // "Leave" means. Query strings (a phase's ?gate tab) are not in the
          // key, so switching tabs does not remount.
          //
          // componentDisabled greys every antd control on the page (and in the
          // drawers it opens) while previewing, so the read-only state is
          // visible, not just refused on Save. Links and rows still work.
          <ConfigProvider componentDisabled={permissionView.previewing}>
          <Routes key={location.pathname}>
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
            <Route path="/admin/claims-library" element={<AdminClaimsLibrary />} />
          </Routes>
          </ConfigProvider>
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
  // colorPrimary is #0958d9, not antd's default #1677ff (2026-10-02): white
  // text on #1677ff is 4.1:1, under the 4.5:1 WCAG AA minimum for body text —
  // the primary buttons and the selected sidebar item both carry white text on
  // it. #0958d9 is antd's own next blue step (6.6:1). colorInfo and colorLink
  // are set too: antd derives links from colorInfo, not colorPrimary, so they
  // stayed #1677ff (4.1:1 on white). styles/concept.css --c-primary must match.
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0958d9', colorInfo: '#0958d9', colorLink: '#0958d9', borderRadius: 6 } }}>
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
