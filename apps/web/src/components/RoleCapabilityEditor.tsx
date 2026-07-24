import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Select, Space, Spin, Typography, message } from 'antd';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { ADMIN_ROLE, SSO_ROLES } from '../utils/roles';
import type { PermissionDef, PermissionGrid } from '../utils/permissions';
import { useAppStore } from '../store/useAppStore';

// Role x capability editor (F6), modeled loosely on the WordPress "User Role
// Editor" grid but scoped to this app's actual capabilities: per-gate decide,
// per-phase approve, and market-track approve. Reads/writes the DB permission
// grid via /api/rbac/*; on save it also reloads the store's grid so the
// header "View as" simulation reflects the change live.

interface CapGroup {
  key: string;
  title: string;
  caps: { id: string; label: string }[];
}

function buildGroups(defs: PermissionDef[]): CapGroup[] {
  const gate: CapGroup['caps'] = [];
  const phase: CapGroup['caps'] = [];
  const market: CapGroup['caps'] = [];
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
    }
  }
  const groups: CapGroup[] = [];
  if (gate.length) groups.push({ key: 'gate', title: 'Gate decisions', caps: gate });
  if (phase.length) groups.push({ key: 'phase', title: 'Phase approvals', caps: phase });
  if (market.length) groups.push({ key: 'market', title: 'Market tracking', caps: market });
  return groups;
}

const sortedKey = (ids: string[]) => [...ids].sort().join('\n');

export default function RoleCapabilityEditor() {
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
  const baseline = grid?.grants[selectedRole] ?? [];
  const dirty = !isAdminRole && sortedKey(draft) !== sortedKey(baseline);

  const toggle = (capId: string, checked: boolean) => {
    setDraft((prev) => (checked ? [...prev, capId] : prev.filter((id) => id !== capId)));
  };
  const toggleGroup = (group: CapGroup, checked: boolean) => {
    const ids = group.caps.map((c) => c.id);
    setDraft((prev) =>
      checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)),
    );
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
      message.success('Capabilities saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      size="small"
      title="Role Editor"
      extra={
        <Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Select role and change its capabilities
          </Typography.Text>
          <Select
            size="small"
            style={{ width: 260 }}
            value={selectedRole}
            onChange={setSelectedRole}
            popupMatchSelectWidth={false}
            options={SSO_ROLES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -4 }}>
        Capabilities are this project's own permissions: which gate decisions a role may record, which
        phase "Approved by" rows it may sign, and market-track approval. Saving updates the real
        permission grid and the header "View as" simulation immediately. The initial grants are the
        F6 keyword-match defaults — the confirmed role×gate/phase matrix will replace them here.
      </Typography.Paragraph>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : !grid || groups.length === 0 ? (
        <Empty description="No capabilities defined" />
      ) : (
        <>
          {isAdminRole && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="System Administrator is unrestricted"
              description="This role always has every capability and cannot be edited — that's what makes it the admin role."
            />
          )}
          <div style={{ display: 'grid', gap: 16 }}>
            {groups.map((group) => {
              const groupIds = group.caps.map((c) => c.id);
              const checkedCount = groupIds.filter((id) => draftSet.has(id)).length;
              return (
                <div key={group.key}>
                  <div style={{ marginBottom: 6 }}>
                    <Checkbox
                      indeterminate={checkedCount > 0 && checkedCount < groupIds.length}
                      checked={checkedCount === groupIds.length}
                      disabled={isAdminRole}
                      onChange={(e) => toggleGroup(group, e.target.checked)}
                    >
                      <b>
                        {group.title}{' '}
                        <Typography.Text type="secondary" style={{ fontWeight: 400, fontSize: 12 }}>
                          ({checkedCount}/{groupIds.length})
                        </Typography.Text>
                      </b>
                    </Checkbox>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gap: 4,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      paddingLeft: 24,
                    }}
                  >
                    {group.caps.map((cap) => (
                      <Checkbox
                        key={cap.id}
                        checked={draftSet.has(cap.id)}
                        disabled={isAdminRole}
                        onChange={(e) => toggle(cap.id, e.target.checked)}
                      >
                        {cap.label}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => void save()} loading={saving} disabled={!dirty}>
              Save Changes
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
