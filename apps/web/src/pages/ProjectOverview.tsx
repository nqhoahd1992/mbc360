import { Alert, Card, Col, Empty, Progress, Row, Space, Table, Tag, Tooltip } from 'antd';
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
import { isSignedOff } from '@mbc360/shared/types';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import {
  currentGateIndex,
  gateBlockers,
  isGatePassed,
  phaseProgress,
} from '@mbc360/shared/utils/gateProgress';
import PhaseStepper from '../components/PhaseStepper';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import StatusBadge from '../components/StatusBadge';
import { TEXT } from '../theme/tokens';

export default function ProjectOverview() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const changes = useAppStore((s) => s.changes);

  if (!project) return <Empty description="Project not found" />;

  const done = project.gates.filter((g) => isGatePassed(project, g.gateId)).length;

  // What this project needs from someone right now. Every one of these was
  // already computed somewhere else — the Dashboard aggregates them ACROSS
  // projects, the phase pages show them per gate — so a project's own front
  // page was the one place that answered "how is it going?" without answering
  // "what is holding it up?".
  const openActions = project.nextActions.filter(
    (a) => a.status !== 'Closed' && a.status !== 'Cancelled',
  );
  const criticalActions = openActions.filter((a) => a.priority === 'Critical');
  const today = new Date().toISOString().slice(0, 10);
  const overdueActions = openActions.filter((a) => a.dueDate && a.dueDate < today);
  const openChanges = changes.filter((c) => c.projectId === project.identity.id && isChangeOpen(c.status));
  const currentGate = GATES[currentGateIndex(project)];
  const currentBlockers = currentGate ? gateBlockers(project, currentGate.id) : [];
  const archived = project.identity.archived;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* An archived project is read-only server-side, so every Save on every
          screen fails. ProjectList marks it and GateFlowTable explains it, but
          the project's own front page said nothing. */}
      {archived && (
        <Alert
          type="warning"
          showIcon
          title="This project is archived — read-only"
          description={`Archived ${archived.at.slice(0, 10)}${archived.by ? ` by ${archived.by}` : ''}. Restore it from All Projects to make changes again.`}
        />
      )}

      <ProjectIdentificationCard project={project} />

      <Card size="small" title="Needs attention">
        <Space size={[24, 8]} wrap>
          <span>
            Open next actions: <b>{openActions.length}</b>
            {criticalActions.length > 0 && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                {criticalActions.length} Critical
              </Tag>
            )}
            {overdueActions.length > 0 && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                {overdueActions.length} overdue
              </Tag>
            )}
          </span>
          <span>
            Open change controls:{' '}
            {openChanges.length > 0 ? (
              <Link to="/change-control">
                <b>{openChanges.length}</b>
              </Link>
            ) : (
              <b>0</b>
            )}
          </span>
          {currentGate && (
            <span>
              Gate {currentGate.number} blockers:{' '}
              <Link to={`/projects/${project.identity.id}/phase/${currentGate.phase}`}>
                <b>{currentBlockers.length}</b>
              </Link>
              {currentBlockers.length === 0 && (
                <Tag color="green" style={{ marginLeft: 8 }}>
                  Ready to decide
                </Tag>
              )}
            </span>
          )}
        </Space>
      </Card>

      <Card
        size="small"
        title={
          <span>
            Gate progress{' '}
            <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
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

      <Row gutter={[16, 16]}>
        {PHASES.map((phase) => {
          const closure = project.phaseClosures[phase.phase];
          const approved = closure.signOffs.find((s) => s.role === 'Approved by');
          const covered = closure.angles.filter((a) => a.covered).length;
          const progress = phaseProgress(project, phase.phase);
          // "Gates passed: 2/3" leaves the reader to do the subtraction, and
          // the number that decides what happens next is the OTHER one. Naming
          // the outstanding gates as well means the card answers "what is left
          // here?" without opening the phase.
          const outstanding = GATES.filter(
            (g) => g.phase === phase.phase && !isGatePassed(project, g.id),
          );
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
                  <span style={{ color: TEXT.secondary }}>{phase.subtitle}</span>
                  <span>
                    Gates passed: {progress.passedGates}/{progress.totalGates}
                    {outstanding.length > 0 ? (
                      <Tooltip
                        title={`Not passed yet: ${outstanding.map((g) => `Gate ${g.number}`).join(', ')}`}
                      >
                        <Tag color="orange" style={{ marginLeft: 8, cursor: 'default' }}>
                          {outstanding.length} to go
                        </Tag>
                      </Tooltip>
                    ) : (
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        All passed
                      </Tag>
                    )}
                  </span>
                  <span>
                    {/* Locked / awaiting sign-off are phase STATE, not gate
                        counts — on their own line so they stop competing with
                        the numbers above. */}
                    {progress.state === 'locked' && <Tag>Locked</Tag>}
                    {progress.awaitingApproval && <Tag color="gold">Awaiting sign-off</Tag>}
                    {outstanding.length > 0 && progress.state === 'current' && (
                      <Tag color="blue">In progress</Tag>
                    )}
                  </span>
                  <span>8 Angles: {covered}/8 covered</span>
                  <span>
                    {/* `isSignedOff` (signedByUserId + signedAt) is what
                        phaseCompletionChecklist counts, so this card must use it
                        too. Reading `approved.decision` alone reported "Approved"
                        for a pre-D1 row that carries a typed name and a decision
                        but no authenticated signature — a phase the rule engine
                        still treats as unsigned. */}
                    Approval:{' '}
                    {isSignedOff(approved) ? (
                      <>
                        <StatusBadge value={approved?.decision} /> {approved?.name}
                        {approved?.signedAt && (
                          <span style={{ color: TEXT.secondary, fontSize: 12 }}>
                            {' '}
                            · {approved.signedAt.slice(0, 10)}
                          </span>
                        )}
                      </>
                    ) : approved?.decision ? (
                      <Tooltip title="A decision was recorded before sign-off became an authenticated act, so it carries no signed-in user or timestamp. The rule engine does not count it as signed.">
                        <Tag color="orange">Recorded, not signed</Tag>
                      </Tooltip>
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

      {/* Gates 10-12 are tracked PER MARKET (rule A1), and a market's launch
          approval is blocked until its PIF is Approved (C5) — so for a project
          in Phase 4 this table IS the project's state, and Overview showed none
          of it. Read-only: it is captured on the Phase 4 page. */}
      {project.marketTracks.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              Market readiness{' '}
              <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
                — Gates 10-12 run per market; launch needs an Approved PIF first
              </span>
            </span>
          }
          extra={<Link to={`/projects/${project.identity.id}/phase/4`}>Open Phase 4</Link>}
        >
          <Table
            size="small"
            rowKey={(t) => t.market}
            dataSource={project.marketTracks}
            pagination={false}
            scroll={{ x: 700 }}
            columns={[
              { title: 'Market', width: 150, render: (_, t) => <b>{t.market}</b> },
              { title: 'PIF', width: 130, render: (_, t) => <StatusBadge value={t.pifStatus} /> },
              { title: 'Regulatory', width: 130, render: (_, t) => <StatusBadge value={t.regulatoryStatus} /> },
              { title: 'Claims', width: 130, render: (_, t) => <StatusBadge value={t.claimsApproval} /> },
              { title: 'Launch', width: 130, render: (_, t) => <StatusBadge value={t.launchApproval} /> },
            ]}
          />
        </Card>
      )}

      {project.backtrackEvents.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              <HistoryOutlined style={{ marginRight: 6 }} />
              Backtrack audit log{' '}
              <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
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
                  if (phases.length === 0) return <span style={{ color: TEXT.secondary }}>None</span>;
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
              <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
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

    </div>
  );
}
