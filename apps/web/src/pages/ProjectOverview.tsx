import { useState } from 'react';
import { Button, Empty, Tooltip } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  LockOutlined,
  RightCircleFilled,
  RightOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GATE_FIELD_LABELS, GATES, PHASES } from '@mbc360/shared/config/gates';
import { isSignedOff } from '@mbc360/shared/types';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import {
  currentGateIndex,
  gateBlockers,
  gateState,
  isGatePassed,
  phaseProgress,
  type GateState,
} from '@mbc360/shared/utils/gateProgress';
import AssessmentsCard from '../components/AssessmentsCard';
import Notice from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import '../styles/concept.css';
import './ProjectOverview.css';

// Project Overview in the 2026-10 concept: a header carrying the identification
// context (this page never edited it), the four things that need someone as
// linked stat tiles, one 12-gate grid grouped by phase — the phase summary that
// used to be a second row of four cards now sits on each phase's own header —
// then market readiness and the two audit logs.

// State is carried by the icon alone; the tile background only marks the gate
// currently open for work (primary-light) and a locked one (muted).
const GATE_ICON: Record<GateState, { icon: React.ReactNode; label: string }> = {
  passed: { icon: <CheckCircleFilled className="po-ico-ok" />, label: 'Passed' },
  current: { icon: <RightCircleFilled className="po-ico-current" />, label: 'In progress' },
  hold: { icon: <ClockCircleFilled className="po-ico-warn" />, label: 'On hold' },
  gap: { icon: <WarningFilled className="po-ico-bad" />, label: 'Gap identified' },
  locked: { icon: <LockOutlined className="po-ico-muted" />, label: 'Locked' },
};

// The two logs grow with every edit and backtrack; past this many entries the
// rest fold away so the page does not end in a wall of history.
const LOG_PREVIEW = 5;

export default function ProjectOverview() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const changes = useAppStore((s) => s.changes);
  const [showAllBacktracks, setShowAllBacktracks] = useState(false);
  const [showAllGateChanges, setShowAllGateChanges] = useState(false);

  if (!project) return <Empty description="Project not found" />;

  const identity = project.identity;
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
  const openChanges = changes.filter((c) => c.projectId === identity.id && isChangeOpen(c.status));
  const currentGate = GATES[currentGateIndex(project)];
  const currentBlockers = currentGate ? gateBlockers(project, currentGate.id) : [];
  const archived = identity.archived;
  const currentPhase = currentGate ? PHASES.find((p) => p.phase === currentGate.phase) : undefined;

  // Next actions are listed per gate on the phase page, so the tile lands on
  // the gate that owns the most pressing one — a Critical, then an overdue
  // one, else the gate currently open.
  const actionGateId = (criticalActions[0] ?? overdueActions[0])?.gateId ?? currentGate?.id;
  const actionGate = GATES.find((g) => g.id === actionGateId);
  const actionsLink = actionGate
    ? `/projects/${identity.id}/phase/${actionGate.phase}?gate=${actionGate.id}&scrollTo=sec-next-actions`
    : undefined;

  const pct = Math.round((done / 12) * 100);
  const backtracks = [...project.backtrackEvents].reverse();
  const gateChanges = [...project.gateChangeLog].reverse();
  const gateNumber = (id: string) => GATES.find((g) => g.id === id)?.number ?? id;

  return (
    <div className="concept po">
      <header className="po-header">
        <div className="po-title-row">
          <h1 className="po-title">{identity.productSku || identity.id}</h1>
          {currentPhase && <span className="c-tag">Phase {currentPhase.phase}</span>}
          {currentGate ? (
            currentBlockers.length > 0 ? (
              <span className="c-tag c-tag-dot c-tag-warn">
                Gate {currentGate.number} · {currentBlockers.length} blocking
              </span>
            ) : (
              <span className="c-tag c-tag-dot c-tag-ok">Gate {currentGate.number} · ready to decide</span>
            )
          ) : (
            <span className="c-tag c-tag-dot c-tag-ok">All 12 gates passed</span>
          )}
          {archived && (
            <span className="c-tag">
              <LockOutlined /> Archived
            </span>
          )}
        </div>
        {/* The identification parameters, as context: they are write-once at
            creation (markets are edited on Phase 1), so a card of them here was
            only ever repeated reading. */}
        <p className="po-meta">
          {identity.id}
          {identity.productCode && <> · {identity.productCode}</>}
          {identity.productGroup && <> · {identity.productGroup}</>}
          {identity.brandCustomer && <> · {identity.brandCustomer}</>}
          {identity.projectLead && (
            <>
              {' '}· Lead <b>{identity.projectLead}</b>
            </>
          )}
          {identity.ownerDepartment && <> · {identity.ownerDepartment}</>}
          {identity.dateOpened && <> · Opened {identity.dateOpened}</>}
          {identity.targetLaunchDate && (
            <>
              {' '}· Target launch <b>{identity.targetLaunchDate}</b>
            </>
          )}
          {' '}·{' '}
          {identity.markets.length > 0 ? identity.markets.join(', ') : <span className="po-muted">No markets recorded yet</span>}
        </p>
      </header>

      {/* An archived project is read-only server-side, so every Save on every
          screen fails. ProjectList marks it and GateFlowTable explains it, but
          the project's own front page said nothing. */}
      {archived && (
        <Notice tone="warn" title="This project is archived — read-only">
          Archived {archived.at.slice(0, 10)}
          {archived.by ? ` by ${archived.by}` : ''}. Restore it from All Projects to make changes again.
        </Notice>
      )}

      <section className="po-stats" aria-label="Needs attention">
        <StatTile
          to={actionsLink}
          label="Open next actions"
          value={openActions.length}
          sub={
            criticalActions.length > 0 || overdueActions.length > 0 ? (
              <>
                {criticalActions.length > 0 && <span className="po-bad-text">{criticalActions.length} Critical</span>}
                {criticalActions.length > 0 && overdueActions.length > 0 && ' · '}
                {overdueActions.length > 0 && <span className="po-warn-text">{overdueActions.length} overdue</span>}
              </>
            ) : (
              'None Critical or overdue'
            )
          }
        />
        <StatTile
          to={openChanges.length > 0 ? '/change-control' : undefined}
          label="Open change controls"
          value={openChanges.length}
          sub={openChanges.length > 0 ? 'Open in Change Control' : 'Nothing open'}
        />
        {currentGate && (
          <StatTile
            to={`/projects/${identity.id}/phase/${currentGate.phase}?gate=${currentGate.id}`}
            label={`Gate ${currentGate.number} blockers`}
            value={currentBlockers.length}
            tone={currentBlockers.length > 0 ? 'bad' : undefined}
            sub={currentBlockers.length === 0 ? 'Ready to decide' : currentGate.name}
          />
        )}
        <div className="c-card po-stat">
          <div className="po-stat-label">Gates passed</div>
          <div className="po-stat-value">
            {done}
            <span className="po-stat-of">/12</span>
          </div>
          <div className="po-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={done === 12 ? 'po-bar-done' : undefined} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      {/* Round 4 questions 8/9/11/12 (2026-08-24). On the overview rather than a
          phase page because the four answers feed four different gates (03, 08,
          09, 12) — filing them under any one phase would hide them from the other
          three. */}
      <AssessmentsCard project={project} />

      <section className="c-card po-card">
        <div className="po-card-head">
          <div>
            <h2 className="po-card-title">Gate progress</h2>
            <p className="po-card-sub">
              {done}/12 gates passed · gates unlock in order
            </p>
          </div>
          <div className="po-legend" aria-label="Legend">
            {(Object.keys(GATE_ICON) as GateState[]).map((s) => (
              <span key={s}>
                {GATE_ICON[s].icon}
                {GATE_ICON[s].label}
              </span>
            ))}
          </div>
        </div>

        <div className="po-phases">
          {PHASES.map((phase) => {
            const closure = project.phaseClosures[phase.phase];
            const approved = closure.signOffs.find((s) => s.role === 'Approved by');
            const covered = closure.angles.filter((a) => a.covered).length;
            const progress = phaseProgress(project, phase.phase);
            const phaseGates = GATES.filter((g) => g.phase === phase.phase);
            // "Gates passed: 2/3" leaves the reader to do the subtraction, and
            // the number that decides what happens next is the OTHER one.
            const outstanding = phaseGates.filter((g) => !isGatePassed(project, g.id));
            return (
              <div key={phase.phase} className="po-phase">
                <div className="po-phase-head">
                  <div className="po-phase-name">
                    <Link className="c-link po-phase-title" to={`/projects/${identity.id}/phase/${phase.phase}`}>
                      {phase.title.split(' - ')[0]} · {phase.title.split(' - ')[1]}
                    </Link>
                    {/* Locked / awaiting sign-off are phase STATE, not gate
                        counts — so they are tags beside the name. */}
                    {progress.state === 'completed' ? (
                      <span className="c-tag c-tag-dot c-tag-ok">Completed</span>
                    ) : progress.awaitingApproval ? (
                      <span className="c-tag c-tag-dot c-tag-warn">Awaiting sign-off</span>
                    ) : progress.state === 'locked' ? (
                      <span className="c-tag">
                        <LockOutlined /> Locked
                      </span>
                    ) : (
                      <span className="c-tag c-tag-dot">In progress</span>
                    )}
                  </div>
                  <div className="po-phase-meta">
                    <span>{phase.subtitle}</span>
                    <span>
                      Gates passed <b>{progress.passedGates}/{progress.totalGates}</b>
                      {outstanding.length > 0 ? (
                        <Tooltip title={`Not passed yet: ${outstanding.map((g) => `Gate ${g.number}`).join(', ')}`}>
                          <span className="po-muted"> · {outstanding.length} to go</span>
                        </Tooltip>
                      ) : (
                        <span className="po-muted"> · all passed</span>
                      )}
                    </span>
                    <span>
                      8 Angles <b>{covered}/8</b> covered
                    </span>
                    <span>
                      {/* `isSignedOff` (signedByUserId + signedAt) is what
                          phaseCompletionChecklist counts, so this line must use it
                          too. Reading `approved.decision` alone reported "Approved"
                          for a pre-D1 row that carries a typed name and a decision
                          but no authenticated signature — a phase the rule engine
                          still treats as unsigned. */}
                      Approval{' '}
                      {isSignedOff(approved) ? (
                        <>
                          <StatusBadge value={approved?.decision} />
                          {approved?.name}
                          {approved?.signedAt && <span className="po-muted"> · {approved.signedAt.slice(0, 10)}</span>}
                        </>
                      ) : approved?.decision ? (
                        <Tooltip title="A decision was recorded before sign-off became an authenticated act, so it carries no signed-in user or timestamp. The rule engine does not count it as signed.">
                          <span className="c-tag c-tag-dot c-tag-warn">Recorded, not signed</span>
                        </Tooltip>
                      ) : (
                        <span className="c-tag">Pending</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="po-gates">
                  {phaseGates.map((meta) => {
                    const state = gateState(project, meta.id);
                    const record = project.gates.find((g) => g.gateId === meta.id);
                    const isCurrent = currentGate?.id === meta.id;
                    return (
                      <Tooltip key={meta.id} title={meta.purpose}>
                        <button
                          type="button"
                          className={`po-gate po-gate-${state}${isCurrent ? ' po-gate-now' : ''}`}
                          aria-current={isCurrent ? 'step' : undefined}
                          onClick={() => navigate(`/projects/${identity.id}/phase/${phase.phase}?gate=${meta.id}`)}
                        >
                          <span className="po-gate-ico">{GATE_ICON[state].icon}</span>
                          <span className="po-gate-text">
                            <span className="po-gate-title">
                              Gate {meta.number}
                              <span className="po-gate-state">{GATE_ICON[state].label}</span>
                            </span>
                            <span className="po-gate-name">{meta.name}</span>
                            {record?.owner && state !== 'locked' && (
                              <span className="po-gate-owner">
                                {record.owner}
                                {record.dueDate ? ` · due ${record.dueDate}` : ''}
                              </span>
                            )}
                          </span>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gates 10-12 are tracked PER MARKET (rule A1), and a market's launch
          approval is blocked until its PIF is Approved (C5) — so for a project
          in Phase 4 this table IS the project's state, and Overview showed none
          of it. Read-only: it is captured on the Phase 4 page. */}
      {project.marketTracks.length > 0 && (
        <section className="c-card po-card">
          <div className="po-card-head">
            <div>
              <h2 className="po-card-title">Market readiness</h2>
              <p className="po-card-sub">Gates 10-12 run per market; launch needs an Approved PIF first</p>
            </div>
            <Link className="c-link po-head-link" to={`/projects/${identity.id}/phase/4`}>
              Open Phase 4 <RightOutlined />
            </Link>
          </div>
          {/* Below 640px each market becomes a stacked block (labels from
              data-label), so a narrow screen never scrolls or widens the page. */}
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>PIF</th>
                  <th>Regulatory</th>
                  <th>Claims</th>
                  <th>Launch</th>
                </tr>
              </thead>
              <tbody>
                {project.marketTracks.map((t) => (
                  <tr key={t.market}>
                    <td className="po-strong">{t.market}</td>
                    <td data-label="PIF"><StatusBadge value={t.pifStatus} /></td>
                    <td data-label="Regulatory"><StatusBadge value={t.regulatoryStatus} /></td>
                    <td data-label="Claims"><StatusBadge value={t.claimsApproval} /></td>
                    <td data-label="Launch"><StatusBadge value={t.launchApproval} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {backtracks.length > 0 && (
        <section className="c-card po-card">
          <div className="po-card-head">
            <div>
              <h2 className="po-card-title">Backtrack audit log</h2>
              <p className="po-card-sub">Nothing is deleted; previous decisions and sign-offs are preserved here</p>
            </div>
            <span className="po-count">{backtracks.length}</span>
          </div>
          <ul className="po-log">
            {(showAllBacktracks ? backtracks : backtracks.slice(0, LOG_PREVIEW)).map((e) => {
              const phases = Object.keys(e.previousSignOffs);
              return (
                <li key={e.id}>
                  <div className="po-log-head">
                    <span className="po-strong">
                      Gate {gateNumber(e.fromGateId)} → Gate {gateNumber(e.toGateId)}
                    </span>
                    <span className="po-muted">
                      {e.date} · {e.initiatedBy ?? '—'}
                    </span>
                  </div>
                  <div className="po-log-body">{e.reason ?? '—'}</div>
                  <dl className="po-log-dl">
                    <dt>Previous decisions</dt>
                    <dd>
                      {e.previousGates
                        .map((g) => `G${gateNumber(g.gateId)}: ${g.status}${g.decision ? ` / ${g.decision}` : ''}`)
                        .join(' · ')}
                    </dd>
                    <dt>Invalidated sign-offs</dt>
                    <dd>
                      {phases.length === 0
                        ? 'None'
                        : phases
                            .map((ph) => {
                              const a = e.previousSignOffs[Number(ph)].find((s) => s.role === 'Approved by');
                              return `Phase ${ph} (was: ${a?.name || a?.initials || 'unsigned'})`;
                            })
                            .join(' · ')}
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ul>
          {backtracks.length > LOG_PREVIEW && (
            <div className="po-log-more">
              <Button type="link" onClick={() => setShowAllBacktracks((v) => !v)}>
                {showAllBacktracks ? 'Show fewer' : `Show all ${backtracks.length}`}
              </Button>
            </div>
          )}
        </section>
      )}

      {gateChanges.length > 0 && (
        <section className="c-card po-card">
          <div className="po-card-head">
            <div>
              <h2 className="po-card-title">Gate change log</h2>
              <p className="po-card-sub">Who changed what in the Phase Gate Flow table, and when</p>
            </div>
            <span className="po-count">{gateChanges.length}</span>
          </div>
          <ul className="po-log">
            {(showAllGateChanges ? gateChanges : gateChanges.slice(0, LOG_PREVIEW)).map((e) => (
              <li key={e.id}>
                <div className="po-log-head">
                  <span className="po-strong">Gate {gateNumber(e.gateId)}</span>
                  <span className="po-muted">
                    {e.date} · {e.changedBy ?? '—'}
                  </span>
                </div>
                <div className="po-log-body po-log-changes">
                  {e.changes.map((c, i) => (
                    <span key={i}>
                      {GATE_FIELD_LABELS[c.field]}: {c.from || '—'} → {c.to || '—'}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {gateChanges.length > LOG_PREVIEW && (
            <div className="po-log-more">
              <Button type="link" onClick={() => setShowAllGateChanges((v) => !v)}>
                {showAllGateChanges ? 'Show fewer' : `Show all ${gateChanges.length}`}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// One "Needs attention" tile. A tile with somewhere to go is a link to where
// that work is done; one with nothing to act on is plain.
function StatTile({
  to,
  label,
  value,
  sub,
  tone,
}: {
  to?: string;
  label: string;
  value: number;
  sub: React.ReactNode;
  tone?: 'bad';
}) {
  const body = (
    <>
      <div className="po-stat-label">
        {label}
        {to && <RightOutlined className="po-stat-go" />}
      </div>
      <div className={`po-stat-value${tone === 'bad' ? ' po-bad-text' : ''}`}>{value}</div>
      <div className="po-stat-sub">{sub}</div>
    </>
  );
  return to ? (
    <Link to={to} className="c-card po-stat po-stat-link">
      {body}
    </Link>
  ) : (
    <div className="c-card po-stat">{body}</div>
  );
}
