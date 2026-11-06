import { useState } from 'react';
import { Select } from 'antd';
import type { ProjectData } from '@mbc360/shared/types';
import { LEAD_ASSIGNABLE_ROLE_KEYS, REVIEW_ROLES, reviewRoleFieldLabel } from '@mbc360/shared/config/reviewers';
import { useSession } from '../auth/useSession';
import { useAppStore } from '../store/useAppStore';
import { usePickerUsers } from '../hooks/useUserOptions';
import '../styles/concept.css';
import '../pages/ProjectOverview.css';

// Who is on this project (project owner, 2026-10-13). The app has no separate "member" list: the people on a project are the
// Lead, the one person assigned to each of the thirteen review areas when it was created, and whoever holds each FUNCTION
// (`ProjectIdentity.reviewers` holds all of them). The area roles are only READ here, so they can never disagree with the
// pickers on the Create form or the names shown beside each sheet group in the sidebar.
//
// The FUNCTION rows (Safety / Scientific Review, Technical Claims, Quality, …, added 2026-11-05) are editable by the project's
// Lead or an administrator, since a project may be created with nobody in a function and still needs to get one later. A
// function with nobody in it reads Unassigned, and whatever needs that authority waits; nobody is substituted for it. The picker
// offers every active user, not only people holding a matching company role; whether it should be limited is R6-Q3 [ASSUMPTION: R6-Q3].
export default function ProjectTeamCard({ project }: { project: ProjectData }) {
  const { user, isAdmin } = useSession();
  const me = user?.displayName?.trim();
  const { identity } = project;
  const users = usePickerUsers();
  const setFunctionAssignees = useAppStore((s) => s.setFunctionAssignees);
  const [saving, setSaving] = useState<string | null>(null);
  const canAssign = isAdmin || (!!me && identity.projectLead?.trim() === me);

  const rows = [
    ...(identity.projectLead?.trim() ? [{ key: 'lead', role: 'Project Lead', name: identity.projectLead.trim(), isFunction: false }] : []),
    ...REVIEW_ROLES.map((r) => ({
      key: r.key,
      role: reviewRoleFieldLabel(r),
      name: identity.reviewers?.[r.key]?.trim() ?? '',
      isFunction: LEAD_ASSIGNABLE_ROLE_KEYS.includes(r.key),
    })),
  ];
  const people = new Set(rows.map((r) => r.name).filter(Boolean));
  const userIdOf = (name: string) => users.find((u) => u.displayName === name)?.id;
  const userOptions = users.map((u) => ({ value: u.id, label: u.displayName, roleName: u.roleName ?? '—' }));

  const assign = async (roleKey: string, userId: string | null) => {
    setSaving(roleKey);
    try {
      await setFunctionAssignees(identity.id, [{ roleKey, userId }]);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="c-card po-card" aria-label="Project team">
      <div className="po-card-head">
        <div>
          <h2 className="po-card-title">Project team</h2>
          <p className="po-card-sub">
            {people.size} {people.size === 1 ? 'person' : 'people'} · the Lead, the person assigned to each review area when the project was created, and whoever holds each function
            {canAssign ? ' (you can assign the functions below)' : ''}
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
                  {r.isFunction && canAssign ? (
                    <Select
                      showSearch
                      allowClear
                      size="middle"
                      style={{ minWidth: 220 }}
                      placeholder="Unassigned"
                      optionFilterProp="label"
                      popupMatchSelectWidth={false}
                      loading={saving === r.key}
                      disabled={saving === r.key}
                      value={r.name ? userIdOf(r.name) ?? r.name : undefined}
                      options={userOptions}
                      onChange={(value) => void assign(r.key, (value as string | undefined) ?? null)}
                    />
                  ) : r.name ? (
                    <>
                      {r.name}
                      {me && r.name === me && <span className="c-tag c-tag-ok" style={{ marginLeft: 8 }}>You</span>}
                    </>
                  ) : (
                    <span className="po-muted">{r.isFunction ? 'Unassigned' : 'Not assigned'}</span>
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
