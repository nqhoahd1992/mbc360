import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Layout, Menu, Popconfirm, Button, Select, Typography } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  CheckCircleFilled,
  FolderOpenOutlined,
  LockOutlined,
  ReloadOutlined,
  RightCircleFilled,
  SwapOutlined,
} from '@ant-design/icons';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
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
import FormulationSafety from './pages/FormulationSafety';
import SystemGuide from './pages/SystemGuide';
import { PHASES } from './config/gates';
import { REGISTER_CATEGORIES } from './config/registers';
import { phaseProgress } from './utils/gateProgress';

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

function SideMenu() {
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
      { key: '/change-control', icon: <SwapOutlined />, label: <Link to="/change-control">Change Control</Link> },
      { key: '/system-guide', icon: <BookOutlined />, label: <Link to="/system-guide">System Guide</Link> },
    ],
    [],
  );

  const activeProject = projects.find((p) => p.identity.id === projectId);

  const workspaceItems = useMemo(() => {
    if (!projectId || !activeProject) return [];
    return [
      { key: `/projects/${projectId}`, label: <Link to={`/projects/${projectId}`}>Overview</Link> },
      ...PHASES.map((ph) => {
        const progress = phaseProgress(activeProject, ph.phase);
        const icon =
          progress.state === 'completed' ? (
            <CheckCircleFilled style={{ color: '#52c41a' }} />
          ) : progress.state === 'current' ? (
            <RightCircleFilled style={{ color: '#1677ff' }} />
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
      { key: `/projects/${projectId}/bom`, label: <Link to={`/projects/${projectId}/bom`}>BOM & Costing</Link> },
      { key: `/projects/${projectId}/formulation-safety`, label: <Link to={`/projects/${projectId}/formulation-safety`}>Formulation Safety</Link> },
      { key: `/projects/${projectId}/evidence`, label: <Link to={`/projects/${projectId}/evidence`}>Evidence Summary</Link> },
      { key: `/projects/${projectId}/feedback`, label: <Link to={`/projects/${projectId}/feedback`}>Panel Feedback</Link> },
      { key: `/projects/${projectId}/post-market`, label: <Link to={`/projects/${projectId}/post-market`}>Post-Market / CAPA</Link> },
      {
        key: 'registers',
        type: 'group',
        label: 'EVIDENCE REGISTERS',
        children: REGISTER_CATEGORIES.map((cat) => ({
          key: `/projects/${projectId}/registers/${cat.key}`,
          label: <Link to={`/projects/${projectId}/registers/${cat.key}`}>{cat.title}</Link>,
        })),
      },
    ];
  }, [projectId, activeProject]);

  return (
    <>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
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
              placeholder="Select project"
              value={projectId}
              onChange={onSwitchProject}
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
  const resetDemoData = useAppStore((s) => s.resetDemoData);
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
          <SideMenu />
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
          }}
        >
          <Typography.Text strong>
            <ProjectContextTitle />
          </Typography.Text>
          <Popconfirm
            title="Reset all demo data to the seeded samples?"
            onConfirm={() => resetDemoData()}
          >
            <Button size="small" icon={<ReloadOutlined />}>
              Reset demo data
            </Button>
          </Popconfirm>
        </Header>
        <Content style={{ padding: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:projectId" element={<ProjectOverview />} />
            <Route path="/projects/:projectId/phase/:phaseNo" element={<PhasePage />} />
            <Route path="/projects/:projectId/bom" element={<BomCosting />} />
            <Route path="/projects/:projectId/formulation-safety" element={<FormulationSafety />} />
            <Route path="/projects/:projectId/registers/:categoryKey" element={<RegisterHubPage />} />
            <Route path="/projects/:projectId/evidence" element={<EvidenceSummary />} />
            <Route path="/projects/:projectId/feedback" element={<ProductFeedback />} />
            <Route path="/projects/:projectId/post-market" element={<PostMarketCapa />} />
            <Route path="/change-control" element={<ChangeControl />} />
            <Route path="/system-guide" element={<SystemGuide />} />
          </Routes>
        </Content>
      </Layout>
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
