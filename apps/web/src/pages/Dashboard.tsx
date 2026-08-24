import { Card, Col, Progress, Row, Statistic, Table, Tag, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { isSignedOff } from '@mbc360/shared/types';
import StatusBadge from '../components/StatusBadge';
import { currentGateIndex, gateBlockers, isGatePassed, phaseCompletionChecklist } from '@mbc360/shared/utils/gateProgress';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useSession } from '../auth/useSession';

export default function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const changes = useAppStore((s) => s.changes);
  const { user } = useSession();

  const activeGates = projects.flatMap((p) =>
    p.gates.filter((g) => g.status === 'In Progress').map((g) => ({ project: p, gate: g })),
  );
  const openChanges = changes.filter((c) => isChangeOpen(c.status));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = projects.flatMap((p) =>
    p.gates.filter((g) => g.dueDate && !isGatePassed(p, g.gateId) && g.dueDate < today),
  );

  // Confirmed-rules signals: open next actions (B2), gates with active
  // blockers (B1/C1), and per-market launch readiness (A1/C5).
  const openActions = projects.flatMap((p) =>
    p.nextActions.filter((a) => a.status !== 'Closed' && a.status !== 'Cancelled'),
  );
  const overdueActions = openActions.filter((a) => a.dueDate && a.dueDate < today);
  const blockedGates = projects.flatMap((p) =>
    p.gates.filter((g) => g.status !== 'Not Started' && gateBlockers(p, g.gateId).length > 0),
  );
  const allMarkets = projects.flatMap((p) => p.marketTracks);
  const launchReady = allMarkets.filter((t) => t.launchApproval === 'Approved').length;

  // `projects` holds whatever the last load asked for, and the Projects page can
  // ask for archived ones too (`?includeArchived=1`) — so "Active projects"
  // has to exclude them explicitly rather than count the array.
  const activeProjects = projects.filter((p) => !p.identity.archived);
  const archivedCount = projects.length - activeProjects.length;

  // Critical next actions are the ones that block even Proceed with Conditions
  // (F8), so they belong in the headline number, not only in the overdue count.
  const criticalActions = openActions.filter((a) => a.priority === 'Critical');

  // A phase that has met every closure condition and is waiting for signatures
  // (B3/D1). Nothing on this page reported it, though it is the step that
  // actually closes a phase.
  const phasesAwaitingSignOff = projects.flatMap((p) =>
    PHASES.filter((ph) => {
      const checklist = phaseCompletionChecklist(p, ph.phase);
      return checklist.canSignOff && !checklist.signOffsComplete;
    }).map((ph) => ({ project: p, phase: ph })),
  );

  // Sign-off rows nominated to the signed-in person and not yet signed — the
  // one thing on a portfolio page that is unambiguously theirs to do.
  const myPendingSignOffs = user
    ? projects.flatMap((p) =>
        PHASES.flatMap((ph) =>
          p.phaseClosures[ph.phase].signOffs
            .filter((row) => row.assignedToUserId === user.id && !isSignedOff(row))
            .map((row) => ({ project: p, phase: ph, row })),
        ),
      )
    : [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {myPendingSignOffs.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              Waiting on you{' '}
              <Tag color="gold" style={{ marginLeft: 4 }}>
                {myPendingSignOffs.length} sign-off{myPendingSignOffs.length > 1 ? 's' : ''}
              </Tag>
            </span>
          }
        >
          <Table
            size="small"
            rowKey={(r) => `${r.project.identity.id}-${r.phase.phase}-${r.row.role}`}
            dataSource={myPendingSignOffs}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              {
                title: 'Phase',
                width: 240,
                render: (_, r) => (
                  <Link to={`/projects/${r.project.identity.id}/phase/${r.phase.phase}`}>
                    {r.phase.title.split(' - ')[0]} — {r.project.identity.id}
                  </Link>
                ),
              },
              { title: 'Your row', width: 140, render: (_, r) => r.row.role },
              {
                title: 'Ready to sign?',
                render: (_, r) =>
                  phaseCompletionChecklist(r.project, r.phase.phase).canSignOff ? (
                    <Tag color="green">Yes — closure conditions met</Tag>
                  ) : (
                    <Tag>Not yet — closure conditions outstanding</Tag>
                  ),
              },
            ]}
          />
        </Card>
      )}

      {/* One grid, not two antd Rows: `gutter={16}` is horizontal only, so the
          ninth card wrapped onto a new line with no vertical gap and the cards
          sat flush against each other. `auto-fill` also keeps the orphan card
          the same width as its siblings instead of stretching it across the
          whole row. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 16,
        }}
      >
        <Card size="small">
          <Statistic
            title="Active projects"
            value={activeProjects.length}
            suffix={archivedCount > 0 ? ` (+${archivedCount} archived)` : undefined}
          />
        </Card>
        <Card size="small">
          <Tooltip title="Counts gates whose Stage status field is set to 'In Progress'. A gate that is open for work but still marked 'Not Started' is not counted here — see each project's current gate in the portfolio table below.">
            <Statistic
              title="Gates marked In Progress"
              value={activeGates.length}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Tooltip>
        </Card>
        <Card size="small">
          <Statistic title="Open change controls" value={openChanges.length} styles={{ content: { color: '#fa8c16' } }} />
        </Card>
        <Card size="small">
          <Statistic title="Overdue gates" value={overdue.length} styles={{ content: { color: overdue.length ? '#cf1322' : undefined } }} />
        </Card>
        <Card size="small">
          <Statistic
            title="Open next actions"
            value={openActions.length}
            suffix={
              [
                criticalActions.length ? `${criticalActions.length} critical` : '',
                overdueActions.length ? `${overdueActions.length} overdue` : '',
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
            styles={{
              content: {
                color: criticalActions.length || overdueActions.length ? '#cf1322' : '#1677ff',
              },
            }}
          />
        </Card>
        <Card size="small">
          <Statistic
            // `gateBlockers` composes open/critical next actions, the
            // Skincare-for-Two safety screen AND every unmet F1/C7 mandatory
            // readiness item (103 of 113 are wired) plus the NPD roadmap
            // items — "actions / safety" named two of five.
            title="Gates with unmet requirements"
            value={blockedGates.length}
            styles={{ content: { color: blockedGates.length ? '#cf1322' : undefined } }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title="Markets launch-approved"
            value={launchReady}
            suffix={`/ ${allMarkets.length}`}
            styles={{ content: { color: '#3f8600' } }}
          />
        </Card>
        <Card size="small">
          <Tooltip title="Every closure condition met (gates passed, key checks done, angles covered, actions closed, pre-work accepted) and one or more of the three signatures still missing.">
            <Statistic
              title="Phases awaiting sign-off"
              value={phasesAwaitingSignOff.length}
              styles={{ content: { color: phasesAwaitingSignOff.length ? '#d48806' : undefined } }}
            />
          </Tooltip>
        </Card>
        <Card size="small">
          <Statistic
            title="Backtrack events (audit)"
            value={projects.reduce((sum, p) => sum + p.backtrackEvents.length, 0)}
          />
        </Card>
      </div>

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
                <span>
                  <Link to={`/projects/${p.identity.id}`}>
                    <b>{p.identity.id}</b> — {p.identity.productSku}
                  </Link>
                  {/* An archived project is read-only everywhere; listing it
                      here unmarked made it look like live work. */}
                  {p.identity.archived && (
                    <Tag style={{ marginLeft: 6 }}>Archived</Tag>
                  )}
                </span>
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

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card size="small" title="Gates marked In Progress">
            <Table
              size="small"
              rowKey={(r) => `${r.project.identity.id}-${r.gate.gateId}`}
              dataSource={activeGates}
              pagination={false}
              locale={{
                emptyText:
                  'No gate has its Stage status set to "In Progress". Each project\'s current gate is in the portfolio table above.',
              }}
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
              locale={{ emptyText: 'No open change control across any project.' }}
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
