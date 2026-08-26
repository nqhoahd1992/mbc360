import { useEffect, useId, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Empty, Select, Space, Spin, Typography, message } from 'antd';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { ADMIN_ROLE, SSO_ROLES } from '../utils/roles';
import type { PermissionDef, PermissionGrid } from '../utils/permissions';
import { useAppStore } from '../store/useAppStore';
import { setSectionDirty } from '../hooks/unsavedRegistry';
import { TEXT } from '../theme/tokens';
import SaveBar from './SaveBar';

// Role x capability editor (F6), modeled loosely on the WordPress "User Role
// Editor" grid but scoped to this app's actual capabilities: per-gate decide,
// per-phase approve, market-track approve and project archive. Reads/writes the
// DB permission grid via /api/rbac/*; on save it also reloads the store's grid
// so the header "View as" simulation reflects the change live.
//
// Layout rework (2026-08-22) — what was wrong, since it is all still visible in
// the diff: (1) the page opened with ~7 lines of prose that said the same
// sentence twice ("which gate decisions ... which phase Approved by rows ...")
// before the first control; (2) the ROLE being edited — the subject of the
// whole screen — was a small dropdown in the card's top-right corner while the
// title read the generic "Role Editor"; (3) the columns were
// `minmax(320px, 1fr)`, and "Gate 11 — Production, Launch & Sales Support
// Sign-Off" does not fit 320px, so that one cell wrapped and knocked the whole
// row out of alignment; (4) each group's select-all was a tri-state checkbox
// sitting in front of its bold title, so a click meant to read as a heading
// toggled twelve gates at once; (5) the two single-capability groups carried
// that same apparatus plus a "(0/1)" counter for one checkbox; and (6) the only
// sign of unsaved work was a disabled button, with no way to discard and no
// warning when switching role threw the edits away.

interface CapGroup {
  key: string;
  title: string;
  hint?: string;
  caps: { id: string; label: string }[];
}

function buildGroups(defs: PermissionDef[]): CapGroup[] {
  const gate: CapGroup['caps'] = [];
  const phase: CapGroup['caps'] = [];
  const market: CapGroup['caps'] = [];
  const project: CapGroup['caps'] = [];
  // Round 4 questions 32(c) and 34(d) (2026-08-24) added capabilities that are
  // neither a gate, a phase, a market nor the project lifecycle — accepting a
  // flagged watch-list finding, and acknowledging an open change at Gate 11.
  const review: CapGroup['caps'] = [];
  // Catch-all. Every branch above matches a KNOWN resource, so anything new was
  // silently dropped from this screen and therefore ungrantable — the hazard
  // CLAUDE.md already records from when the Project lifecycle group was added.
  // Falling through to a visible "Other" group makes the next new capability
  // appear by itself, ugly-but-present rather than invisible.
  const other: CapGroup['caps'] = [];
  for (const d of defs) {
    if (d.resource.startsWith('gate:')) {
      const g = GATES.find((x) => x.id === d.resource.slice('gate:'.length));
      gate.push({ id: d.id, label: g ? `Gate ${g.number} — ${g.name}` : d.resource });
    } else if (d.resource.startsWith('phase:')) {
      const n = Number(d.resource.slice('phase:'.length));
      const p = PHASES.find((x) => x.phase === n);
      phase.push({ id: d.id, label: p ? p.title : d.resource });
    } else if (d.resource === 'market-track') {
      market.push({ id: d.id, label: 'Approve market PIF / regulatory / claims / launch statuses' });
    } else if (d.resource === 'project') {
      project.push({ id: d.id, label: d.description ?? d.id });
    } else if (d.resource === 'watchlist-finding' || d.resource === 'change-impact') {
      review.push({ id: d.id, label: d.description ?? d.id });
    } else {
      other.push({ id: d.id, label: d.description ?? d.id });
    }
  }
  const groups: CapGroup[] = [];
  if (gate.length) {
    groups.push({ key: 'gate', title: 'Gate decisions', hint: 'Record the decision that passes a gate', caps: gate });
  }
  if (phase.length) {
    groups.push({ key: 'phase', title: 'Phase approvals', hint: 'Sign the "Approved by" row that closes a phase', caps: phase });
  }
  if (market.length) groups.push({ key: 'market', title: 'Market tracking', caps: market });
  // Project-level authority (archive). Deleting a project is deliberately NOT
  // here: it is an isAdmin() check in the API, not a grantable capability, so it
  // cannot be handed to another role from this screen.
  if (project.length) groups.push({ key: 'project', title: 'Project lifecycle', caps: project });
  if (review.length) {
    groups.push({
      key: 'review',
      title: 'Safety / Regulatory acceptance',
      hint: 'Carry a flagged finding or an open change under Proceed with Conditions',
      caps: review,
    });
  }
  if (other.length) groups.push({ key: 'other', title: 'Other', caps: other });
  return groups;
}

const sortedKey = (ids: string[]) => [...ids].sort().join('\n');

// A module-level constant, not `?? []`: the fallback is a dependency of two
// memos below, and a fresh array every render makes them recompute every
// render — the same allocate-in-a-selector trap CLAUDE.md records for zustand
// selectors and useDraft's `committed`.
const NO_GRANTS: string[] = [];

export default function RoleCapabilityEditor() {
  // Context-aware instance (2026-08-26) — see the note on App.tsx's root
  // `<App>` for why the static `Modal.confirm` this used to call is wrong.
  const { modal } = App.useApp();
  const loadPermissionGrid = useAppStore((s) => s.loadPermissionGrid);
  const [grid, setGrid] = useState<PermissionGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>(SSO_ROLES[0].key);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchGrid = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rbac/permissions-grid');
      if (res.ok) setGrid((await res.json()) as PermissionGrid);
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
  const baseline = useMemo(
    () => grid?.grants[selectedRole] ?? NO_GRANTS,
    [grid, selectedRole],
  );
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
  const delta = useMemo(() => {
    const before = new Set(baseline);
    return {
      added: draft.filter((id) => !before.has(id)).length,
      removed: baseline.filter((id) => !draftSet.has(id)).length,
    };
  }, [baseline, draft, draftSet]);

  const toggle = (capId: string, checked: boolean) => {
    setDraft((prev) => (checked ? [...prev, capId] : prev.filter((id) => id !== capId)));
  };
  const setGroupAll = (group: CapGroup, checked: boolean) => {
    const ids = group.caps.map((c) => c.id);
    setDraft((prev) =>
      checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)),
    );
  };

  // Switching role rebuilds the draft from that role's grants, so unsaved edits
  // to the current one would vanish without a word.
  const changeRole = (next: string) => {
    if (!dirty) {
      setSelectedRole(next);
      return;
    }
    const current = SSO_ROLES.find((r) => r.key === selectedRole)?.label ?? selectedRole;
    modal.confirm({
      title: `Discard unsaved changes to ${current}?`,
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

  const roleLabel = SSO_ROLES.find((r) => r.key === selectedRole)?.label ?? selectedRole;
  // Showing each role's grant count in the picker answers "which roles can
  // actually do anything?" without clicking through all seventeen.
  const roleOptions = SSO_ROLES.map((r) => {
    const count = r.key === ADMIN_ROLE ? allCapIds.length : (grid?.grants[r.key]?.length ?? 0);
    return {
      value: r.key,
      label: (
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{r.label}</span>
          <span style={{ color: TEXT.secondary, fontSize: 12 }}>
            {r.key === ADMIN_ROLE ? 'all' : count === 0 ? 'none' : count}
          </span>
        </span>
      ),
    };
  });

  return (
    <Card
      size="small"
      // The role is the subject of this screen, so it names the card instead of
      // hiding in a corner control.
      title={<span>Capabilities — {roleLabel}</span>}
      extra={
        <Space size={8}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Role
          </Typography.Text>
          <Select
            style={{ width: 300 }}
            value={selectedRole}
            onChange={changeRole}
            popupMatchSelectWidth={false}
            labelRender={() => <span>{roleLabel}</span>}
            options={roleOptions}
          />
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : !grid || groups.length === 0 ? (
        <Empty description="No capabilities defined" />
      ) : (
        <>
          {isAdminRole ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              title="System Administrator is unrestricted"
              description="This role always has every capability and cannot be edited — that's what makes it the admin role."
            />
          ) : (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              Starting point is the F6 keyword-match default, not the confirmed role×gate/phase
              matrix — that will replace these grants when the review team answers.
            </Typography.Paragraph>
          )}

          <div style={{ display: 'grid', gap: 20 }}>
            {groups.map((group) => {
              const groupIds = group.caps.map((c) => c.id);
              const checkedCount = groupIds.filter((id) => draftSet.has(id)).length;
              const single = groupIds.length === 1;
              const headingId = `cap-group-${group.key}`;
              return (
                <section key={group.key} role="group" aria-labelledby={headingId}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 12,
                      borderBottom: '1px solid #f0f0f0',
                      paddingBottom: 6,
                      marginBottom: single ? 8 : 10,
                    }}
                  >
                    <Typography.Text id={headingId} strong>
                      {group.title}
                    </Typography.Text>
                    {group.hint && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {group.hint}
                      </Typography.Text>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* A count for a group of one is noise; so is a
                          select-all that governs a single checkbox. */}
                      {!single && (
                        <>
                          <Typography.Text style={{ fontSize: 12, color: TEXT.secondary }}>
                            {checkedCount} of {groupIds.length}
                          </Typography.Text>
                          {/* Explicit buttons rather than a tri-state checkbox
                              in front of the title: granting or revoking twelve
                              gates at once should read as an action, not as a
                              click on a heading. */}
                          <Button
                            size="small"
                            type="link"
                            style={{ padding: 0 }}
                            disabled={isAdminRole || checkedCount === groupIds.length}
                            onClick={() => setGroupAll(group, true)}
                          >
                            Select all
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            style={{ padding: 0 }}
                            disabled={isAdminRole || checkedCount === 0}
                            onClick={() => setGroupAll(group, false)}
                          >
                            Clear
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      // 400px fits the longest label ("Gate 11 — Production,
                      // Launch & Sales Support Sign-Off") on one line, so rows
                      // stay aligned instead of one cell wrapping and pushing
                      // its neighbours out of rhythm.
                      gridTemplateColumns: single ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
                      alignItems: 'start',
                      columnGap: 24,
                      rowGap: 6,
                    }}
                  >
                    {group.caps.map((cap) => (
                      <Checkbox
                        key={cap.id}
                        checked={draftSet.has(cap.id)}
                        disabled={isAdminRole}
                        onChange={(e) => toggle(cap.id, e.target.checked)}
                        // 32px keeps a two-line label's row the same height as
                        // its neighbours and gives the control a comfortable
                        // hit area.
                        style={{ minHeight: 32, alignItems: 'center', display: 'flex' }}
                      >
                        {cap.label}
                      </Checkbox>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Same save affordance as every editable table in the app, instead of
              a lone disabled button that never explained itself. */}
          <SaveBar
            dirty={dirty}
            loading={saving}
            onSave={() => void save()}
            onDiscard={() => setDraft(baseline)}
          />
          {dirty && (
            <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
              {delta.added > 0 && `+${delta.added} granted`}
              {delta.added > 0 && delta.removed > 0 && ' · '}
              {delta.removed > 0 && `−${delta.removed} revoked`}
            </Typography.Text>
          )}
        </>
      )}
    </Card>
  );
}
