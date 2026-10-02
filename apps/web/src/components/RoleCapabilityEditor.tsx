import { useEffect, useId, useMemo, useState } from 'react';
import { App, Button, Checkbox, Grid, Select, message } from 'antd';
import { ADMIN_ROLE, SSO_ROLES } from '../utils/roles';
import type { PermissionGrid } from '../utils/permissions';
import { buildCapabilityGroups as buildGroups, type CapGroup } from '../utils/capabilityGroups';
import { useAppStore } from '../store/useAppStore';
import { setSectionDirty } from '../hooks/unsavedRegistry';
import Notice from './Notice';
import '../styles/concept.css';
import './RoleCapabilityEditor.css';

// Role x capability editor (F6), modeled loosely on the WordPress "User Role
// Editor" grid but scoped to this app's actual capabilities. Reads/writes the
// DB permission grid via /api/rbac/*; on save it also reloads the store's grid
// so the header "View as" simulation reflects the change live.
//
// 2026-10-02 redesign (wireframe option A): the 17 roles are a list on the
// left — each with its grant count and how many people hold it — and the
// selected role's capabilities sit on the right in seven named groups. Before
// this, the grouping only knew gate / phase / market / project / review, so 12
// of the 32 capabilities added since Round 4 (sign-off representation, Claims
// Library, reference data, the NP signature…) fell into an "Other" bucket,
// labelled with their raw DB descriptions ("… (Round 4, q28.3)").

const sortedKey = (ids: string[]) => [...ids].sort().join('\n');
const peopleLabel = (n: number | undefined) =>
  n === undefined ? '' : n === 0 ? 'no one' : `${n} ${n === 1 ? 'person' : 'people'}`;

// A module-level constant, not `?? []`: the fallback is a dependency of two
// memos below, and a fresh array every render makes them recompute every
// render — the same allocate-in-a-selector trap CLAUDE.md records for zustand
// selectors and useDraft's `committed`.
const NO_GRANTS: string[] = [];

export default function RoleCapabilityEditor() {
  // Context-aware instance — see the note on App.tsx's root `<App>`.
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const loadPermissionGrid = useAppStore((s) => s.loadPermissionGrid);
  const [grid, setGrid] = useState<PermissionGrid | null>(null);
  const [holders, setHolders] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(SSO_ROLES[0].key);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchGrid = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [gridRes, usersRes] = await Promise.all([fetch('/api/rbac/permissions-grid'), fetch('/api/admin/users')]);
      if (!gridRes.ok) {
        setFailed(true);
        return;
      }
      setGrid((await gridRes.json()) as PermissionGrid);
      // How many ACTIVE people hold each role — editing a role changes what all
      // of them can do, which the screen used to leave unsaid. Optional: the
      // editor still works if this list cannot be read.
      if (usersRes.ok) {
        const users = (await usersRes.json()) as { active: boolean; roles: { key: string }[] }[];
        const counts: Record<string, number> = {};
        for (const u of users) if (u.active) for (const r of u.roles) counts[r.key] = (counts[r.key] ?? 0) + 1;
        setHolders(counts);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGrid();
  }, []);

  const isAdminRole = selectedRole === ADMIN_ROLE;
  const groups = useMemo(() => (grid ? buildGroups(grid.permissions) : []), [grid]);
  const allCapIds = useMemo(() => groups.flatMap((g) => g.caps.map((c) => c.id)), [groups]);

  // Reset the draft to the selected role's committed grants whenever the role
  // changes or the grid (re)loads. Admin is unrestricted → show everything
  // checked (and it's rendered disabled below).
  useEffect(() => {
    if (!grid) return;
    setDraft(isAdminRole ? allCapIds : (grid.grants[selectedRole] ?? []));
  }, [grid, selectedRole, isAdminRole, allCapIds]);

  const draftSet = useMemo(() => new Set(draft), [draft]);
  const baseline = useMemo(() => grid?.grants[selectedRole] ?? NO_GRANTS, [grid, selectedRole]);
  const baselineSet = useMemo(() => new Set(baseline), [baseline]);
  const dirty = !isAdminRole && sortedKey(draft) !== sortedKey(baseline);

  // Publish to the app-wide unsaved registry, so leaving the page (or closing
  // the tab) warns exactly like leaving a half-edited table does.
  const sectionId = useId();
  useEffect(() => {
    setSectionDirty(sectionId, dirty);
    return () => setSectionDirty(sectionId, false);
  }, [sectionId, dirty]);

  // How many capabilities this edit adds and removes — "Unsaved changes" alone
  // does not say whether you are about to grant or revoke authority.
  const delta = useMemo(
    () => ({
      added: draft.filter((id) => !baselineSet.has(id)).length,
      removed: baseline.filter((id) => !draftSet.has(id)).length,
    }),
    [baseline, baselineSet, draft, draftSet],
  );

  const toggle = (capId: string, checked: boolean) => {
    setDraft((prev) => (checked ? [...prev, capId] : prev.filter((id) => id !== capId)));
  };
  const setGroupAll = (group: CapGroup, checked: boolean) => {
    const ids = group.caps.map((c) => c.id);
    setDraft((prev) => (checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id))));
  };

  const roleLabelOf = (key: string) => SSO_ROLES.find((r) => r.key === key)?.label ?? key;
  const roleLabel = roleLabelOf(selectedRole);

  // Switching role rebuilds the draft from that role's grants, so unsaved edits
  // to the current one would vanish without a word.
  const changeRole = (next: string) => {
    if (next === selectedRole) return;
    if (!dirty) {
      setSelectedRole(next);
      return;
    }
    modal.confirm({
      title: `Discard unsaved changes to ${roleLabel}?`,
      content: 'Switching role reloads its saved capabilities. Your edits here have not been saved.',
      okText: 'Discard and switch',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => setSelectedRole(next),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rbac/roles/${selectedRole}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => undefined);
        message.error(body?.message ?? 'Could not save capabilities');
        return;
      }
      // Reflect locally, then refresh the app-wide grid so "View as" updates.
      setGrid((prev) => (prev ? { ...prev, grants: { ...prev.grants, [selectedRole]: draft } } : prev));
      await loadPermissionGrid();
      message.success('Capabilities saved — "View as" now uses them');
    } finally {
      setSaving(false);
    }
  };

  const countOf = (key: string) => (key === ADMIN_ROLE ? allCapIds.length : (grid?.grants[key]?.length ?? 0));
  const countLabel = (key: string) => (key === ADMIN_ROLE ? 'all' : countOf(key) === 0 ? 'none' : String(countOf(key)));
  const emptyRoles = SSO_ROLES.filter((r) => r.key !== ADMIN_ROLE && countOf(r.key) === 0).length;
  const affected = holders?.[selectedRole];

  if (failed) {
    return (
      <Notice tone="bad" title="Could not load the permission grid" action={<Button onClick={() => void fetchGrid()}>Try again</Button>}>
        The server did not respond.
      </Notice>
    );
  }

  const meta = grid && (
    <div className="rce-meta">
      {SSO_ROLES.length} roles · {allCapIds.length} capabilities · {emptyRoles} {emptyRoles === 1 ? 'role grants' : 'roles grant'} nothing
    </div>
  );

  // On a phone the 17-row list would push the capabilities a full screen
  // down, so it collapses into a picker carrying the same count and holders.
  const picker = screens.lg ? (
    <nav className="c-card rce-roles" aria-label="Roles">
      {SSO_ROLES.map((r) => (
        <button
          key={r.key}
          type="button"
          className="rce-role"
          aria-current={r.key === selectedRole}
          onClick={() => changeRole(r.key)}
        >
          <span className="rce-role-text">
            <span className="rce-role-name">{r.label}</span>
            {holders && <span className="rce-role-people">{peopleLabel(holders[r.key] ?? 0)}</span>}
          </span>
          <span className={`rce-role-count${countLabel(r.key) === 'none' ? ' rce-muted' : ''}`}>{countLabel(r.key)}</span>
        </button>
      ))}
    </nav>
  ) : (
    <label className="rce-picker">
      <span className="rce-picker-label">Role</span>
      <Select
        value={selectedRole}
        onChange={changeRole}
        style={{ width: '100%' }}
        labelRender={() => roleLabel}
        options={SSO_ROLES.map((r) => ({
          value: r.key,
          label: (
            <span className="rce-option">
              <span>{r.label}</span>
              <span className="rce-muted">{countLabel(r.key)}</span>
            </span>
          ),
        }))}
      />
    </label>
  );

  return (
    <>
      {meta}
      {loading || !grid ? (
        <div className="c-card rce-skel">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="c-skel" style={{ height: 32 }} />
          ))}
        </div>
      ) : (
        <div className="rce-layout">
          <div className="rce-side">{picker}</div>
          <section className="rce-panel" aria-label={`Capabilities of ${roleLabel}`}>
            <div className="rce-panel-head">
              <h2 className="rce-panel-title">{roleLabel}</h2>
              <span className="rce-muted">
                {isAdminRole ? 'all' : draft.length} of {allCapIds.length} capabilities
                {holders && ` · held by ${peopleLabel(affected ?? 0)}`}
              </span>
            </div>

            {isAdminRole ? (
              <Notice tone="info" title="System Administrator is unrestricted">
                It always holds every capability and cannot be edited — that is what makes it the admin role.
              </Notice>
            ) : (
              <Notice tone="warn" title="Starting grants, not the confirmed matrix">
                These came from the F6 keyword-match default. The review team's role × gate matrix will replace them when it
                is answered.
              </Notice>
            )}

            {groups.map((group) => {
              const groupIds = group.caps.map((c) => c.id);
              const checkedCount = groupIds.filter((id) => draftSet.has(id)).length;
              const single = groupIds.length === 1;
              const headingId = `cap-group-${group.key}`;
              return (
                <section key={group.key} className="c-card rce-group" role="group" aria-labelledby={headingId}>
                  <div className="rce-group-head">
                    <span id={headingId} className="rce-group-title">
                      {group.title}
                    </span>
                    {group.hint && <span className="rce-group-hint">{group.hint}</span>}
                    {/* A count and select-all for a group of one is noise. */}
                    {!single && (
                      <span className="rce-group-actions">
                        <span className="rce-muted">
                          {checkedCount} of {groupIds.length}
                        </span>
                        {/* Explicit buttons rather than a tri-state checkbox in
                            front of the title: granting or revoking twelve
                            gates at once should read as an action. */}
                        {!isAdminRole && (
                          <>
                            <Button type="link" className="rce-link" disabled={checkedCount === groupIds.length} onClick={() => setGroupAll(group, true)}>
                              Select all
                            </Button>
                            <Button type="link" className="rce-link" disabled={checkedCount === 0} onClick={() => setGroupAll(group, false)}>
                              Clear
                            </Button>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="rce-caps">
                    {group.caps.map((cap) => {
                      const on = draftSet.has(cap.id);
                      const changed = !isAdminRole && on !== baselineSet.has(cap.id);
                      return (
                        <Checkbox
                          key={cap.id}
                          className="rce-cap"
                          checked={on}
                          disabled={isAdminRole}
                          onChange={(e) => toggle(cap.id, e.target.checked)}
                        >
                          <span>{cap.label}</span>
                          {/* Marks the edit in place, so a reviewer can see
                              what is about to change before pressing Save. */}
                          {changed && <span className={`c-tag ${on ? 'c-tag-ok' : 'c-tag-bad'} rce-change`}>{on ? 'added' : 'removed'}</span>}
                        </Checkbox>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {dirty && (
              <div className="c-card rce-savebar" role="status">
                <span className="rce-savebar-text">
                  <b>Unsaved changes to {roleLabel}</b>
                  <span className="rce-muted">
                    {delta.added > 0 && ` · +${delta.added} granted`}
                    {delta.removed > 0 && ` · −${delta.removed} revoked`}
                    {affected !== undefined && affected > 0 && ` · affects ${peopleLabel(affected)}`}
                  </span>
                </span>
                <span className="rce-savebar-actions">
                  <Button onClick={() => setDraft(baseline)} disabled={saving}>
                    Discard
                  </Button>
                  <Button type="primary" loading={saving} onClick={() => void save()}>
                    Save
                  </Button>
                </span>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
