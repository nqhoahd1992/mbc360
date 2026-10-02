import { Tooltip } from 'antd';
import {
  AlertOutlined,
  BranchesOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { isSignedOff } from '@mbc360/shared/types';
import { currentGateIndex, gateBlockers, isGatePassed, phaseCompletionChecklist } from '@mbc360/shared/utils/gateProgress';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useSession } from '../auth/useSession';
import '../styles/concept.css';
import '../components/RegisterPageHeader.css';
import './ProjectList.css';
import './Dashboard.css';


type Tone = 'bad' | 'warn' | undefined;

// One stat tile. `tone` is set only when the number means trouble, so colour
// keeps its meaning across the row instead of decorating every tile.
function StatTile({
  icon,
  label,
  value,
  of,
  sub,
  tone,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  of?: number;
  sub: React.ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  const tile = (
    <div className={`db-stat${tone ? ` db-stat-${tone}` : ''}`}>
      <div className="db-stat-label">
        {icon}
        {label}
        {hint && <InfoCircleOutlined aria-label="About this number" />}
      </div>
      <div className={`db-stat-value${tone ? ` db-${tone}` : ''}`}>
        {value}
        {of !== undefined && <small>/ {of}</small>}
      </div>
      <div className="db-stat-sub">{sub}</div>
    </div>
  );
  return hint ? <Tooltip title={hint}>{tile}</Tooltip> : tile;
}

// Change risk carries state on the tag only (concept rule 4).
function riskTagClass(risk?: string) {
  if (risk === 'High' || risk === 'Critical') return 'c-tag c-tag-bad c-tag-dot';
  if (risk === 'Medium') return 'c-tag c-tag-warn c-tag-dot';
  return 'c-tag c-tag-dot';
}

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

  const backtrackCount = projects.reduce((sum, p) => sum + p.backtrackEvents.length, 0);
  const actionsTrouble = criticalActions.length > 0 || overdueActions.length > 0;

  return (
    <div className="concept">
      <div className="rph">
        <div className="rph-title-row">
          <h1 className="rph-title">Dashboard</h1>
        </div>
        <p className="rph-meta">
          {activeProjects.length} active project{activeProjects.length === 1 ? '' : 's'} · {allMarkets.length} market
          track{allMarkets.length === 1 ? '' : 's'} · As of {today}
        </p>
      </div>

      {myPendingSignOffs.length > 0 && (
        <div className="c-card">
          <div className="pl-card-head">
            <span className="pl-card-title">Waiting on you</span>
            <span className="c-tag c-tag-warn c-tag-dot">
              {myPendingSignOffs.length} sign-off{myPendingSignOffs.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="db-list">
            {myPendingSignOffs.map((r) => (
              <li key={`${r.project.identity.id}-${r.phase.phase}-${r.row.role}`}>
                <div className="db-item-main">
                  <Link className="c-link db-item-title" to={`/projects/${r.project.identity.id}/phase/${r.phase.phase}`}>
                    {r.phase.title.split(' - ')[0]} — {r.project.identity.id}
                  </Link>
                  <div className="db-item-sub">Your row: {r.row.role}</div>
                </div>
                {phaseCompletionChecklist(r.project, r.phase.phase).canSignOff ? (
                  <span className="c-tag c-tag-ok c-tag-dot">Ready — closure conditions met</span>
                ) : (
                  <span className="c-tag c-tag-dot">Not yet — closure conditions outstanding</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="db-stats">
        <StatTile
          icon={<FolderOpenOutlined />}
          label="Active projects"
          value={activeProjects.length}
          sub={archivedCount > 0 ? `+${archivedCount} archived` : 'None archived in view'}
        />
        <StatTile
          icon={<SyncOutlined />}
          label="Gates marked In Progress"
          value={activeGates.length}
          sub="Stage status set to In Progress"
          hint="Counts gates whose Stage status field is set to 'In Progress'. A gate that is open for work but still marked 'Not Started' is not counted here — see each project's current gate in the portfolio below."
        />
        <StatTile
          icon={<BranchesOutlined />}
          label="Open change controls"
          value={openChanges.length}
          sub="Across all projects"
        />
        <StatTile
          icon={<ClockCircleOutlined />}
          label="Overdue gates"
          value={overdue.length}
          sub="Past due, not yet passed"
          tone={overdue.length ? 'bad' : undefined}
        />
        <StatTile
          icon={<CheckSquareOutlined />}
          label="Open next actions"
          value={openActions.length}
          sub={
            [
              criticalActions.length ? `${criticalActions.length} critical` : '',
              overdueActions.length ? `${overdueActions.length} overdue` : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'None critical or overdue'
          }
          tone={actionsTrouble ? 'bad' : undefined}
        />
        <StatTile
          // `gateBlockers` composes open/critical next actions, the
          // Skincare-for-Two safety screen AND every unmet F1/C7 mandatory
          // readiness item plus the NPD roadmap items — "actions / safety"
          // named two of five.
          icon={<AlertOutlined />}
          label="Gates with unmet requirements"
          value={blockedGates.length}
          sub="Started gates with a blocker"
          tone={blockedGates.length ? 'bad' : undefined}
        />
        <StatTile
          icon={<GlobalOutlined />}
          label="Markets launch-approved"
          value={launchReady}
          of={allMarkets.length}
          sub="Per-market launch approval"
        />
        <StatTile
          icon={<EditOutlined />}
          label="Phases awaiting sign-off"
          value={phasesAwaitingSignOff.length}
          sub="Signatures still missing"
          tone={phasesAwaitingSignOff.length ? 'warn' : undefined}
          hint="Every closure condition met (gates passed, key checks done, angles covered, actions closed, pre-work accepted) and one or more of the three signatures still missing."
        />
        <StatTile
          icon={<RollbackOutlined />}
          label="Backtrack events (audit)"
          value={backtrackCount}
          sub="Recorded across all projects"
        />
      </div>

      <div
        className="c-card pl"
        style={{ '--pl-cols': 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.3fr) minmax(0, 0.9fr) minmax(0, 1.4fr)' } as React.CSSProperties}
      >
        <div className="pl-card-head">
          <span className="pl-card-title">Project portfolio — gate progress</span>
          <Link className="c-link" to="/projects" style={{ fontSize: 13 }}>
            All projects
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="db-empty">
            <InfoCircleOutlined />
            <span>
              No projects yet. <Link className="c-link" to="/projects">Create one on the Projects page</Link>.
            </span>
          </div>
        ) : (
          <>
            <div className="pl-head" aria-hidden>
              <span>Project</span>
              <span>Lead</span>
              <span>Current phase</span>
              <span>Progress (12 gates)</span>
              <span>Target launch</span>
              <span>Markets</span>
            </div>
            <ul className="pl-list">
              {projects.map((p) => {
                const idx = currentGateIndex(p);
                const meta = idx < GATES.length ? GATES[idx] : undefined;
                const phase = meta ? PHASES.find((ph) => ph.phase === meta.phase) : undefined;
                const done = p.gates.filter((g) => isGatePassed(p, g.gateId)).length;
                const pct = Math.round((done / 12) * 100);
                return (
                  <li key={p.identity.id} className="pl-row">
                    <div className="pl-cell">
                      <div className="pl-id-title">
                        <Link className="c-link pl-id-name" to={`/projects/${p.identity.id}`}>
                          {p.identity.productSku || p.identity.id}
                        </Link>
                        {/* An archived project is read-only everywhere; listing
                            it here unmarked made it look like live work. */}
                        {p.identity.archived && (
                          <span className="c-tag">
                            <InboxOutlined />
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="pl-id-sub">{p.identity.id}</div>
                    </div>
                    <div className="pl-cell" data-label="Lead">
                      {p.identity.projectLead || <span className="pl-muted">—</span>}
                    </div>
                    <div className="pl-cell" data-label="Current phase">
                      {phase ? (
                        <span className="c-tag">
                          {phase.title.split(' - ')[0]} · Gate {meta!.number}
                        </span>
                      ) : (
                        <span className="c-tag c-tag-ok c-tag-dot">All gates passed</span>
                      )}
                    </div>
                    <div className="pl-cell" data-label="Progress">
                      <div className="pl-progress">
                        <div
                          className="pl-bar"
                          role="progressbar"
                          aria-label={`${done} of 12 gates passed`}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className={done === 12 ? 'pl-bar-done' : undefined} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="pl-pct">{pct}%</span>
                      </div>
                    </div>
                    <div className="pl-cell" data-label="Target launch">
                      {p.identity.targetLaunchDate || <span className="pl-muted">—</span>}
                    </div>
                    <div className="pl-cell" data-label="Markets">
                      {p.identity.markets.length ? (
                        <div className="pl-tags">
                          {p.identity.markets.map((m) => (
                            <span key={m} className="c-tag">
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="pl-muted">None yet</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="db-pair">
        <div className="c-card">
          <div className="pl-card-head">
            <span className="pl-card-title">Gates marked In Progress</span>
            <span className="pl-count">{activeGates.length}</span>
          </div>
          {activeGates.length === 0 ? (
            <div className="db-empty">
              <InfoCircleOutlined />
              <span>
                No gate has its Stage status set to "In Progress". Each project's current gate is in the portfolio
                above.
              </span>
            </div>
          ) : (
            <ul className="db-list">
              {activeGates.map((r) => {
                const meta = GATES.find((g) => g.id === r.gate.gateId)!;
                return (
                  <li key={`${r.project.identity.id}-${r.gate.gateId}`}>
                    <div className="db-item-main">
                      <Link className="c-link db-item-title" to={`/projects/${r.project.identity.id}/phase/${meta.phase}`}>
                        Gate {meta.number} — {meta.name}
                      </Link>
                      <div className="db-item-sub">
                        {r.project.identity.id}
                        {r.gate.owner && ` · ${r.gate.owner}`}
                        {r.gate.dueDate && ` · Due ${r.gate.dueDate}`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="c-card">
          <div className="pl-card-head">
            <span className="pl-card-title">Open change controls</span>
            <Link className="c-link" to="/change-control" style={{ fontSize: 13 }}>
              View all
            </Link>
          </div>
          {openChanges.length === 0 ? (
            <div className="db-empty">
              <InfoCircleOutlined />
              <span>No open change control across any project.</span>
            </div>
          ) : (
            <ul className="db-list">
              {openChanges.map((c) => (
                <li key={c.changeId}>
                  <div className="db-item-main">
                    <div className="db-item-title">{c.changeId}</div>
                    <div className="db-item-sub">{c.trigger}</div>
                  </div>
                  <div className="db-item-tags">
                    {c.riskLevel && <span className={riskTagClass(c.riskLevel)}>{c.riskLevel}</span>}
                    {c.status && <span className="c-tag">{c.status}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
