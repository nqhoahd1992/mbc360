import { Link } from 'react-router-dom';
import type { ProjectData, ProjectStopGround } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { criticalGapGates, projectStopGrounds, stopRefusal } from '@mbc360/shared/utils/projectStop';
import { useSession } from '../auth/useSession';
import Notice from './Notice';
import StopProjectAction from './StopProjectAction';

// SW-31 — stopping a project. Shown on the Project Overview only when it matters: a stopped project says so
// and why; a project with a Critical gap offers the Lead (or an administrator) the way to end it. The reasons
// listed are the ones the SYSTEM found — the person adds only a comment.

const gateLabel = (gateId: string) => {
  const g = GATES.find((x) => x.id === gateId);
  return g ? `Gate ${g.number}` : gateId;
};

function GroundList({ grounds, projectId }: { grounds: ProjectStopGround[]; projectId: string }) {
  return (
    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
      {grounds.map((g) => {
        const gate = GATES.find((x) => x.id === g.gateId);
        return (
          <li key={g.gateId}>
            {gate ? (
              <Link to={`/projects/${projectId}/phase/${gate.phase}?gate=${gate.id}`}>{gateLabel(g.gateId)}</Link>
            ) : (
              gateLabel(g.gateId)
            )}
            {' — Critical gap'}
            {g.impactCategory ? ` · ${g.impactCategory}` : ''}
            {g.rationale ? ` · ${g.rationale}` : ''}
            {g.assessor ? ` (assessed by ${g.assessor}${g.assessmentDate ? ` on ${g.assessmentDate}` : ''})` : ''}
            {g.requiredAction ? ` · Required action: ${g.requiredAction}` : ''}
          </li>
        );
      })}
    </ul>
  );
}

export default function StopProjectCard({ project }: { project: ProjectData }) {
  const session = useSession();
  const identity = project.identity;
  const stopped = identity.stopped;

  if (stopped) {
    return (
      <Notice tone="warn" title="This project was stopped — final and read-only">
        Stopped {stopped.at}
        {stopped.by ? ` by ${stopped.by}` : ''}
        {stopped.atGate ? ` while ${gateLabel(stopped.atGate)} was open` : ''}. Nothing in it can change again.
        <div style={{ marginTop: 6 }}>
          <b>Reason given:</b> {stopped.comment}
        </div>
        {stopped.grounds.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <b>What the system found at that moment:</b>
            <GroundList grounds={stopped.grounds} projectId={identity.id} />
          </div>
        )}
      </Notice>
    );
  }

  const grounds = projectStopGrounds(project);
  if (criticalGapGates(project).length === 0 || identity.archived) return null;

  const refusal = stopRefusal(project);
  const canStop =
    !!session.user && (session.isAdmin || identity.projectLead.trim() === session.user.displayName.trim());

  return (
    <>
      <Notice
        tone="warn"
        title="A Critical gap stands on this project — it may be stopped"
        action={<StopProjectAction project={project} />}
      >
        A Critical gap cannot be carried under Proceed with Conditions: it ends in Hold, Backtrack or Stop.
        <GroundList grounds={grounds} projectId={identity.id} />
        {refusal && <div style={{ marginTop: 6 }}>Stop is not available yet: {refusal}.</div>}
        {!canStop && (
          <div style={{ marginTop: 6 }}>
            Only the project Lead ({identity.projectLead || 'not set'}) or an administrator can stop it.
          </div>
        )}
      </Notice>
    </>
  );
}
