import { Button, Card, Col, Empty, Progress, Row, Space, Table, Tag } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  HistoryOutlined,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GATE_FIELD_LABELS, GATES, PHASES } from '@mbc360/shared/config/gates';
import { isGatePassed, phaseProgress } from '@mbc360/shared/utils/gateProgress';
import PhaseStepper from '../components/PhaseStepper';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import StatusBadge from '../components/StatusBadge';

export default function ProjectOverview() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));

  if (!project) return <Empty description="Project not found" />;

  const done = project.gates.filter((g) => isGatePassed(project, g.gateId)).length;

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
                <Space orientation="vertical" size={4}>
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

      {project.backtrackEvents.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              <HistoryOutlined style={{ marginRight: 6 }} />
              Backtrack audit log{' '}
              <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
                — nothing is deleted; previous decisions and sign-offs are preserved here
              </span>
            </span>
          }
        >
          <Table
            size="small"
            rowKey={(e) => e.id}
            dataSource={[...project.backtrackEvents].reverse()}
            pagination={false}
            scroll={{ x: 950 }}
            columns={[
              { title: 'Date', width: 110, dataIndex: 'date' },
              {
                title: 'From → To',
                width: 150,
                render: (_, e) => {
                  const from = GATES.find((g) => g.id === e.fromGateId);
                  const to = GATES.find((g) => g.id === e.toGateId);
                  return (
                    <span>
                      Gate {from?.number ?? e.fromGateId} → Gate {to?.number ?? e.toGateId}
                    </span>
                  );
                },
              },
              {
                title: 'Initiated by',
                width: 130,
                render: (_, e) => e.initiatedBy ?? '—',
              },
              {
                title: 'Reason',
                width: 240,
                render: (_, e) => e.reason ?? '—',
              },
              {
                title: 'Previous decisions (snapshot)',
                width: 260,
                render: (_, e) => (
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {e.previousGates
                      .map((g) => {
                        const meta = GATES.find((m) => m.id === g.gateId);
                        return `G${meta?.number ?? g.gateId}: ${g.status}${g.decision ? ` / ${g.decision}` : ''}`;
                      })
                      .join(' · ')}
                  </span>
                ),
              },
              {
                title: 'Invalidated sign-offs',
                width: 220,
                render: (_, e) => {
                  const phases = Object.keys(e.previousSignOffs);
                  if (phases.length === 0) return <span style={{ color: '#999' }}>None</span>;
                  return (
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {phases
                        .map((ph) => {
                          const approved = e.previousSignOffs[Number(ph)].find(
                            (s) => s.role === 'Approved by',
                          );
                          const who = approved?.name || approved?.initials || 'unsigned';
                          return `Phase ${ph} (was: ${who})`;
                        })
                        .join(' · ')}
                    </span>
                  );
                },
              },
            ]}
          />
        </Card>
      )}

      {project.gateChangeLog.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              <HistoryOutlined style={{ marginRight: 6 }} />
              Gate change log{' '}
              <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
                — who changed what, in the Phase Gate Flow table, and when
              </span>
            </span>
          }
        >
          <Table
            size="small"
            rowKey={(e) => e.id}
            dataSource={[...project.gateChangeLog].reverse()}
            pagination={false}
            scroll={{ x: 800 }}
            columns={[
              { title: 'Date', width: 140, dataIndex: 'date' },
              {
                title: 'Gate',
                width: 90,
                render: (_, e) => {
                  const meta = GATES.find((g) => g.id === e.gateId);
                  return <span>Gate {meta?.number ?? e.gateId}</span>;
                },
              },
              { title: 'Changed by', width: 150, render: (_, e) => e.changedBy ?? '—' },
              {
                title: 'Changes',
                render: (_, e) => (
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {e.changes
                      .map((c) => `${GATE_FIELD_LABELS[c.field]}: ${c.from || '—'} → ${c.to || '—'}`)
                      .join(' · ')}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

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
