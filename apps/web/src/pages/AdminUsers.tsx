import { useEffect, useState } from 'react';
import { Alert, Select, Switch, Table, Tag, Typography, message } from 'antd';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  department: string | null;
  roles: { key: string; name: string }[];
}

interface AdminRole {
  key: string;
  name: string;
}

// The user's role is decided HERE, inside MBc360 — never inferred from Graph/
// AD attributes. SSO logins create a user with no role; dev-login demo users
// are seeded one-per-role for local testing. Admin-only: the backend returns
// 403 for non-admins, surfaced below as an inline notice rather than a crash.
export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/roles'),
      ]);
      if (usersRes.status === 403 || rolesRes.status === 403) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setRole = async (id: string, roleKey: string | null) => {
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleKey }),
    });
    if (!res.ok) {
      message.error('Could not update role');
      return;
    }
    const updated: AdminUser = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  };

  const setActive = async (id: string, active: boolean) => {
    const res = await fetch(`/api/admin/users/${id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      message.error(body?.message ?? 'Could not update user');
      return;
    }
    const updated: AdminUser = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  };

  if (forbidden) {
    return (
      <Alert
        type="warning"
        showIcon
        title="Admin access required"
        description="Sign in with an account that holds the admin role to manage users and roles."
      />
    );
  }

  return (
    <>
      <Typography.Title level={4}>Users & Roles</Typography.Title>
      <Typography.Paragraph type="secondary">
        Assign each signed-in user a role — this is the only place a role is granted; it is
        never inferred from Microsoft Entra ID or department data. A user with no role can
        contribute evidence but cannot decide, approve or sign anything (rule A4).
      </Typography.Paragraph>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        pagination={false}
        columns={[
          { title: 'Email', dataIndex: 'email' },
          { title: 'Name', dataIndex: 'displayName' },
          {
            title: 'Department',
            dataIndex: 'department',
            render: (d: string | null) => d ?? <Typography.Text type="secondary">—</Typography.Text>,
          },
          {
            title: 'Role',
            key: 'role',
            render: (_, record) => (
              <Select
                size="small"
                style={{ width: 220 }}
                value={record.roles[0]?.key ?? null}
                onChange={(key) => void setRole(record.id, key)}
                popupMatchSelectWidth={false}
                allowClear
                placeholder="No role (contributor only)"
                options={roles.map((r) => ({ value: r.key, label: r.name }))}
              />
            ),
          },
          {
            title: 'Active',
            key: 'active',
            render: (_, record) => (
              <Switch
                size="small"
                checked={record.active}
                onChange={(checked) => void setActive(record.id, checked)}
              />
            ),
          },
          {
            title: 'Source',
            key: 'source',
            render: (_, record) =>
              record.email.endsWith('@demo.mbc360.local') ? (
                <Tag>demo</Tag>
              ) : (
                <Tag color="blue">SSO</Tag>
              ),
          },
        ]}
      />
    </>
  );
}
