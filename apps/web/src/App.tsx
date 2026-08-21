import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Divider, Layout, Menu, Button, Select, Spin, Tooltip, Typography } from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  EyeOutlined,
  FolderOpenOutlined,
  LockOutlined,
  RightCircleFilled,
  SearchOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { SSO_ROLES } from './utils/roles';
import { useSession } from './auth/useSession';
import AuthStatus from './components/AuthStatus';
import AdminUsers from './pages/AdminUsers';
import AdminRoles from './pages/AdminRoles';
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
import { getNavGroups, findNavGroupForRegister, getRegisterConfig, navItemHref, formatGate } from '@mbc360/shared/config/registers';
import { ownerName, reviewRoleLabel } from '@mbc360/shared/config/reviewers';
import { phaseProgress } from '@mbc360/shared/utils/gateProgress';

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
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(urlProjectId);

  // Keep the workspace pinned to the last visited project, even on global pages
  useEffect(() => {
    if (urlProjectId) setActiveProjectId(urlProjectId);
  }, [urlProjectId]);

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

  const globalItems = useMemo(
    () => [
      { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Dashboard</Link> },
      { key: '/projects', icon: <FolderOpenOutlined />, label: <Link to="/projects">All Projects</Link> },
      { key: '/integrations', icon: <ApiOutlined />, label: <Link to="/integrations">Integrations</Link> },
      ...(isAdmin
        ? [
            {
              key: 'admin-users-roles',
              icon: <TeamOutlined />,
              label: 'Users & Roles',
              children: [
                { key: '/admin/users', label: <Link to="/admin/users">Users</Link> },
                { key: '/admin/roles', label: <Link to="/admin/roles">Roles</Link> },
              ],
            },
          ]
        : []),
    ],
    [isAdmin],
  );

  const activeProject = projects.find((p) => p.identity.id === projectId);

  const workspaceItems = useMemo(() => {
    if (!projectId || !activeProject) return [];
    const items = [
      { key: `/projects/${projectId}`, label: <Link to={`/projects/${projectId}`}>Overview</Link> },
      {
        // The digital replacement for the workbook's owner tab-prefix: which
        // sheets THIS signed-in person is responsible for on THIS project.
        key: `/projects/${projectId}/my-sheets`,
        icon: <StarOutlined style={{ color: '#faad14' }} />,
        label: <Link to={`/projects/${projectId}/my-sheets`}>My Sheets</Link>,
      },
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
    return getNavGroups().map((group) => {
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
            const itemRole = item.registerKey
              ? getRegisterConfig(item.registerKey)?.reviewOwner?.owner.role
              : undefined;
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
    });
  }, [projectId, activeProject]);

  // Highlight every leaf whose route matches the current path.
  const registerSelectedKeys = useMemo(() => {
    if (!projectId) return [];
    const keys: string[] = [];
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
// - Sidebar shorter than the viewport → sticks to the top (top: 0).
// - Sidebar taller than the viewport → scrolls with the page until its bottom
//   is reached, then pins bottom-aligned (top: viewportHeight - sidebarHeight),
//   letting the main content keep scrolling.
function StickySidebar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const overflow = el.offsetHeight - window.innerHeight;
      setTop(overflow > 0 ? -overflow : 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: 'sticky', top }}>
      {children}
    </div>
  );
}

function Shell() {
  const viewRole = useAppStore((s) => s.viewRole);
  const setViewRole = useAppStore((s) => s.setViewRole);
  const loadPermissionGrid = useAppStore((s) => s.loadPermissionGrid);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const session = useSession();

  // Load the role x capability grid once a session exists — it drives the
  // "View as" gate/phase/market-track permission checks (utils/permissions.ts)
  // and is edited on the Users & Roles Role Editor. Reloaded there after a
  // save so "View as" reflects the change live.
  useEffect(() => {
    if (session.user) void loadPermissionGrid();
  }, [session.user, loadPermissionGrid]);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!session.user) {
    return <Login />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={0} width={250}>
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
            zIndex: 10,
          }}
        >
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
                  size="small"
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
              style={{ color: '#888' }}
            >
              <span style={{ marginRight: 8 }}>Search</span>
              <kbd
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  background: '#fafafa',
                  color: '#888',
                }}
              >
                {isMac ? '⌘' : 'Ctrl'} K
              </kbd>
            </Button>

            <Divider orientation="vertical" style={{ margin: 0, height: 22 }} />

            <AuthStatus user={session.user} onLogout={session.logout} />
          </div>
        </Header>
        <Content style={{ padding: 16 }}>
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
          </Routes>
        </Content>
      </Layout>
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ConfigProvider>
  );
}
