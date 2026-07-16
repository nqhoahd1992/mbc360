import { Card, Col, Progress, Row, Statistic, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import StatusBadge from '../components/StatusBadge';
import { currentGateIndex, gateBlockers, isGatePassed } from '@mbc360/shared/utils/gateProgress';

export default function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const changes = useAppStore((s) => s.changes);

  const activeGates = projects.flatMap((p) =>
    p.gates.filter((g) => g.status === 'In Progress').map((g) => ({ project: p, gate: g })),
  );
  const openChanges = changes.filter((c) => c.status !== 'Completed');
  const today = new Date().toISOString().slice(0, 10);
  const overdue = projects.flatMap((p) =>
    p.gates.filter((g) => g.dueDate && !isGatePassed(p, g.gateId) && g.dueDate < today),
  );

  // Confirmed-rules signals: open next actions (B2), gates with active
  // blockers (B1/C1), and per-market launch readiness (A1/C5).
  const openActions = projects.flatMap((p) => p.nextActions.filter((a) => a.status !== 'Done'));
  const overdueActions = openActions.filter((a) => a.dueDate && a.dueDate < today);
  const blockedGates = projects.flatMap((p) =>
    p.gates.filter((g) => g.status !== 'Not Started' && gateBlockers(p, g.gateId).length > 0),
  );
  const allMarkets = projects.flatMap((p) => p.marketTracks);
  const launchReady = allMarkets.filter((t) => t.launchApproval === 'Approved').length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Active projects" value={projects.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Gates in progress" value={activeGates.length} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Open change controls" value={openChanges.length} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Overdue gates" value={overdue.length} valueStyle={{ color: overdue.length ? '#cf1322' : undefined }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Open next actions"
              value={openActions.length}
              suffix={overdueActions.length ? ` (${overdueActions.length} overdue)` : undefined}
              valueStyle={{ color: overdueActions.length ? '#cf1322' : '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Gates blocked (actions / safety)"
              value={blockedGates.length}
              valueStyle={{ color: blockedGates.length ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Markets launch-approved"
              value={launchReady}
              suffix={`/ ${allMarkets.length}`}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Backtrack events (audit)"
              value={projects.reduce((sum, p) => sum + p.backtrackEvents.length, 0)}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Project portfolio — gate progress">
        <Table
          size="small"
          rowKey={(p) => p.identity.id}
          dataSource={projects}
          pagination={false}
          scroll={{ x: 900 }}
          columns={[
            {
              title: 'Project',
              width: 260,
              render: (_, p) => (
                <Link to={`/projects/${p.identity.id}`}>
                  <b>{p.identity.id}</b> — {p.identity.productSku}
                </Link>
              ),
            },
            { title: 'Lead', width: 130, render: (_, p) => p.identity.projectLead },
            {
              title: 'Current phase',
              width: 220,
              render: (_, p) => {
                const idx = currentGateIndex(p);
                const meta = idx < GATES.length ? GATES[idx] : undefined;
                const phase = meta ? PHASES.find((ph) => ph.phase === meta.phase) : undefined;
                return phase ? (
                  <Tag color={phase.color}>{phase.title.split(' - ')[0]} · Gate {meta!.number}</Tag>
                ) : (
                  <Tag color="green">All gates passed</Tag>
                );
              },
            },
            {
              title: 'Progress (12 gates)',
              width: 220,
              render: (_, p) => {
                const done = p.gates.filter((g) => isGatePassed(p, g.gateId)).length;
                return <Progress percent={Math.round((done / 12) * 100)} size="small" />;
              },
            },
            { title: 'Target launch', width: 120, render: (_, p) => p.identity.targetLaunchDate },
            {
              title: 'Markets',
              render: (_, p) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.identity.markets.map((m) => (
                    <Tag key={m} style={{ marginInlineEnd: 0 }}>
                      {m}
                    </Tag>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card size="small" title="Gates awaiting action">
            <Table
              size="small"
              rowKey={(r) => `${r.project.identity.id}-${r.gate.gateId}`}
              dataSource={activeGates}
              pagination={false}
              columns={[
                {
                  title: 'Gate',
                  render: (_, r) => {
                    const meta = GATES.find((g) => g.id === r.gate.gateId)!;
                    return (
                      <Link to={`/projects/${r.project.identity.id}/phase/${meta.phase}`}>
                        Gate {meta.number} — {meta.name}
                      </Link>
                    );
                  },
                },
                { title: 'Project', render: (_, r) => r.project.identity.id },
                { title: 'Owner', render: (_, r) => r.gate.owner },
                { title: 'Due', render: (_, r) => r.gate.dueDate },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Open change controls" extra={<Link to="/change-control">View all</Link>}>
            <Table
              size="small"
              rowKey={(c) => c.changeId}
              dataSource={openChanges}
              pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'changeId' },
                { title: 'Trigger', dataIndex: 'trigger', ellipsis: true },
                { title: 'Risk', dataIndex: 'riskLevel', render: (v) => <StatusBadge value={v} /> },
                { title: 'Status', dataIndex: 'status', render: (v) => <StatusBadge value={v} /> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
