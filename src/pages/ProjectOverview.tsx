import { Button, Card, Col, Empty, Progress, Row, Space, Tag } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PHASES } from '../config/gates';
import { isGatePassed, phaseProgress } from '../utils/gateProgress';
import PhaseStepper from '../components/PhaseStepper';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import StatusBadge from '../components/StatusBadge';

export default function ProjectOverview() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));

  if (!project) return <Empty description="Project not found" />;

  const done = project.gates.filter((g) => isGatePassed(project.gates, g.gateId)).length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ProjectIdentificationCard identity={project.identity} />

      <Card
        size="small"
        title={
          <span>
            Gate progress{' '}
            <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
              — {done}/12 gates passed · gates unlock in order
            </span>
          </span>
        }
        extra={<Progress percent={Math.round((done / 12) * 100)} size="small" style={{ width: 200 }} />}
      >
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
          <span><CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} />Passed</span>
          <span><RightCircleFilled style={{ color: '#1677ff', marginRight: 6 }} />In progress</span>
          <span><ClockCircleFilled style={{ color: '#faad14', marginRight: 6 }} />On hold</span>
          <span><WarningFilled style={{ color: '#fa541c', marginRight: 6 }} />Gap identified</span>
          <span><LockOutlined style={{ color: '#bfbfbf', marginRight: 6 }} />Locked</span>
        </div>
        <PhaseStepper project={project} />
      </Card>

      <Row gutter={16}>
        {PHASES.map((phase) => {
          const closure = project.phaseClosures[phase.phase];
          const approved = closure.signOffs.find((s) => s.role === 'Approved by');
          const covered = closure.angles.filter((a) => a.covered).length;
          const progress = phaseProgress(project, phase.phase);
          return (
            <Col key={phase.phase} xs={24} md={12} lg={6}>
              <Card
                size="small"
                title={
                  <span style={{ color: phase.color }}>
                    {progress.state === 'completed' && (
                      <CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} />
                    )}
                    {progress.state === 'current' && (
                      <RightCircleFilled style={{ color: '#1677ff', marginRight: 6 }} />
                    )}
                    {progress.state === 'locked' && (
                      <LockOutlined style={{ color: '#bbb', marginRight: 6 }} />
                    )}
                    {phase.title.split(' - ')[0]}
                  </span>
                }
                extra={<Link to={`/projects/${project.identity.id}/phase/${phase.phase}`}>Open</Link>}
              >
                <Space direction="vertical" size={4}>
                  <span style={{ color: '#888' }}>{phase.subtitle}</span>
                  <span>
                    Gates passed: {progress.passedGates}/{progress.totalGates}
                    {progress.state === 'locked' && <Tag style={{ marginLeft: 8 }}>Locked</Tag>}
                    {progress.awaitingApproval && (
                      <Tag color="gold" style={{ marginLeft: 8 }}>
                        Awaiting sign-off
                      </Tag>
                    )}
                  </span>
                  <span>8 Angles: {covered}/8 covered</span>
                  <span>
                    Approval:{' '}
                    {approved?.decision ? (
                      <>
                        <StatusBadge value={approved.decision} /> {approved.name}
                      </>
                    ) : (
                      <Tag>Pending</Tag>
                    )}
                  </span>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card size="small" title="Project workspaces">
        <Space wrap>
          <Link to={`/projects/${project.identity.id}/bom`}><Button>Formula BOM & Costing</Button></Link>
          <Link to={`/projects/${project.identity.id}/evidence`}><Button>Evidence Summary</Button></Link>
          <Link to={`/projects/${project.identity.id}/feedback`}><Button>Product Feedback (Panel)</Button></Link>
          <Link to={`/projects/${project.identity.id}/post-market`}><Button>Post-Market / CAPA</Button></Link>
          <Link to="/change-control"><Button>Change Control</Button></Link>
        </Space>
      </Card>
    </div>
  );
}
