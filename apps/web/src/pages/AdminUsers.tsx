import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Grid, Input, Popconfirm, Select, Switch, message } from 'antd';
import { Link } from 'react-router-dom';
import { CloudOutlined, DeleteOutlined, RightOutlined, SafetyCertificateOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import Notice from '../components/Notice';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import '../styles/concept.css';
import './AdminUsers.css';

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

type Filter = 'active' | 'no-role' | 'inactive';

const NO_ROLE_PLACEHOLDER = 'No role (cannot sign in)';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// The user's role is decided HERE, inside MBc360 — never inferred from Graph/
// AD attributes. SSO logins create a user with no role. Admin-only: the
// backend returns 403 for non-admins, surfaced below as a notice.
//
// 2026-10-02 redesign (wireframe option A): search + Active / No role /
// Inactive chips, one compact row per person with the two everyday controls
// (Role, Active) inline, and the rare destructive actions (reset authenticator,
// delete) moved into a detail drawer's Danger zone instead of sitting beside
// every row. People without a role sort first — they are the ones an admin
// opens this page for.
export default function AdminUsers() {
  const screens = Grid.useBreakpoint();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [openId, setOpenId] = useState<string | null>(null);
  useExclusiveDrawer(openId !== null, () => setOpenId(null));

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [usersRes, rolesRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/roles')]);
      if (usersRes.status === 403 || rolesRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (!usersRes.ok || !rolesRes.ok) {
        setFailed(true);
        return;
      }
      setForbidden(false);
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const replaceUser = (updated: AdminUser) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

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
    replaceUser(await res.json());
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
    replaceUser(await res.json());
  };

  // Hard delete — the backend only allows this for an account with no
  // historical footprint (never signed/edited/uploaded/audited anything); it
  // refuses with a clear message otherwise. Deactivating (the Active switch)
  // is the right action for a user who has done real work.
  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      message.error(body?.message ?? 'Could not delete user');
      return;
    }
    setOpenId(null);
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

  const counts = useMemo(
    () => ({
      active: users.filter((u) => u.active).length,
      noRole: users.filter((u) => u.active && u.roles.length === 0).length,
      inactive: users.filter((u) => !u.active).length,
    }),
    [users],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) =>
        filter === 'active' ? u.active : filter === 'no-role' ? u.active && u.roles.length === 0 : !u.active,
      )
      .filter((u) => !q || `${u.displayName} ${u.email}`.toLowerCase().includes(q))
      .sort((a, b) => Number(a.roles.length > 0) - Number(b.roles.length > 0) || a.displayName.localeCompare(b.displayName));
  }, [users, query, filter]);

  const roleOptions = roles.map((r) => ({ value: r.key, label: r.name }));
  const roleSelect = (u: AdminUser) => (
    <Select
      className="au-role"
      value={u.roles[0]?.key ?? null}
      onChange={(key) => void setRole(u.id, key ?? null)}
      popupMatchSelectWidth={false}
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      status={u.active && u.roles.length === 0 ? 'warning' : undefined}
      placeholder={NO_ROLE_PLACEHOLDER}
      options={roleOptions}
    />
  );
  const activeSwitch = (u: AdminUser) => (
    <Switch checked={u.active} aria-label={`${u.displayName} active`} onChange={(checked) => void setActive(u.id, checked)} />
  );

  if (forbidden) {
    return (
      <div className="concept">
        <Notice tone="warn" title="Admin access required">
          Sign in with an account that holds the System Administrator role to manage users and roles.
        </Notice>
      </div>
    );
  }

  const open = users.find((u) => u.id === openId);
  const chips: [Filter, string, number][] = [
    ['active', 'Active', counts.active],
    ['no-role', 'No role', counts.noRole],
    ['inactive', 'Inactive', counts.inactive],
  ];

  return (
    <div className="concept au">
      <header className="au-header">
        <h1 className="au-title">Users</h1>
        {!loading && !failed && (
          <div className="au-meta">
            {counts.active} active
            {counts.noRole > 0 && (
              <>
                {' · '}
                <b className="au-meta-warn">{counts.noRole} without a role</b>
              </>
            )}
            {' · '}
            {counts.inactive} inactive
          </div>
        )}
        <p className="au-desc">
          A role is granted only here — never inferred from Microsoft Entra ID or department data. A user with no role
          cannot enter the app — signing in with Microsoft 365 only proves they belong to the company. Edit what each role can do under{' '}
          <Link to="/admin/roles">Roles</Link>.
        </p>
      </header>

      {failed ? (
        <div className="c-card au-empty">
          <CloudOutlined className="au-empty-icon" />
          <div className="au-empty-title">Could not load users</div>
          <p>The server did not respond.</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="au-toolbar">
            <Input
              className="au-search"
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {chips.map(([key, label, n]) => (
              <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <b>{n}</b>
              </button>
            ))}
          </div>

          <div className="c-card au-list">
            <div className="au-head" aria-hidden>
              <span className="au-col-user">User</span>
              <span className="au-col-dept">Department</span>
              <span className="au-col-role">Role</span>
              <span className="au-col-active">Active</span>
              <span className="au-col-chev" />
            </div>
            {loading ? (
              <div className="au-skel">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="c-skel" style={{ height: 40 }} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="au-empty">
                <UserOutlined className="au-empty-icon" />
                <div className="au-empty-title">{query ? `No user matches “${query}”` : 'No users here'}</div>
                <p>People appear here after they sign in with Microsoft 365 once.</p>
                {query && <Button onClick={() => setQuery('')}>Clear search</Button>}
              </div>
            ) : (
              visible.map((u) => {
                const noRole = u.active && u.roles.length === 0;
                return (
                  <div
                    key={u.id}
                    className={`au-row${noRole ? ' au-row-norole' : ''}`}
                    aria-selected={openId === u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId(u.id)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setOpenId(u.id);
                      }
                    }}
                  >
                    <div className="au-col-user au-who">
                      <span className={`au-avatar${u.active ? '' : ' au-avatar-off'}`}>{initials(u.displayName)}</span>
                      <div className="au-who-text">
                        <div className="au-name">
                          <span className="au-name-text">{u.displayName}</span>
                          {noRole && <span className="c-tag c-tag-warn">No role</span>}
                          {!u.active && <span className="c-tag">Inactive</span>}
                        </div>
                        <div className="au-email">{u.email}</div>
                      </div>
                    </div>
                    <div className="au-col-dept au-dept">{u.department ?? '—'}</div>
                    {/* The inline controls act on their own; a click on them
                        must not also open the drawer. */}
                    <div className="au-controls" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <div className="au-col-role">{roleSelect(u)}</div>
                      <div className="au-col-active">{activeSwitch(u)}</div>
                    </div>
                    <RightOutlined className="au-col-chev au-chev" />
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        size={screens.md ? 480 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title="User details"
      >
        {open && (
          <div className="au-detail">
            <section className="au-detail-who">
              <span className="au-avatar au-avatar-lg">{initials(open.displayName)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="au-detail-name">{open.displayName}</div>
                <div className="au-email">{open.email}</div>
              </div>
            </section>
            <dl className="au-dl">
              <dt>Department</dt>
              <dd>{open.department ?? '—'}</dd>
              <dt>Sign-in</dt>
              {/* Same test as My Account: the seeded …@demo.mbc360.local
                  accounts only ever come in through dev-login. */}
              <dd>{open.email.endsWith('@demo.mbc360.local') ? 'Seeded account (dev login)' : 'Microsoft 365'}</dd>
              <dt>Authenticator</dt>
              <dd>{open.totpEnrolled ? 'Set up' : 'Not set up'}</dd>
            </dl>

            <section className="au-detail-fields">
              <label className="au-field">
                <span className="au-field-label">Role</span>
                {roleSelect(open)}
                <span className="au-field-help">Saved as soon as you pick it.</span>
              </label>
              <div className="au-field-inline">
                <div>
                  <div className="au-field-label">Active</div>
                  <div className="au-field-help">An inactive user cannot sign in and drops out of every person picker.</div>
                </div>
                {activeSwitch(open)}
              </div>
            </section>

            <section className="au-danger">
              <div className="au-danger-title">Danger zone</div>
              <div className="au-danger-row">
                <div className="au-danger-text">
                  <div className="au-danger-name">Reset authenticator</div>
                  <div className="au-danger-desc">
                    {open.totpEnrolled
                      ? 'For a lost or replaced phone. They set up a new one in My Account before they can attach a signature again.'
                      : 'Nothing to reset — this user has not set up an authenticator.'}
                  </div>
                </div>
                <Popconfirm
                  title="Reset this user's authenticator?"
                  description="Use this when they have lost the device. They must set up a new one before they can attach a signature again."
                  onConfirm={() => void resetTotp(open.id)}
                  okText="Reset"
                  okButtonProps={{ danger: true }}
                  disabled={!open.totpEnrolled}
                >
                  <Button icon={<SafetyCertificateOutlined />} disabled={!open.totpEnrolled}>
                    Reset
                  </Button>
                </Popconfirm>
              </div>
              <div className="au-danger-row">
                <div className="au-danger-text">
                  <div className="au-danger-name">Delete user</div>
                  <div className="au-danger-desc">Only for an account with no history — otherwise turn Active off instead.</div>
                </div>
                <Popconfirm
                  title="Delete this user?"
                  description="Only succeeds if the account has never signed, edited, uploaded, or acted in the audit trail."
                  onConfirm={() => void deleteUser(open.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
