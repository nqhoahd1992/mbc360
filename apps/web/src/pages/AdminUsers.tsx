import { useEffect, useState } from 'react';
import { Alert, Button, Popconfirm, Select, Switch, Table, Tooltip, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { TABLE_STICKY } from '../theme/tokens';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  department: string | null;
  roles: { key: string; name: string }[];
  // An ACTIVATED authenticator enrolment (a pending one authorises nothing).
  totpEnrolled: boolean;
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

  // Hard delete — the backend only allows this for an account with no
  // historical footprint (never signed/edited/uploaded/audited anything); it
  // refuses with a clear message otherwise. Deactivating (the Active switch
  // above) is the right action for a user who has done real work.
  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      message.error(body?.message ?? 'Could not delete user');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Recovery for a lost or replaced device: the user cannot produce a code, so
  // they cannot remove their own enrolment. This removes it; they re-enrol
  // themselves in My Account, so no secret ever passes through an admin's
  // hands. Audited with the admin as actor.
  const resetTotp = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}/totp`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      message.error(body?.message ?? 'Could not reset the authenticator');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, totpEnrolled: false } : u)));
    message.success('Authenticator reset — the user can set up a new one in My Account');
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
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Users
        </Typography.Title>
        <Typography.Text type="secondary">
          Assign each signed-in user a role — this is the only place a role is granted; it is never
          inferred from Microsoft Entra ID or department data. A user with no role can contribute
          evidence but cannot decide, approve or sign anything (rule A4). Edit what each role can do
          under <Link to="/admin/roles">Roles</Link>.
        </Typography.Text>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        pagination={false}
        sticky={TABLE_STICKY}
        // The only table in the app that had no horizontal scroll: with the
        // Authenticator column added it now carries 6 columns plus actions, so
        // on a narrow window it pushed the PAGE sideways instead of scrolling
        // itself.
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Email', dataIndex: 'email', fixed: 'left' },
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
                checked={record.active}
                onChange={(checked) => void setActive(record.id, checked)}
              />
            ),
          },
          {
            title: 'Authenticator',
            key: 'totp',
            width: 130,
            render: (_, record) =>
              record.totpEnrolled ? (
                <Popconfirm
                  title="Reset this user's authenticator?"
                  description="Use this when they have lost the device. They must set up a new one before they can attach a signature again."
                  onConfirm={() => void resetTotp(record.id)}
                  okText="Reset"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" type="link" icon={<SafetyCertificateOutlined />}>
                    Reset
                  </Button>
                </Popconfirm>
              ) : (
                <Typography.Text type="secondary">Not set up</Typography.Text>
              ),
          },
          {
            title: '',
            key: 'delete',
            width: 44,
            fixed: 'right',
            render: (_, record) => (
              <Tooltip title="Only works for an account with no history — otherwise deactivate it instead">
                <Popconfirm
                  title="Delete this user?"
                  description="Only succeeds if the account has never signed, edited, uploaded, or acted in the audit trail."
                  onConfirm={() => void deleteUser(record.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger type="text" aria-label="Delete this user" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            ),
          },
        ]}
      />
    </div>
  );
}
