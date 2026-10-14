import type { ProjectData } from '@mbc360/shared/types';
import { REVIEW_ROLES, reviewRoleFieldLabel } from '@mbc360/shared/config/reviewers';
import { useSession } from '../auth/useSession';
import '../styles/concept.css';
import '../pages/ProjectOverview.css';

// Who is on this project (project owner, 2026-10-13). The app has no separate "member" list: the people on a project are the
// Lead and the one person assigned to each of the thirteen review areas when it was created (`ProjectIdentity.reviewers`).
// This only READS that — nothing here is saved — so it can never disagree with the pickers on the Create form or the names
// shown beside each sheet group in the sidebar.
export default function ProjectTeamCard({ project }: { project: ProjectData }) {
  const me = useSession().user?.displayName?.trim();
  const { identity } = project;
  const rows = [
    ...(identity.projectLead?.trim() ? [{ key: 'lead', role: 'Project Lead', name: identity.projectLead.trim() }] : []),
    ...REVIEW_ROLES.map((r) => ({ key: r.key, role: reviewRoleFieldLabel(r), name: identity.reviewers?.[r.key]?.trim() ?? '' })),
  ];
  const people = new Set(rows.map((r) => r.name).filter(Boolean));
  return (
    <section className="c-card po-card" aria-label="Project team">
      <div className="po-card-head">
        <div>
          <h2 className="po-card-title">Project team</h2>
          <p className="po-card-sub">
            {people.size} {people.size === 1 ? 'person' : 'people'} · the Lead and the person assigned to each review area when the project was created
          </p>
        </div>
      </div>
      <div className="po-table-wrap">
        <table className="po-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Person</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="po-strong">{r.role}</td>
                <td data-label="Person">
                  {r.name ? (
                    <>
                      {r.name}
                      {me && r.name === me && <span className="c-tag c-tag-ok" style={{ marginLeft: 8 }}>You</span>}
                    </>
                  ) : (
                    <span className="po-muted">Not assigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
